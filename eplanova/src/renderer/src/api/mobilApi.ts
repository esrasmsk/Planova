/**
 * Mobil (Android / iOS) veri katmani: PlanovaApi sozlesmesini cihazdaki SQLite ile uygular.
 * Masaustundeki src/main/handlers.ts (Firebird) ile ayni mantik; sorgular SQLite diline cevrildi.
 *
 * Tarihler metin olarak "YYYY-MM-DDTHH:mm:ss" (yerel saat) biciminde saklanir; Firebird tarafinin
 * arayuze dondurdugu bicimle ayni oldugu icin bilesenlerde degisiklik gerekmez.
 * Hatirlatmalar, gorev kaydedilirken telefonun kendi bildirim sistemine zamanlanir.
 */
import { Capacitor } from '@capacitor/core'
import { CapacitorSQLite, SQLiteConnection, type SQLiteDBConnection } from '@capacitor-community/sqlite'
import { LocalNotifications } from '@capacitor/local-notifications'
import type { AppConfig, PlanovaApi } from '../types'

const VERITABANI = 'planova'
const BILDIRIM_KANALI = 'hatirlatma'
/**
 * Alarm sesli kanal (android/app/src/main/res/raw/planova_alarm.wav). Android'de kanal sesi
 * sonradan degistirilemedigi icin ayri bir kanal; ayarlarda alarm sesi kapaliysa eski kanal kullanilir.
 */
const ALARM_KANALI = 'hatirlatma-alarm'
const ALARM_SESI = 'planova_alarm.wav'

// ------------------------------------------------------------------ sema

const SEMA = `
CREATE TABLE IF NOT EXISTS PL_GOREV (
  ID            INTEGER PRIMARY KEY AUTOINCREMENT,
  BASLIK        TEXT    NOT NULL,
  DETAY         TEXT,
  BASLANGIC     TEXT    NOT NULL,
  BITIS         TEXT,
  TUM_GUN       INTEGER NOT NULL DEFAULT 0,
  ONCELIK       INTEGER NOT NULL DEFAULT 1,
  DURUM         INTEGER NOT NULL DEFAULT 0,
  RENK          TEXT,
  TEKRAR_TIP    TEXT    NOT NULL DEFAULT 'YOK',
  TEKRAR_ARALIK INTEGER NOT NULL DEFAULT 1,
  TEKRAR_BITIS  TEXT,
  SERI_ID       INTEGER,
  TAMAMLANMA    TEXT,
  OLUSTURMA     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime')),
  GUNCELLEME    TEXT
);
CREATE TABLE IF NOT EXISTS PL_UYARI (
  ID          INTEGER PRIMARY KEY AUTOINCREMENT,
  GOREV_ID    INTEGER NOT NULL,
  DK_ONCE     INTEGER NOT NULL,
  GONDERILDI  INTEGER NOT NULL DEFAULT 0,
  GONDERIM    TEXT
);
CREATE TABLE IF NOT EXISTS PL_ETIKET (
  ID    INTEGER PRIMARY KEY AUTOINCREMENT,
  AD    TEXT NOT NULL UNIQUE,
  RENK  TEXT NOT NULL DEFAULT '#d9a441'
);
CREATE TABLE IF NOT EXISTS PL_GOREV_ETIKET (
  GOREV_ID   INTEGER NOT NULL,
  ETIKET_ID  INTEGER NOT NULL,
  PRIMARY KEY (GOREV_ID, ETIKET_ID)
);
CREATE TABLE IF NOT EXISTS PL_NOT (
  ID          INTEGER PRIMARY KEY AUTOINCREMENT,
  TARIH       TEXT NOT NULL UNIQUE,
  ICERIK      TEXT,
  RUH_HALI    TEXT,
  GUNCELLEME  TEXT
);
CREATE TABLE IF NOT EXISTS PL_STICKY (
  ID         INTEGER PRIMARY KEY AUTOINCREMENT,
  ICERIK     TEXT,
  RENK       TEXT    NOT NULL DEFAULT '#fdf08a',
  KONUM_X    INTEGER NOT NULL DEFAULT 40,
  KONUM_Y    INTEGER NOT NULL DEFAULT 40,
  EGIM       INTEGER NOT NULL DEFAULT 0,
  Z_SIRA     INTEGER NOT NULL DEFAULT 1,
  OLUSTURMA  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime'))
);
CREATE TABLE IF NOT EXISTS PL_SAYFA (
  ID          INTEGER PRIMARY KEY AUTOINCREMENT,
  BASLIK      TEXT    NOT NULL,
  ICERIK      TEXT,
  OZEL        INTEGER NOT NULL DEFAULT 0,
  SIRA        INTEGER NOT NULL DEFAULT 0,
  OLUSTURMA   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime')),
  GUNCELLEME  TEXT
);
CREATE TABLE IF NOT EXISTS PL_CIKARTMA (
  ID         INTEGER PRIMARY KEY AUTOINCREMENT,
  BAGLAM     TEXT    NOT NULL,
  TUR        TEXT    NOT NULL,
  KONUM_X    INTEGER NOT NULL DEFAULT 40,
  KONUM_Y    INTEGER NOT NULL DEFAULT 40,
  BOYUT      INTEGER NOT NULL DEFAULT 72,
  ACI        INTEGER NOT NULL DEFAULT 0,
  Z_SIRA     INTEGER NOT NULL DEFAULT 1,
  OLUSTURMA  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime'))
);
CREATE INDEX IF NOT EXISTS IX_PL_CIKARTMA_BAGLAM ON PL_CIKARTMA (BAGLAM);
CREATE TABLE IF NOT EXISTS PL_AYAR (
  ANAHTAR  TEXT PRIMARY KEY,
  DEGER    TEXT
);
CREATE INDEX IF NOT EXISTS IX_PL_GOREV_BAS ON PL_GOREV (BASLANGIC);
CREATE INDEX IF NOT EXISTS IX_PL_GOREV_DURUM ON PL_GOREV (DURUM);
CREATE INDEX IF NOT EXISTS IX_PL_UYARI_GOREV ON PL_UYARI (GOREV_ID);
CREATE INDEX IF NOT EXISTS IX_PL_GE_ETIKET ON PL_GOREV_ETIKET (ETIKET_ID);
`

