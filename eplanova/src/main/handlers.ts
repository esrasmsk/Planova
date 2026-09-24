import { ipcMain, shell, BrowserWindow } from 'electron'
import { exec, getConfig, initDb, localIso, parseLocal, query, queryOne, saveConfig, testConnection } from './db'

// ------------------------------------------------------------------ yardimcilar

function gunBasi(iso: string): Date {
  const d = parseLocal(iso) ?? new Date()
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0)
}

function gunSonu(iso: string): Date {
  const d = parseLocal(iso) ?? new Date()
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59)
}

function sonrakiTarih(d: Date, tip: string, aralik: number): Date {
  const n = new Date(d.getTime())
  const a = Math.max(1, aralik || 1)
  if (tip === 'GUNLUK') n.setDate(n.getDate() + a)
  else if (tip === 'HAFTALIK') n.setDate(n.getDate() + 7 * a)
  else if (tip === 'AYLIK') n.setMonth(n.getMonth() + a)
  else if (tip === 'YILLIK') n.setFullYear(n.getFullYear() + a)
  return n
}

async function gorevZenginlestir(rows: any[]): Promise<any[]> {
  if (!rows.length) return rows
  const idler = rows.map((r) => r.ID).join(',')

  const etiketler = await query(
    `SELECT ge.GOREV_ID, e.ID, e.AD, e.RENK
       FROM PL_GOREV_ETIKET ge
       JOIN PL_ETIKET e ON e.ID = ge.ETIKET_ID
      WHERE ge.GOREV_ID IN (${idler})`
  )
  const uyarilar = await query(
    `SELECT ID, GOREV_ID, DK_ONCE, GONDERILDI
       FROM PL_UYARI
      WHERE GOREV_ID IN (${idler})
      ORDER BY DK_ONCE DESC`
  )

  return rows.map((r) => ({
    ...r,
    etiketler: etiketler.filter((x: any) => x.GOREV_ID === r.ID),
    uyarilar: uyarilar.filter((x: any) => x.GOREV_ID === r.ID)
  }))
}

async function etiketleriYaz(gorevId: number, etiketIdler: number[]): Promise<void> {
  await exec('DELETE FROM PL_GOREV_ETIKET WHERE GOREV_ID = ?', [gorevId])
  for (const eid of etiketIdler ?? []) {
    await exec('INSERT INTO PL_GOREV_ETIKET (GOREV_ID, ETIKET_ID) VALUES (?, ?)', [gorevId, eid])
  }
}

async function uyarilariYaz(gorevId: number, dakikalar: number[]): Promise<void> {
  await exec('DELETE FROM PL_UYARI WHERE GOREV_ID = ?', [gorevId])
  const tekil = Array.from(new Set((dakikalar ?? []).map((n) => Math.max(0, Math.floor(n)))))
  for (const dk of tekil) {
    await exec('INSERT INTO PL_UYARI (GOREV_ID, DK_ONCE) VALUES (?, ?)', [gorevId, dk])
  }
}

// ------------------------------------------------------------------ kayit

