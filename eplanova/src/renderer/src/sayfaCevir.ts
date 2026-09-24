/**
 * Sekme degisiminde sayfa gecisi: derinlik / kart yigini (Apple tarzi).
 * Kutuphane yok (Web Animations API):
 *  - eski sayfa bir kart gibi geriye itilir: kuculur, koseleri yuvarlanir, kararir;
 *  - yeni sayfa alttan kart gibi yukselir, altinda derin golgeyle ustune cikar ve
 *    sonumlu bir yay hareketiyle yerine oturur;
 *  - yeni sayfanin basligi ve icerigi karttan biraz geriden, kademeli gelir (paralaks).
 * Dokunmatik cihazlarda (telefon, tablet) ekran karti zayif oldugundan hafif surum calisir:
 * bulaniklik, karartma ve golge animasyonu yok, sure kisa, yalnizca transform + opacity.
 * Stiller styles.css'te "sayfa gecisi" bolumunde.
 */

export interface SayfaCevirme {
  kopya: HTMLElement
  kaydirma: number
}

/** Gecis suresi (ms): masaustu / dokunmatik. */
const SURE = 760
const HAFIF_SURE = 380
/** Geri itilen sayfa icin iOS benzeri egri. */
const GERI_EGRISI = 'cubic-bezier(0.32, 0.72, 0, 1)'
/** Kademeli belirmede ogeler arasi gecikme (ms) ve en fazla oge sayisi. */
const KADEME_MS = 55
const EN_FAZLA_OGE = 10

/**
 * Sonumlu yay (spring) egrisi: fiziksel yay denklemi orneklenip CSS linear() egrisine cevrilir.
 * sonum 1'e yaklastikca salinim azalir; 0.82 ile hedefin ~%1.5 otesine gidip geri gelir.
 */
function yayEgrisi(sonum = 0.82, sertlik = 9, adim = 48): string {
  const sonumluFrekans = sertlik * Math.sqrt(1 - sonum * sonum)
  const degerler: string[] = []
  for (let i = 0; i <= adim; i++) {
    const t = i / adim
    const zarf = Math.exp(-sonum * sertlik * t)
    const x =
      1 - zarf * (Math.cos(sonumluFrekans * t) + ((sonum * sertlik) / sonumluFrekans) * Math.sin(sonumluFrekans * t))
    degerler.push((i === adim ? 1 : x).toFixed(4))
  }
  return `linear(${degerler.join(', ')})`
}

/** Eski Android WebView'lar linear() egrisini tanimiyor; o zaman yay yerine yumusak bir bezier kullanilir. */
const YAY = CSS.supports('animation-timing-function', 'linear(0, 1)')
  ? yayEgrisi()
  : 'cubic-bezier(0.22, 1, 0.36, 1)'

/** Telefon, tablet ya da dokunmatik ekran: hafif gecis. */
function hafifMi(): boolean {
  return (
    window.api?.platform === 'mobil' ||
    window.matchMedia('(pointer: coarse)').matches ||
    window.matchMedia('(max-width: 760px)').matches
  )
}

/** Sekme degismeden once cagrilir: o anki sayfanin kopyasini alir. */
export function cevirmeyeHazirla(sayfa: HTMLElement): SayfaCevirme | null {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return null
  const kopya = sayfa.cloneNode(true) as HTMLElement
  kopya.classList.add('sayfa-kopya')
  kopya.setAttribute('aria-hidden', 'true')
  kopya.setAttribute('inert', '')
  return { kopya, kaydirma: sayfa.querySelector('.sayfa-govde')?.scrollTop ?? 0 }
}

/** Yeni sekme ekrana cizilmeden once (useLayoutEffect) cagrilir. */
export function sayfayiCevir(c: SayfaCevirme, yeni: HTMLElement): void {
  const { kopya } = c

  // Eski sayfanin kopyasi yeni sayfanin altinda kalir
  yeni.before(kopya)
  const govde = kopya.querySelector('.sayfa-govde')
  if (govde) govde.scrollTop = c.kaydirma

  const animasyonlar: Animation[] = []
  const bitir = (): void => {
    kopya.remove()
    animasyonlar.forEach((a) => a.cancel())
  }

  // Animasyon hata verirse eski sayfa ekranda asili kalmasin
  try {
    if (hafifMi()) hafifGecis(kopya, yeni, animasyonlar)
    else tamGecis(kopya, yeni, animasyonlar)
  } catch (e) {
    console.warn('[sayfa gecisi]', e)
    bitir()
    return
  }
  Promise.all(animasyonlar.map((a) => a.finished)).then(bitir, bitir)
}

/** Dokunmatik cihazlar icin: kisa, yalnizca transform + opacity (ekran karti dostu). */
function hafifGecis(kopya: HTMLElement, yeni: HTMLElement, animasyonlar: Animation[]): void {
  animasyonlar.push(
    kopya.animate(
      [
        { transform: 'scale(1)', opacity: 1 },
        { transform: 'scale(0.94)', opacity: 0.4 }
      ],
      { duration: HAFIF_SURE, easing: GERI_EGRISI, fill: 'both' }
    ),
    yeni.animate(
      [
        { transform: 'translateY(40%)', opacity: 0 },
        { transform: 'translateY(0)', opacity: 1 }
      ],
      { duration: HAFIF_SURE, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'both' }
    )
  )
}

/** Masaustu: kart yigini, yay ve paralaks. */
function tamGecis(kopya: HTMLElement, yeni: HTMLElement, animasyonlar: Animation[]): void {
  const koseler = getComputedStyle(yeni).borderRadius

  // 1) Eski sayfa: kart gibi geriye itilir
  animasyonlar.push(
    kopya.animate(
      [
        { transform: 'translateY(0) scale(1)', borderRadius: koseler, filter: 'brightness(1) blur(0)' },
        { transform: 'translateY(-1.5%) scale(0.9)', borderRadius: '26px', filter: 'brightness(0.62) blur(1.5px)' }
      ],
      { duration: SURE, easing: GERI_EGRISI, fill: 'both' }
    )
  )

  // 2) Yeni sayfa: alttan yukselir, derin golgeyle ustune cikar, yayla yerine oturur
  animasyonlar.push(
    yeni.animate(
      [
        {
          transform: 'translateY(100%) scale(0.94)',
          borderRadius: '26px',
          boxShadow: '0 -30px 70px rgba(10, 15, 40, 0.45)'
        },
        {
          transform: 'translateY(0) scale(1)',
          borderRadius: koseler,
          boxShadow: '0 0 0 rgba(10, 15, 40, 0)'
        }
      ],
      { duration: SURE, easing: YAY, fill: 'both' }
    )
  )

  // 3) Paralaks: baslik ve icerik karttan biraz geriden, kademeli gelir
  const ogeler = [
    yeni.querySelector('.sayfa-basi'),
    ...Array.from(yeni.querySelector('.sayfa-govde')?.children ?? [])
  ]
    .filter((o): o is HTMLElement => o instanceof HTMLElement && !o.classList.contains('cikartma-katmani'))
    .slice(0, EN_FAZLA_OGE)
  ogeler.forEach((oge, i) => {
    animasyonlar.push(
      oge.animate(
        [
          { opacity: 0, transform: 'translateY(46px)' },
          { opacity: 1, transform: 'translateY(0)' }
        ],
        { duration: 620, delay: 120 + i * KADEME_MS, easing: YAY, fill: 'both' }
      )
    )
  })
}
