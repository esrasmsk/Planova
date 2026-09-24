export interface Etiket {
  ID: number
  AD: string
  RENK: string
  GOREV_ID?: number
}

export interface Uyari {
  ID: number
  GOREV_ID: number
  DK_ONCE: number
  GONDERILDI: number
}

export interface Gorev {
  ID: number
  BASLIK: string
  DETAY: string | null
  BASLANGIC: string
  BITIS: string | null
  TUM_GUN: number
  ONCELIK: number
  DURUM: number
  RENK: string | null
  TEKRAR_TIP: string
  TEKRAR_ARALIK: number
  TEKRAR_BITIS: string | null
  SERI_ID: number | null
  TAMAMLANMA: string | null
  etiketler: Etiket[]
  uyarilar: Uyari[]
}

export interface Sticky {
  ID: number
  ICERIK: string | null
  RENK: string
  KONUM_X: number
  KONUM_Y: number
  EGIM: number
  Z_SIRA: number
}

export interface Sayfa {
  ID: number
  BASLIK: string
  ICERIK: string | null
  OZEL: number
  SIRA: number
  GUNCELLEME: string | null
}

/** Sayfaya yapistirilan cikartma. BAGLAM hangi sayfaya ait oldugunu soyler (orn. "bugun", "pano"). */
export interface Cikartma {
  ID: number
  BAGLAM: string
  TUR: string
  KONUM_X: number
  KONUM_Y: number
  BOYUT: number
  ACI: number
  Z_SIRA: number
}

export interface GunlukNot {
  ID: number
  TARIH: string
  ICERIK: string | null
  RUH_HALI: string | null
}

export interface AppConfig {
  host: string
  port: number
  database: string
  user: string
  password: string
  charset: string
  pin: string | null
  kontrolSaniye: number
  /** Hatirlatma penceresinde alarm sesi calsin mi (tanimsiz = evet) */
  alarmSesi?: boolean
  /** Gorunum: 'klasik' kurumsal (varsayilan) ya da 'renkli' */
  tema?: 'renkli' | 'klasik'
}

export type Sekme = 'bugun' | 'takvim' | 'yapiskan' | 'notlar' | 'arama' | 'ayarlar'

export interface IslemSonucu {
  ok: boolean
  mesaj: string
}

/**
 * Arayuzun veri katmani. Masaustunde preload (IPC -> Firebird), mobilde
 * api/mobilApi.ts (SQLite) ayni sozlesmeyi uygular.
 */
export interface PlanovaApi {
  platform: 'masaustu' | 'mobil'
  config: {
    get: () => Promise<AppConfig>
    save: (n: Partial<AppConfig>) => Promise<AppConfig>
    test: (c: Partial<AppConfig>) => Promise<IslemSonucu>
    reconnect: () => Promise<IslemSonucu>
  }
  task: {
    list: (f: any) => Promise<Gorev[]>
    get: (id: number) => Promise<Gorev | null>
    save: (g: any) => Promise<number>
    remove: (id: number) => Promise<boolean>
    complete: (id: number, tamam: boolean) => Promise<any>
    /** Bitmeyen isi yarina tasir (saat korunur); yeni baslangic zamanini dondurur. */
    ertele: (id: number) => Promise<string | null>
  }
  tag: {
    list: () => Promise<Etiket[]>
    save: (t: any) => Promise<number>
    remove: (id: number) => Promise<boolean>
  }
  journal: {
    get: (tarih: string) => Promise<GunlukNot | null>
    save: (tarih: string, icerik: string, ruh: string | null) => Promise<number>
    remove: (tarih: string) => Promise<boolean>
    dates: (bas: string, bit: string) => Promise<{ TARIH: string }[]>
  }
  sticky: {
    list: () => Promise<Sticky[]>
    save: (s: any) => Promise<number>
    remove: (id: number) => Promise<boolean>
  }
  cikartma: {
    list: (baglam: string) => Promise<Cikartma[]>
    save: (c: Partial<Cikartma>) => Promise<number>
    remove: (id: number) => Promise<boolean>
  }
  page: {
    list: () => Promise<Sayfa[]>
    get: (id: number) => Promise<Sayfa | null>
    save: (p: any) => Promise<number>
    remove: (id: number) => Promise<boolean>
  }
  search: (m: string) => Promise<{ gorevler: any[]; notlar: any[]; sayfalar: any[]; stickyler: any[] }>
  stats: () => Promise<{ acik: number; bugun: number; geciken: number }>
  onReminder: (cb: (v: any) => void) => () => void
  onReminderOpen: (cb: (v: { gorevId: number }) => void) => () => void
  onDataChanged: (cb: () => void) => () => void
}

declare global {
  interface Window {
    api: PlanovaApi
  }
}
