export const AYLAR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
]

export const GUNLER = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']
export const GUNLER_KISA = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']

const iki = (n: number): string => String(n).padStart(2, '0')

export function isoGun(d: Date): string {
  return `${d.getFullYear()}-${iki(d.getMonth() + 1)}-${iki(d.getDate())}`
}

export function isoTam(d: Date): string {
  return `${isoGun(d)}T${iki(d.getHours())}:${iki(d.getMinutes())}:00`
}

export function coz(s: string | null | undefined): Date | null {
  if (!s) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(s)
  if (!m) return null
  return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] ?? 0), +(m[5] ?? 0))
}

export function saatMetni(s: string | null | undefined): string {
  const d = coz(s)
  return d ? `${iki(d.getHours())}:${iki(d.getMinutes())}` : ''
}

export function gunMetni(d: Date): string {
  return `${d.getDate()} ${AYLAR[d.getMonth()]} ${d.getFullYear()}`
}

export function haftaninGunu(d: Date): string {
  return GUNLER[(d.getDay() + 6) % 7]
}

export function ayniGun(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function gunEkle(d: Date, n: number): Date {
  const x = new Date(d.getTime())
  x.setDate(x.getDate() + n)
  return x
}

export function ayEkle(d: Date, n: number): Date {
  const x = new Date(d.getFullYear(), d.getMonth() + n, 1)
  return x
}

/** Pazartesi baslangicli ay izgarasi — 6 hafta x 7 gun. */
export function ayIzgarasi(yil: number, ay: number): Date[] {
  const ilk = new Date(yil, ay, 1)
  const kaydir = (ilk.getDay() + 6) % 7
  const bas = gunEkle(ilk, -kaydir)
  return Array.from({ length: 42 }, (_, i) => gunEkle(bas, i))
}

export function kalanMetni(hedef: Date): string {
  const fark = Math.round((hedef.getTime() - Date.now()) / 60000)
  if (fark < 0) {
    const g = Math.abs(fark)
    if (g < 60) return `${g} dk geçti`
    if (g < 1440) return `${Math.floor(g / 60)} sa geçti`
    return `${Math.floor(g / 1440)} gün geçti`
  }
  if (fark < 60) return `${fark} dk kaldı`
  if (fark < 1440) return `${Math.floor(fark / 60)} sa ${fark % 60} dk kaldı`
  return `${Math.floor(fark / 1440)} gün kaldı`
}

export const UYARI_SECENEKLERI = [
  { dk: 0, ad: 'tam zamanında' },
  { dk: 15, ad: '15 dakika önce' },
  { dk: 60, ad: '1 saat önce' },
  { dk: 180, ad: '3 saat önce' },
  { dk: 1440, ad: '1 gün önce' },
  { dk: 2880, ad: '2 gün önce' },
  { dk: 10080, ad: '1 hafta önce' }
]