export function registerHandlers(): void {
  // ---------------------------------------------------------------- ayarlar
  ipcMain.handle('config:get', () => getConfig())

  ipcMain.handle('config:save', async (_e, next) => {
    const cfg = saveConfig(next)
    return cfg
  })

  ipcMain.handle('config:test', async (_e, cfg) => testConnection(cfg))

  ipcMain.handle('config:reconnect', async () => {
    try {
      await initDb()
      return { ok: true, mesaj: 'Bağlantı yenilendi.' }
    } catch (err: any) {
      return { ok: false, mesaj: String(err?.message ?? err) }
    }
  })

  // ---------------------------------------------------------------- gorevler
  ipcMain.handle('task:list', async (_e, filtre: any = {}) => {
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
    if (filtre.arama) {
      kosul.push('(g.BASLIK CONTAINING ? OR g.DETAY CONTAINING ?)')
      par.push(filtre.arama, filtre.arama)
    }
    if (filtre.etiketId) {
      kosul.push('EXISTS (SELECT 1 FROM PL_GOREV_ETIKET x WHERE x.GOREV_ID = g.ID AND x.ETIKET_ID = ?)')
      par.push(Number(filtre.etiketId))
    }

    const sql =
      `SELECT g.* FROM PL_GOREV g` +
      (kosul.length ? ` WHERE ${kosul.join(' AND ')}` : '') +
      ` ORDER BY g.BASLANGIC, g.ONCELIK DESC`

    return gorevZenginlestir(await query(sql, par))
  })

  ipcMain.handle('task:get', async (_e, id: number) => {
    const rows = await query('SELECT * FROM PL_GOREV WHERE ID = ?', [id])
    const z = await gorevZenginlestir(rows)
    return z[0] ?? null
  })

  ipcMain.handle('task:save', async (_e, g: any) => {
    const par = [
      g.BASLIK,
      g.DETAY ?? null,
      parseLocal(g.BASLANGIC),
      parseLocal(g.BITIS),
      g.TUM_GUN ? 1 : 0,
      Number(g.ONCELIK ?? 1),
      g.RENK ?? null,
      g.TEKRAR_TIP ?? 'YOK',
      Number(g.TEKRAR_ARALIK ?? 1),
      parseLocal(g.TEKRAR_BITIS)
    ]

    let id = Number(g.ID ?? 0)
    if (id > 0) {
      await exec(
        `UPDATE PL_GOREV SET BASLIK = ?, DETAY = ?, BASLANGIC = ?, BITIS = ?, TUM_GUN = ?,
                ONCELIK = ?, RENK = ?, TEKRAR_TIP = ?, TEKRAR_ARALIK = ?, TEKRAR_BITIS = ?,
                GUNCELLEME = CURRENT_TIMESTAMP
          WHERE ID = ?`,
        [...par, id]
      )
    } else {
      const r = await exec(
        `INSERT INTO PL_GOREV (BASLIK, DETAY, BASLANGIC, BITIS, TUM_GUN, ONCELIK, RENK,
                               TEKRAR_TIP, TEKRAR_ARALIK, TEKRAR_BITIS)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING ID`,
        par
      )
      id = Number(r?.ID)
    }

    await etiketleriYaz(id, g.etiketIdler ?? [])
    await uyarilariYaz(id, g.uyariDakikalari ?? [])
    return id
  })

  ipcMain.handle('task:delete', async (_e, id: number) => {
    await exec('DELETE FROM PL_GOREV_ETIKET WHERE GOREV_ID = ?', [id])
    await exec('DELETE FROM PL_UYARI WHERE GOREV_ID = ?', [id])
    await exec('DELETE FROM PL_GOREV WHERE ID = ?', [id])
    return true
  })

  /**
   * Yarina tasi (kagit ajandadaki ok isareti): bitmeyen isin tarihi yarina alinir, saati korunur;
   * bitis zamani ayni miktarda kayar. Zamani henuz gelmemis hatirlatmalar yeniden kurulur,
   * zamani zaten gecmis olanlar susturulur (tasir tasimaz alarm calmasin).
   */
  ipcMain.handle('task:ertele', async (_e, id: number) => {
    const g: any = await queryOne('SELECT BASLANGIC, BITIS FROM PL_GOREV WHERE ID = ?', [id])
    if (!g) return null
    const bas = parseLocal(g.BASLANGIC)!
    const yarin = new Date()
    yarin.setDate(yarin.getDate() + 1)
    const yeniBas = new Date(yarin.getFullYear(), yarin.getMonth(), yarin.getDate(), bas.getHours(), bas.getMinutes(), bas.getSeconds())
    const fark = yeniBas.getTime() - bas.getTime()
    const yeniBit = g.BITIS ? new Date(parseLocal(g.BITIS)!.getTime() + fark) : null

    await exec('UPDATE PL_GOREV SET BASLANGIC = ?, BITIS = ?, GUNCELLEME = CURRENT_TIMESTAMP WHERE ID = ?', [
      yeniBas,
      yeniBit,
      id
    ])
    const uyarilar: any[] = await query('SELECT ID, DK_ONCE FROM PL_UYARI WHERE GOREV_ID = ?', [id])
    for (const u of uyarilar) {
      const zamaniGecti = yeniBas.getTime() - Number(u.DK_ONCE) * 60000 <= Date.now()
      await exec('UPDATE PL_UYARI SET GONDERILDI = ?, GONDERIM = NULL WHERE ID = ?', [zamaniGecti ? 1 : 0, u.ID])
    }
    return localIso(yeniBas)
  })

  /** Tamamla: tekrarli gorevse bir sonraki nushayi uretir. */
  ipcMain.handle('task:complete', async (_e, id: number, tamam: boolean) => {
    if (!tamam) {
      await exec('UPDATE PL_GOREV SET DURUM = 0, TAMAMLANMA = NULL WHERE ID = ?', [id])
      return null
    }

    await exec('UPDATE PL_GOREV SET DURUM = 1, TAMAMLANMA = CURRENT_TIMESTAMP WHERE ID = ?', [id])

    const g: any = await queryOne('SELECT * FROM PL_GOREV WHERE ID = ?', [id])
    if (!g || !g.TEKRAR_TIP || g.TEKRAR_TIP === 'YOK') return null

    const bas = parseLocal(g.BASLANGIC)!
    const yeniBas = sonrakiTarih(bas, g.TEKRAR_TIP, g.TEKRAR_ARALIK)
    const son = parseLocal(g.TEKRAR_BITIS)
    if (son && yeniBas > son) return null

    let yeniBit: Date | null = null
    if (g.BITIS) {
      const fark = parseLocal(g.BITIS)!.getTime() - bas.getTime()
      yeniBit = new Date(yeniBas.getTime() + fark)
    }

    const r = await exec(
      `INSERT INTO PL_GOREV (BASLIK, DETAY, BASLANGIC, BITIS, TUM_GUN, ONCELIK, RENK,
                             TEKRAR_TIP, TEKRAR_ARALIK, TEKRAR_BITIS, SERI_ID)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING ID`,
      [
        g.BASLIK,
        g.DETAY,
        yeniBas,
        yeniBit,
        g.TUM_GUN,
        g.ONCELIK,
        g.RENK,
        g.TEKRAR_TIP,
        g.TEKRAR_ARALIK,
        parseLocal(g.TEKRAR_BITIS),
        g.SERI_ID ?? g.ID
      ]
    )
    const yeniId = Number(r?.ID)

    const et: any[] = await query('SELECT ETIKET_ID FROM PL_GOREV_ETIKET WHERE GOREV_ID = ?', [id])
    await etiketleriYaz(yeniId, et.map((x) => x.ETIKET_ID))

    const uy: any[] = await query('SELECT DK_ONCE FROM PL_UYARI WHERE GOREV_ID = ?', [id])
    await uyarilariYaz(yeniId, uy.map((x) => x.DK_ONCE))

    return { ID: yeniId, BASLANGIC: localIso(yeniBas) }
  })

  // ---------------------------------------------------------------- etiketler
  ipcMain.handle('tag:list', () => query('SELECT * FROM PL_ETIKET ORDER BY AD'))

  ipcMain.handle('tag:save', async (_e, t: any) => {
    if (t.ID) {
      await exec('UPDATE PL_ETIKET SET AD = ?, RENK = ? WHERE ID = ?', [t.AD, t.RENK, t.ID])
      return t.ID
    }
    const r = await exec('INSERT INTO PL_ETIKET (AD, RENK) VALUES (?, ?) RETURNING ID', [t.AD, t.RENK])
    return Number(r?.ID)
  })

  ipcMain.handle('tag:delete', async (_e, id: number) => {
    await exec('DELETE FROM PL_GOREV_ETIKET WHERE ETIKET_ID = ?', [id])
    await exec('DELETE FROM PL_ETIKET WHERE ID = ?', [id])
    return true
  })

  // ---------------------------------------------------------------- gunluk
  ipcMain.handle('journal:get', async (_e, tarihIso: string) => {
    const t = gunBasi(tarihIso)
    return queryOne('SELECT * FROM PL_NOT WHERE TARIH = ?', [t])
  })

  ipcMain.handle('journal:save', async (_e, tarihIso: string, icerik: string, ruhHali: string | null) => {
    const t = gunBasi(tarihIso)
    const mevcut: any = await queryOne('SELECT ID FROM PL_NOT WHERE TARIH = ?', [t])
    if (mevcut) {
      await exec('UPDATE PL_NOT SET ICERIK = ?, RUH_HALI = ?, GUNCELLEME = CURRENT_TIMESTAMP WHERE ID = ?', [
        icerik,
        ruhHali,
        mevcut.ID
      ])
      return mevcut.ID
    }
    const r = await exec(
      'INSERT INTO PL_NOT (TARIH, ICERIK, RUH_HALI, GUNCELLEME) VALUES (?, ?, ?, CURRENT_TIMESTAMP) RETURNING ID',
      [t, icerik, ruhHali]
    )
    return Number(r?.ID)
  })

  ipcMain.handle('journal:delete', async (_e, tarihIso: string) => {
    await exec('DELETE FROM PL_NOT WHERE TARIH = ?', [gunBasi(tarihIso)])
    return true
  })

  ipcMain.handle('journal:dates', async (_e, baslangic: string, bitis: string) =>
    query('SELECT TARIH FROM PL_NOT WHERE TARIH BETWEEN ? AND ?', [gunBasi(baslangic), gunSonu(bitis)])
  )

  // ---------------------------------------------------------------- yapiskan notlar
  ipcMain.handle('sticky:list', () => query('SELECT * FROM PL_STICKY ORDER BY Z_SIRA, ID'))

  ipcMain.handle('sticky:save', async (_e, s: any) => {
    if (s.ID) {
      await exec(
        `UPDATE PL_STICKY SET ICERIK = ?, RENK = ?, KONUM_X = ?, KONUM_Y = ?, EGIM = ?, Z_SIRA = ?
          WHERE ID = ?`,
        [s.ICERIK ?? '', s.RENK, Math.round(s.KONUM_X), Math.round(s.KONUM_Y), Math.round(s.EGIM ?? 0), s.Z_SIRA ?? 1, s.ID]
      )
      return s.ID
    }
    const r = await exec(
      `INSERT INTO PL_STICKY (ICERIK, RENK, KONUM_X, KONUM_Y, EGIM, Z_SIRA)
       VALUES (?, ?, ?, ?, ?, ?) RETURNING ID`,
      [s.ICERIK ?? '', s.RENK, Math.round(s.KONUM_X), Math.round(s.KONUM_Y), Math.round(s.EGIM ?? 0), s.Z_SIRA ?? 1]
    )
    return Number(r?.ID)
  })

  ipcMain.handle('sticky:delete', async (_e, id: number) => {
    await exec('DELETE FROM PL_STICKY WHERE ID = ?', [id])
    return true
  })

  // ---------------------------------------------------------------- cikartmalar
  ipcMain.handle('cikartma:list', (_e, baglam: string) =>
    query('SELECT * FROM PL_CIKARTMA WHERE BAGLAM = ? ORDER BY Z_SIRA, ID', [baglam])
  )

  ipcMain.handle('cikartma:save', async (_e, c: any) => {
    const par = [
      Math.round(c.KONUM_X ?? 40),
      Math.round(c.KONUM_Y ?? 40),
      Math.round(c.BOYUT ?? 72),
      Math.round(c.ACI ?? 0),
      Math.round(c.Z_SIRA ?? 1)
    ]
    if (c.ID) {
      await exec('UPDATE PL_CIKARTMA SET KONUM_X = ?, KONUM_Y = ?, BOYUT = ?, ACI = ?, Z_SIRA = ? WHERE ID = ?', [
        ...par,
        c.ID
      ])
      return c.ID
    }
    const r = await exec(
      `INSERT INTO PL_CIKARTMA (BAGLAM, TUR, KONUM_X, KONUM_Y, BOYUT, ACI, Z_SIRA)
       VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING ID`,
      [c.BAGLAM, c.TUR, ...par]
    )
    return Number(r?.ID)
  })

  ipcMain.handle('cikartma:delete', async (_e, id: number) => {
    await exec('DELETE FROM PL_CIKARTMA WHERE ID = ?', [id])
    return true
  })

  // ---------------------------------------------------------------- kisisel sayfalar
  ipcMain.handle('page:list', () =>
    query('SELECT ID, BASLIK, OZEL, SIRA, GUNCELLEME FROM PL_SAYFA ORDER BY SIRA, ID')
  )

  ipcMain.handle('page:get', (_e, id: number) => queryOne('SELECT * FROM PL_SAYFA WHERE ID = ?', [id]))

  ipcMain.handle('page:save', async (_e, p: any) => {
    if (p.ID) {
      await exec(
        'UPDATE PL_SAYFA SET BASLIK = ?, ICERIK = ?, OZEL = ?, GUNCELLEME = CURRENT_TIMESTAMP WHERE ID = ?',
        [p.BASLIK, p.ICERIK ?? '', p.OZEL ? 1 : 0, p.ID]
      )
      return p.ID
    }
    const r = await exec(
      'INSERT INTO PL_SAYFA (BASLIK, ICERIK, OZEL, GUNCELLEME) VALUES (?, ?, ?, CURRENT_TIMESTAMP) RETURNING ID',
      [p.BASLIK, p.ICERIK ?? '', p.OZEL ? 1 : 0]
    )
    return Number(r?.ID)
  })

  ipcMain.handle('page:delete', async (_e, id: number) => {
    await exec('DELETE FROM PL_SAYFA WHERE ID = ?', [id])
    return true
  })

  // ---------------------------------------------------------------- arama
  ipcMain.handle('search:all', async (_e, metin: string) => {
    if (!metin || metin.trim().length < 2) return { gorevler: [], notlar: [], sayfalar: [], stickyler: [] }
    const q = metin.trim()
    const [gorevler, notlar, sayfalar, stickyler] = await Promise.all([
      query(
        `SELECT ID, BASLIK, DETAY, BASLANGIC, DURUM FROM PL_GOREV
          WHERE BASLIK CONTAINING ? OR DETAY CONTAINING ?
          ORDER BY BASLANGIC DESC`,
        [q, q]
      ),
      query('SELECT ID, TARIH, ICERIK FROM PL_NOT WHERE ICERIK CONTAINING ? ORDER BY TARIH DESC', [q]),
      query('SELECT ID, BASLIK, ICERIK, OZEL FROM PL_SAYFA WHERE BASLIK CONTAINING ? OR ICERIK CONTAINING ?', [q, q]),
      query('SELECT ID, ICERIK, RENK FROM PL_STICKY WHERE ICERIK CONTAINING ?', [q])
    ])
    return { gorevler, notlar, sayfalar, stickyler }
  })

  // ---------------------------------------------------------------- ozet
  ipcMain.handle('stats:summary', async () => {
    const bugun = new Date()
    const bas = new Date(bugun.getFullYear(), bugun.getMonth(), bugun.getDate(), 0, 0, 0)
    const son = new Date(bugun.getFullYear(), bugun.getMonth(), bugun.getDate(), 23, 59, 59)
    const [acik, bugunku, geciken] = await Promise.all([
      queryOne('SELECT COUNT(*) AS N FROM PL_GOREV WHERE DURUM = 0'),
      queryOne('SELECT COUNT(*) AS N FROM PL_GOREV WHERE DURUM = 0 AND BASLANGIC BETWEEN ? AND ?', [bas, son]),
      queryOne('SELECT COUNT(*) AS N FROM PL_GOREV WHERE DURUM = 0 AND BASLANGIC < ?', [bas])
    ])
    return {
      acik: Number((acik as any)?.N ?? 0),
      bugun: Number((bugunku as any)?.N ?? 0),
      geciken: Number((geciken as any)?.N ?? 0)
    }
  })

  // ---------------------------------------------------------------- pencere
  ipcMain.handle('app:openExternal', (_e, url: string) => shell.openExternal(url))

  ipcMain.handle('app:minimize', (e) => BrowserWindow.fromWebContents(e.sender)?.minimize())
}