const BASLANGIC_ETIKETLERI: [string, string][] = [
  ['İş', '#7d9a72'],
  ['Kişisel', '#c06c52'],
  ['Müşteri', '#4f7d9e'],
  ['Fatura', '#7e5a7b']
]

// ------------------------------------------------------------------ tarih yardimcilari

const iki = (n: number): string => String(n).padStart(2, '0')

/** Date -> "YYYY-MM-DDTHH:mm:ss" (yerel saat) */
function localIso(d: Date): string {
  return (
    `${d.getFullYear()}-${iki(d.getMonth() + 1)}-${iki(d.getDate())}` +
    `T${iki(d.getHours())}:${iki(d.getMinutes())}:${iki(d.getSeconds())}`
  )
}

/** "YYYY-MM-DD[THH:mm[:ss]]" -> Date (yerel saat) */
function parseLocal(s: string | null | undefined): Date | null {
  if (!s) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(s)
  if (!m) return null
  return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] ?? 0), +(m[5] ?? 0), +(m[6] ?? 0))
}

/** Tarih/zaman metnini sakladigimiz bicime getirir; bossa null. */
function zamanMetni(s: string | null | undefined): string | null {
  const d = parseLocal(s)
  return d ? localIso(d) : null
}

const gunBasi = (iso: string): string => `${iso.slice(0, 10)}T00:00:00`
const gunSonu = (iso: string): string => `${iso.slice(0, 10)}T23:59:59`
const simdi = (): string => localIso(new Date())

function sonrakiTarih(d: Date, tip: string, aralik: number): Date {
  const n = new Date(d.getTime())
  const a = Math.max(1, aralik || 1)
  if (tip === 'GUNLUK') n.setDate(n.getDate() + a)
  else if (tip === 'HAFTALIK') n.setDate(n.getDate() + 7 * a)
  else if (tip === 'AYLIK') n.setMonth(n.getMonth() + a)
  else if (tip === 'YILLIK') n.setFullYear(n.getFullYear() + a)
  return n
}

/** Turkce buyuk/kucuk harf duyarsiz "icinde geciyor mu" (SQLite lower() I/ı, S/s gibi harfleri bilmez). */
function icerir(metin: unknown, aranan: string): boolean {
  return String(metin ?? '').toLocaleLowerCase('tr-TR').includes(aranan.toLocaleLowerCase('tr-TR'))
}

