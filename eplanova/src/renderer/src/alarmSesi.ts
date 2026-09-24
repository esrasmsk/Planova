/**
 * Hatirlatma alarm sesi: klasik dijital calar saat "bip-bip-bip-bip".
 * Ses dosyasi yok; Web Audio API ile uretilir. alarmCal() durduran bir fonksiyon dondurur.
 */

let baglam: AudioContext | null = null

function baglamAl(): AudioContext | null {
  const Baglam = window.AudioContext ?? (window as any).webkitAudioContext
  if (!Baglam) return null
  baglam = baglam ?? new Baglam()
  return baglam
}

/**
 * Tarayici / Android WebView ses motorunu ancak kullanici etkilesiminde acar. Ilk dokunus ya da
 * tus basisinda motor acilip hazir bekler; alarm geldiginde (etkilesim olmadan) sessiz kalmaz.
 */
function sesKilidiniAc(): void {
  const ctx = baglamAl()
  if (ctx && ctx.state !== 'running') void ctx.resume().catch(() => {})
  if (!ctx || ctx.state === 'running') {
    window.removeEventListener('pointerdown', sesKilidiniAc, true)
    window.removeEventListener('keydown', sesKilidiniAc, true)
  }
}
window.addEventListener('pointerdown', sesKilidiniAc, true)
window.addEventListener('keydown', sesKilidiniAc, true)

/** Bir tur: dort kisa bip, yuksek-alcak sirayla. */
const BIPLER = [
  { gecikme: 0, frekans: 1050 },
  { gecikme: 0.18, frekans: 1320 },
  { gecikme: 0.36, frekans: 1050 },
  { gecikme: 0.54, frekans: 1320 }
]
const TUR_ARALIGI_MS = 1300
const EN_UZUN_MS = 60000
const SES_DUZEYI = 0.16

export function alarmCal(): () => void {
  const acik = baglamAl()
  if (!acik) return () => {}
  const ctx: AudioContext = acik
  void ctx.resume().catch(() => {})

  const ana = ctx.createGain()
  ana.gain.value = SES_DUZEYI
  ana.connect(ctx.destination)

  let durdu = false

  function bip(zaman: number, frekans: number): void {
    const osilator = ctx.createOscillator()
    const zarf = ctx.createGain()
    osilator.type = 'square'
    osilator.frequency.value = frekans
    // Tiklamasin diye yumusak acilip kapanan kisa bip
    zarf.gain.setValueAtTime(0, zaman)
    zarf.gain.linearRampToValueAtTime(1, zaman + 0.01)
    zarf.gain.setValueAtTime(1, zaman + 0.11)
    zarf.gain.linearRampToValueAtTime(0, zaman + 0.13)
    osilator.connect(zarf)
    zarf.connect(ana)
    osilator.start(zaman)
    osilator.stop(zaman + 0.15)
  }

  function tur(): void {
    if (durdu) return
    const bas = ctx.currentTime + 0.05
    BIPLER.forEach((b) => bip(bas + b.gecikme, b.frekans))
  }

  function durdur(): void {
    if (durdu) return
    durdu = true
    clearInterval(aralik)
    clearTimeout(zamanAsimi)
    ana.gain.setTargetAtTime(0, ctx.currentTime, 0.05)
    setTimeout(() => ana.disconnect(), 400)
  }

  tur()
  const aralik = setInterval(tur, TUR_ARALIGI_MS)
  const zamanAsimi = setTimeout(durdur, EN_UZUN_MS)
  return durdur
}

/** Ayarlar'daki "Sesi dene" icin: bir tur calip durur. */
export function alarmDene(): void {
  const durdur = alarmCal()
  setTimeout(durdur, TUR_ARALIGI_MS - 100)
}