function kalanMetni(dkOnce: number): string {
  if (dkOnce <= 0) return 'Zamanı geldi'
  if (dkOnce < 60) return `${dkOnce} dakika kaldı`
  if (dkOnce < 1440) {
    const s = Math.floor(dkOnce / 60)
    const d = dkOnce % 60
    return d ? `${s} saat ${d} dakika kaldı` : `${s} saat kaldı`
  }
  const g = Math.floor(dkOnce / 1440)
  const s = Math.floor((dkOnce % 1440) / 60)
  return s ? `${g} gün ${s} saat kaldı` : `${g} gün kaldı`
}

// ------------------------------------------------------------------ baglanti

let db: SQLiteDBConnection

async function sorgu<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const r = await db.query(sql, params)
  // iOS'ta ilk satir sutun adlari olarak gelebilir
  return (r.values ?? []).filter((s: any) => !('ios_columns' in s)) as T[]
}

async function tekSatir<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const r = await sorgu<T>(sql, params)
  return r.length ? r[0] : null
}

/** INSERT/UPDATE/DELETE; INSERT'te yeni kaydin ID'sini dondurur. */
async function calistir(sql: string, params: any[] = []): Promise<number> {
  const r = await db.run(sql, params)
  return Number(r.changes?.lastId ?? 0)
}

// ------------------------------------------------------------------ ayarlar

const VARSAYILAN_AYAR: AppConfig = {
  host: '',
  port: 0,
  database: 'cihaz (SQLite)',
  user: '',
  password: '',
  charset: 'UTF8',
  pin: null,
  kontrolSaniye: 30
}

async function ayarOku(): Promise<AppConfig> {
  const s = await tekSatir<{ DEGER: string }>("SELECT DEGER FROM PL_AYAR WHERE ANAHTAR = 'ayarlar'")
  return { ...VARSAYILAN_AYAR, ...(s ? JSON.parse(s.DEGER) : {}) }
}

async function ayarYaz(yeni: Partial<AppConfig>): Promise<AppConfig> {
  const ayar = { ...(await ayarOku()), ...yeni }
  await calistir("INSERT OR REPLACE INTO PL_AYAR (ANAHTAR, DEGER) VALUES ('ayarlar', ?)", [JSON.stringify(ayar)])
  return ayar
}

// ------------------------------------------------------------------ hatirlatmalar

/** Bitmemis ve gelecekteki tum gorevlerin bildirimlerini yeniden zamanlar (ayni kimlikle eskisinin yerine gecer). */
async function acikBildirimleriYenidenKur(): Promise<void> {
  try {
    const dun = new Date(Date.now() - 86400000)
    const gorevler = await sorgu(
      'SELECT DISTINCT g.ID FROM PL_GOREV g JOIN PL_UYARI u ON u.GOREV_ID = g.ID WHERE g.DURUM = 0 AND g.BASLANGIC >= ?',
      [localIso(dun)]
    )
    for (const g of gorevler) {
      const uyarilar = await sorgu('SELECT ID FROM PL_UYARI WHERE GOREV_ID = ?', [g.ID])
      await bildirimleriIptalEt(uyarilar.map((u) => Number(u.ID)))
      await bildirimleriKur(Number(g.ID))
    }
  } catch (e) {
    console.warn('[bildirim yenileme]', e)
  }
}

async function bildirimleriIptalEt(uyariIdler: number[]): Promise<void> {
  if (!uyariIdler.length) return
  try {
    await LocalNotifications.cancel({ notifications: uyariIdler.map((id) => ({ id })) })
  } catch {
    /* izin yoksa ya da zaten yoksa onemli degil */
  }
}

/** Gorevin acik ve gelecekteki uyarilarini telefonun bildirim sistemine zamanlar. */
async function bildirimleriKur(gorevId: number): Promise<void> {
  const g = await tekSatir('SELECT ID, BASLIK, DETAY, BASLANGIC, DURUM FROM PL_GOREV WHERE ID = ?', [gorevId])
  if (!g || g.DURUM !== 0) return
  const bas = parseLocal(g.BASLANGIC)
  if (!bas) return
  const uyarilar = await sorgu('SELECT ID, DK_ONCE FROM PL_UYARI WHERE GOREV_ID = ?', [gorevId])
  const alarmli = (await ayarOku()).alarmSesi !== false
  const saat = `${iki(bas.getHours())}:${iki(bas.getMinutes())}`
  const gun = `${iki(bas.getDate())}.${iki(bas.getMonth() + 1)}`
  const bildirimler = uyarilar
    .map((u) => ({ u, zaman: new Date(bas.getTime() - Number(u.DK_ONCE) * 60000) }))
    .filter(({ zaman }) => zaman.getTime() > Date.now())
    .map(({ u, zaman }) => ({
      id: Number(u.ID),
      title: String(g.BASLIK),
      body: `${kalanMetni(Number(u.DK_ONCE))} — ${gun} ${saat}${g.DETAY ? `\n${String(g.DETAY).slice(0, 120)}` : ''}`,
      schedule: { at: zaman, allowWhileIdle: true },
      channelId: alarmli ? ALARM_KANALI : BILDIRIM_KANALI,
      sound: alarmli ? ALARM_SESI : undefined,
      extra: { gorevId, kalan: kalanMetni(Number(u.DK_ONCE)), detay: g.DETAY, zaman: g.BASLANGIC }
    }))
  if (!bildirimler.length) return
  try {
    await LocalNotifications.schedule({ notifications: bildirimler })
  } catch (e) {
    console.warn('[bildirim]', e)
  }
}

async function gorevBildirimleriniIptalEt(gorevId: number): Promise<void> {
  const eski = await sorgu<{ ID: number }>('SELECT ID FROM PL_UYARI WHERE GOREV_ID = ?', [gorevId])
  await bildirimleriIptalEt(eski.map((u) => Number(u.ID)))
}

// ------------------------------------------------------------------ gorev yardimcilari

async function gorevZenginlestir(rows: any[]): Promise<any[]> {
  if (!rows.length) return rows
  const idler = rows.map((r) => Number(r.ID)).join(',')
  const etiketler = await sorgu(
    `SELECT ge.GOREV_ID, e.ID, e.AD, e.RENK
       FROM PL_GOREV_ETIKET ge
       JOIN PL_ETIKET e ON e.ID = ge.ETIKET_ID
      WHERE ge.GOREV_ID IN (${idler})`
  )
  const uyarilar = await sorgu(
    `SELECT ID, GOREV_ID, DK_ONCE, GONDERILDI FROM PL_UYARI WHERE GOREV_ID IN (${idler}) ORDER BY DK_ONCE DESC`
  )
  return rows.map((r) => ({
    ...r,
    etiketler: etiketler.filter((x) => x.GOREV_ID === r.ID),
    uyarilar: uyarilar.filter((x) => x.GOREV_ID === r.ID)
  }))
}

async function etiketleriYaz(gorevId: number, etiketIdler: number[]): Promise<void> {
  await calistir('DELETE FROM PL_GOREV_ETIKET WHERE GOREV_ID = ?', [gorevId])
  for (const eid of etiketIdler ?? []) {
    await calistir('INSERT INTO PL_GOREV_ETIKET (GOREV_ID, ETIKET_ID) VALUES (?, ?)', [gorevId, eid])
  }
}

async function uyarilariYaz(gorevId: number, dakikalar: number[]): Promise<void> {
  await gorevBildirimleriniIptalEt(gorevId)
  await calistir('DELETE FROM PL_UYARI WHERE GOREV_ID = ?', [gorevId])
  const tekil = Array.from(new Set((dakikalar ?? []).map((n) => Math.max(0, Math.floor(n)))))
  for (const dk of tekil) {
    await calistir('INSERT INTO PL_UYARI (GOREV_ID, DK_ONCE) VALUES (?, ?)', [gorevId, dk])
  }
}

// ------------------------------------------------------------------ olustur

/** Veritabanini acar, semayi kurar, bildirim iznini ister ve PlanovaApi dondurur. */
export async function mobilApiOlustur(): Promise<PlanovaApi> {
  if (!Capacitor.isNativePlatform()) {
    throw new Error('Mobil veri katmani yalnizca Android/iOS uygulamasinda calisir.')
  }

  const sqlite = new SQLiteConnection(CapacitorSQLite)
  await sqlite.checkConnectionsConsistency()
  const var_ = (await sqlite.isConnection(VERITABANI, false)).result
  db = var_
    ? await sqlite.retrieveConnection(VERITABANI, false)
    : await sqlite.createConnection(VERITABANI, false, 'no-encryption', 1, false)
  await db.open()
  await db.execute(SEMA)

  const adet = await tekSatir<{ N: number }>('SELECT COUNT(*) AS N FROM PL_ETIKET')
  if (!adet || Number(adet.N) === 0) {
    for (const [ad, renk] of BASLANGIC_ETIKETLERI) {
      await calistir('INSERT INTO PL_ETIKET (AD, RENK) VALUES (?, ?)', [ad, renk])
    }
  }

  try {
    await LocalNotifications.requestPermissions()
    if (Capacitor.getPlatform() === 'android') {
      await LocalNotifications.createChannel({
        id: BILDIRIM_KANALI,
        name: 'Hatırlatmalar',
        description: 'Görev hatırlatmaları',
        importance: 5,
        visibility: 1,
        vibration: true
      })
      await LocalNotifications.createChannel({
        id: ALARM_KANALI,
        name: 'Hatırlatma alarmı',
        description: 'Görev hatırlatmaları (alarm sesiyle)',
        importance: 5,
        visibility: 1,
        vibration: true,
        sound: ALARM_SESI
      })
    }
  } catch (e) {
    console.warn('[bildirim izni]', e)
  }
  // Onceden kurulmus hatirlatmalar da guncel kanala (alarm sesine) gecsin
  void acikBildirimleriYenidenKur()

  return {
    platform: 'mobil',

    // -------------------------------------------------------------- ayarlar
    config: {
      get: ayarOku,
      save: async (yeni: Partial<AppConfig>) => {
        const onceki = await ayarOku()
        const ayar = await ayarYaz(yeni)
        if ((onceki.alarmSesi !== false) !== (ayar.alarmSesi !== false)) void acikBildirimleriYenidenKur()
        return ayar
      },
      test: async () => ({ ok: true, mesaj: 'Veriler bu cihazda tutuluyor.' }),
      reconnect: async () => ({ ok: true, mesaj: 'Veriler bu cihazda tutuluyor.' })
    },

    // -------------------------------------------------------------- gorevler
    task: {
      list: async (filtre: any = {}) => {
        const kosul: string[] = []
        const par: any[] = []
        if (filtre.baslangic) {
          kosul.push('g.BASLANGIC >= ?')
          par.push(gunBasi(filtre.baslangic))
        }
        if (filtre.bitis) {
          kosul.push('g.BASLANGIC <= ?')
          par.push(gunSonu(filtre.bitis))
        }
        if (filtre.durum !== undefined && filtre.durum !== null && filtre.durum !== '') {
          kosul.push('g.DURUM = ?')
          par.push(Number(filtre.durum))
        }
        if (filtre.etiketId) {
          kosul.push('EXISTS (SELECT 1 FROM PL_GOREV_ETIKET x WHERE x.GOREV_ID = g.ID AND x.ETIKET_ID = ?)')
          par.push(Number(filtre.etiketId))
        }
        let satirlar = await sorgu(
          `SELECT g.* FROM PL_GOREV g${kosul.length ? ` WHERE ${kosul.join(' AND ')}` : ''}
           ORDER BY g.BASLANGIC, g.ONCELIK DESC`,
          par
        )
        if (filtre.arama) satirlar = satirlar.filter((g) => icerir(g.BASLIK, filtre.arama) || icerir(g.DETAY, filtre.arama))
        return gorevZenginlestir(satirlar)
      },

      get: async (id: number) => {
        const z = await gorevZenginlestir(await sorgu('SELECT * FROM PL_GOREV WHERE ID = ?', [id]))
        return z[0] ?? null
      },

      save: async (g: any) => {
        const par = [
          g.BASLIK,
          g.DETAY ?? null,
          zamanMetni(g.BASLANGIC),
          zamanMetni(g.BITIS),
          g.TUM_GUN ? 1 : 0,
          Number(g.ONCELIK ?? 1),
          g.RENK ?? null,
          g.TEKRAR_TIP ?? 'YOK',
          Number(g.TEKRAR_ARALIK ?? 1),
          zamanMetni(g.TEKRAR_BITIS)
        ]
        let id = Number(g.ID ?? 0)
        if (id > 0) {
          await calistir(
            `UPDATE PL_GOREV SET BASLIK = ?, DETAY = ?, BASLANGIC = ?, BITIS = ?, TUM_GUN = ?, ONCELIK = ?,
                    RENK = ?, TEKRAR_TIP = ?, TEKRAR_ARALIK = ?, TEKRAR_BITIS = ?, GUNCELLEME = ?
              WHERE ID = ?`,
            [...par, simdi(), id]
          )
        } else {
          id = await calistir(
            `INSERT INTO PL_GOREV (BASLIK, DETAY, BASLANGIC, BITIS, TUM_GUN, ONCELIK, RENK,
                                   TEKRAR_TIP, TEKRAR_ARALIK, TEKRAR_BITIS)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            par
          )
        }
        await etiketleriYaz(id, g.etiketIdler ?? [])
        await uyarilariYaz(id, g.uyariDakikalari ?? [])
        await bildirimleriKur(id)
        return id
      },

      remove: async (id: number) => {
        await gorevBildirimleriniIptalEt(id)
        await calistir('DELETE FROM PL_GOREV_ETIKET WHERE GOREV_ID = ?', [id])
        await calistir('DELETE FROM PL_UYARI WHERE GOREV_ID = ?', [id])
        await calistir('DELETE FROM PL_GOREV WHERE ID = ?', [id])
        return true
      },

      /** Yarina tasi: saat korunur, bitis ayni miktarda kayar, bildirimler yeniden zamanlanir. */
      ertele: async (id: number) => {
        const g = await tekSatir('SELECT BASLANGIC, BITIS FROM PL_GOREV WHERE ID = ?', [id])
        if (!g) return null
        const bas = parseLocal(g.BASLANGIC)!
        const yarin = new Date()
        yarin.setDate(yarin.getDate() + 1)
        const yeniBas = new Date(yarin.getFullYear(), yarin.getMonth(), yarin.getDate(), bas.getHours(), bas.getMinutes(), bas.getSeconds())
        const fark = yeniBas.getTime() - bas.getTime()
        const yeniBit = g.BITIS ? localIso(new Date(parseLocal(g.BITIS)!.getTime() + fark)) : null

        await gorevBildirimleriniIptalEt(id)
        await calistir('UPDATE PL_GOREV SET BASLANGIC = ?, BITIS = ?, GUNCELLEME = ? WHERE ID = ?', [
          localIso(yeniBas), yeniBit, simdi(), id
        ])
        await calistir('UPDATE PL_UYARI SET GONDERILDI = 0, GONDERIM = NULL WHERE GOREV_ID = ?', [id])
        await bildirimleriKur(id) // yalnizca zamani gelecekte olanlari zamanlar
        return localIso(yeniBas)
      },

      /** Tamamla: tekrarli gorevse bir sonraki nushayi uretir. */
      complete: async (id: number, tamam: boolean) => {
        if (!tamam) {
          await calistir('UPDATE PL_GOREV SET DURUM = 0, TAMAMLANMA = NULL WHERE ID = ?', [id])
          await bildirimleriKur(id)
          return null
        }
        await calistir('UPDATE PL_GOREV SET DURUM = 1, TAMAMLANMA = ? WHERE ID = ?', [simdi(), id])
        await gorevBildirimleriniIptalEt(id)

        const g: any = await tekSatir('SELECT * FROM PL_GOREV WHERE ID = ?', [id])
        if (!g || !g.TEKRAR_TIP || g.TEKRAR_TIP === 'YOK') return null

        const bas = parseLocal(g.BASLANGIC)!
        const yeniBas = sonrakiTarih(bas, g.TEKRAR_TIP, g.TEKRAR_ARALIK)
        const son = parseLocal(g.TEKRAR_BITIS)
        if (son && yeniBas > son) return null

        let yeniBit: string | null = null
        if (g.BITIS) yeniBit = localIso(new Date(yeniBas.getTime() + (parseLocal(g.BITIS)!.getTime() - bas.getTime())))

        const yeniId = await calistir(
          `INSERT INTO PL_GOREV (BASLIK, DETAY, BASLANGIC, BITIS, TUM_GUN, ONCELIK, RENK,
                                 TEKRAR_TIP, TEKRAR_ARALIK, TEKRAR_BITIS, SERI_ID)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            g.BASLIK, g.DETAY, localIso(yeniBas), yeniBit, g.TUM_GUN, g.ONCELIK, g.RENK,
            g.TEKRAR_TIP, g.TEKRAR_ARALIK, g.TEKRAR_BITIS, g.SERI_ID ?? g.ID
          ]
        )
        const et = await sorgu('SELECT ETIKET_ID FROM PL_GOREV_ETIKET WHERE GOREV_ID = ?', [id])
        await etiketleriYaz(yeniId, et.map((x) => x.ETIKET_ID))
        const uy = await sorgu('SELECT DK_ONCE FROM PL_UYARI WHERE GOREV_ID = ?', [id])
        await uyarilariYaz(yeniId, uy.map((x) => x.DK_ONCE))
        await bildirimleriKur(yeniId)
        return { ID: yeniId, BASLANGIC: localIso(yeniBas) }
      }
    },

    // -------------------------------------------------------------- etiketler
    tag: {
      list: () => sorgu('SELECT * FROM PL_ETIKET ORDER BY AD'),
      save: async (t: any) => {
        if (t.ID) {
          await calistir('UPDATE PL_ETIKET SET AD = ?, RENK = ? WHERE ID = ?', [t.AD, t.RENK, t.ID])
          return t.ID
        }
        return calistir('INSERT INTO PL_ETIKET (AD, RENK) VALUES (?, ?)', [t.AD, t.RENK])
      },
      remove: async (id: number) => {
        await calistir('DELETE FROM PL_GOREV_ETIKET WHERE ETIKET_ID = ?', [id])
        await calistir('DELETE FROM PL_ETIKET WHERE ID = ?', [id])
        return true
      }
    },

    // -------------------------------------------------------------- gunluk
    journal: {
      get: (tarih: string) => tekSatir('SELECT * FROM PL_NOT WHERE TARIH = ?', [tarih.slice(0, 10)]),
      save: async (tarih: string, icerik: string, ruhHali: string | null) => {
        const t = tarih.slice(0, 10)
        const mevcut = await tekSatir<{ ID: number }>('SELECT ID FROM PL_NOT WHERE TARIH = ?', [t])
        if (mevcut) {
          await calistir('UPDATE PL_NOT SET ICERIK = ?, RUH_HALI = ?, GUNCELLEME = ? WHERE ID = ?', [
            icerik, ruhHali, simdi(), mevcut.ID
          ])
          return mevcut.ID
        }
        return calistir('INSERT INTO PL_NOT (TARIH, ICERIK, RUH_HALI, GUNCELLEME) VALUES (?, ?, ?, ?)', [
          t, icerik, ruhHali, simdi()
        ])
      },
      remove: async (tarih: string) => {
        await calistir('DELETE FROM PL_NOT WHERE TARIH = ?', [tarih.slice(0, 10)])
        return true
      },
      dates: (bas: string, bit: string) =>
        sorgu('SELECT TARIH FROM PL_NOT WHERE TARIH BETWEEN ? AND ?', [bas.slice(0, 10), bit.slice(0, 10)])
    },

    // -------------------------------------------------------------- yapiskan notlar
    sticky: {
      list: () => sorgu('SELECT * FROM PL_STICKY ORDER BY Z_SIRA, ID'),
      save: async (s: any) => {
        const par = [
          s.ICERIK ?? '', s.RENK, Math.round(s.KONUM_X), Math.round(s.KONUM_Y), Math.round(s.EGIM ?? 0), s.Z_SIRA ?? 1
        ]
        if (s.ID) {
          await calistir(
            'UPDATE PL_STICKY SET ICERIK = ?, RENK = ?, KONUM_X = ?, KONUM_Y = ?, EGIM = ?, Z_SIRA = ? WHERE ID = ?',
            [...par, s.ID]
          )
          return s.ID
        }
        return calistir(
          'INSERT INTO PL_STICKY (ICERIK, RENK, KONUM_X, KONUM_Y, EGIM, Z_SIRA) VALUES (?, ?, ?, ?, ?, ?)',
          par
        )
      },
      remove: async (id: number) => {
        await calistir('DELETE FROM PL_STICKY WHERE ID = ?', [id])
        return true
      }
    },

    // -------------------------------------------------------------- cikartmalar
    cikartma: {
      list: (baglam: string) => sorgu('SELECT * FROM PL_CIKARTMA WHERE BAGLAM = ? ORDER BY Z_SIRA, ID', [baglam]),
      save: async (c: any) => {
        const par = [
          Math.round(c.KONUM_X ?? 40), Math.round(c.KONUM_Y ?? 40), Math.round(c.BOYUT ?? 72),
          Math.round(c.ACI ?? 0), Math.round(c.Z_SIRA ?? 1)
        ]
        if (c.ID) {
          await calistir(
            'UPDATE PL_CIKARTMA SET KONUM_X = ?, KONUM_Y = ?, BOYUT = ?, ACI = ?, Z_SIRA = ? WHERE ID = ?',
            [...par, c.ID]
          )
          return c.ID
        }
        return calistir(
          'INSERT INTO PL_CIKARTMA (BAGLAM, TUR, KONUM_X, KONUM_Y, BOYUT, ACI, Z_SIRA) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [c.BAGLAM, c.TUR, ...par]
        )
      },
      remove: async (id: number) => {
        await calistir('DELETE FROM PL_CIKARTMA WHERE ID = ?', [id])
        return true
      }
    },

    // -------------------------------------------------------------- kisisel sayfalar
    page: {
      list: () => sorgu('SELECT ID, BASLIK, OZEL, SIRA, GUNCELLEME FROM PL_SAYFA ORDER BY SIRA, ID'),
      get: (id: number) => tekSatir('SELECT * FROM PL_SAYFA WHERE ID = ?', [id]),
      save: async (p: any) => {
        if (p.ID) {
          await calistir('UPDATE PL_SAYFA SET BASLIK = ?, ICERIK = ?, OZEL = ?, GUNCELLEME = ? WHERE ID = ?', [
            p.BASLIK, p.ICERIK ?? '', p.OZEL ? 1 : 0, simdi(), p.ID
          ])
          return p.ID
        }
        return calistir('INSERT INTO PL_SAYFA (BASLIK, ICERIK, OZEL, GUNCELLEME) VALUES (?, ?, ?, ?)', [
          p.BASLIK, p.ICERIK ?? '', p.OZEL ? 1 : 0, simdi()
        ])
      },
      remove: async (id: number) => {
        await calistir('DELETE FROM PL_SAYFA WHERE ID = ?', [id])
        return true
      }
    },

    // -------------------------------------------------------------- arama
    search: async (metin: string) => {
      if (!metin || metin.trim().length < 2) return { gorevler: [], notlar: [], sayfalar: [], stickyler: [] }
      const q = metin.trim()
      const [gorevler, notlar, sayfalar, stickyler] = await Promise.all([
        sorgu('SELECT ID, BASLIK, DETAY, BASLANGIC, DURUM FROM PL_GOREV ORDER BY BASLANGIC DESC'),
        sorgu('SELECT ID, TARIH, ICERIK FROM PL_NOT ORDER BY TARIH DESC'),
        sorgu('SELECT ID, BASLIK, ICERIK, OZEL FROM PL_SAYFA'),
        sorgu('SELECT ID, ICERIK, RENK FROM PL_STICKY')
      ])
      return {
        gorevler: gorevler.filter((g) => icerir(g.BASLIK, q) || icerir(g.DETAY, q)),
        notlar: notlar.filter((n) => icerir(n.ICERIK, q)),
        sayfalar: sayfalar.filter((s) => icerir(s.BASLIK, q) || icerir(s.ICERIK, q)),
        stickyler: stickyler.filter((s) => icerir(s.ICERIK, q))
      }
    },

    // -------------------------------------------------------------- ozet
    stats: async () => {
      const b = new Date()
      const bas = gunBasi(localIso(b))
      const son = gunSonu(localIso(b))
      const [acik, bugun, geciken] = await Promise.all([
        tekSatir('SELECT COUNT(*) AS N FROM PL_GOREV WHERE DURUM = 0'),
        tekSatir('SELECT COUNT(*) AS N FROM PL_GOREV WHERE DURUM = 0 AND BASLANGIC BETWEEN ? AND ?', [bas, son]),
        tekSatir('SELECT COUNT(*) AS N FROM PL_GOREV WHERE DURUM = 0 AND BASLANGIC < ?', [bas])
      ])
      return { acik: Number(acik?.N ?? 0), bugun: Number(bugun?.N ?? 0), geciken: Number(geciken?.N ?? 0) }
    },

    // -------------------------------------------------------------- bildirim olaylari
    /** Uygulama acikken gelen hatirlatma: sag altta yapiskan kart. */
    onReminder: (cb) => {
      const dinleyici = LocalNotifications.addListener('localNotificationReceived', (n) => {
        cb({ gorevId: n.extra?.gorevId, baslik: n.title, detay: n.extra?.detay ?? null, zaman: n.extra?.zaman, kalan: n.extra?.kalan })
      })
      return () => void dinleyici.then((d) => d.remove())
    },
    /** Bildirime dokunulunca gorevi ac. */
    onReminderOpen: (cb) => {
      const dinleyici = LocalNotifications.addListener('localNotificationActionPerformed', (a) => {
        const gorevId = Number(a.notification.extra?.gorevId)
        if (gorevId) cb({ gorevId })
      })
      return () => void dinleyici.then((d) => d.remove())
    },
    onDataChanged: () => () => {}
  }
}
