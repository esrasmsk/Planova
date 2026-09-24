import { useEffect, useRef, useState } from 'react'
import type { Cikartma } from '../types'
import { CIKARTMALAR, CIKARTMA_GRUPLARI, cikartmaBul } from '../cikartmalar'

interface Props {
  /** Cikartmalarin ait oldugu sayfa (orn. "bugun", "pano"); null ise katman yok. */
  baglam: string | null
  paletAcik: boolean
  onPaletKapat: () => void
}

const VARSAYILAN_BOYUT = 76
const EN_KUCUK = 36
const EN_BUYUK = 200

/** Yazi yazilan bir alanda mi? (Delete tusu orada metni silsin, cikartmayi degil.) */
function yaziAlaniMi(hedef: EventTarget | null): boolean {
  const el = hedef as HTMLElement | null
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
}

/**
 * Sayfa govdesinin icine yerlesir: cikartmalar icerikle birlikte kayar.
 * Surukleyerek tasinir; secilince buyut / kucult / dondur / sil araclari cikar.
 */
export default function CikartmaKatmani({ baglam, paletAcik, onPaletKapat }: Props): JSX.Element | null {
  const [liste, setListeDurumu] = useState<Cikartma[]>([])
  const [secili, setSecili] = useState<number | null>(null)
  const katman = useRef<HTMLDivElement>(null)
  const surukle = useRef<{ id: number; dx: number; dy: number; tasindi: boolean } | null>(null)
  // Listenin guncel hali (kaydederken okunur) ve her cikartmanin kayit sirasi:
  // ayni kayda iki UPDATE ayni anda giderse Firebird "update conflict" verir.
  const listeRef = useRef<Cikartma[]>([])
  const kayitSirasi = useRef<Record<number, Promise<unknown>>>({})

  function setListe(yeni: Cikartma[] | ((l: Cikartma[]) => Cikartma[])): void {
    listeRef.current = typeof yeni === 'function' ? yeni(listeRef.current) : yeni
    setListeDurumu(listeRef.current)
  }

  function sirayleKaydet(c: Cikartma): void {
    const onceki = kayitSirasi.current[c.ID] ?? Promise.resolve()
    kayitSirasi.current[c.ID] = onceki
      .then(() => window.api.cikartma.save(c))
      .catch((e) => console.warn('[cikartma]', e))
  }

  useEffect(() => {
    setSecili(null)
    if (!baglam) {
      setListe([])
      return
    }
    let iptal = false
    window.api.cikartma
      .list(baglam)
      .then((l) => !iptal && setListe(l))
      .catch(() => !iptal && setListe([]))
    return () => {
      iptal = true
    }
  }, [baglam])

  // Disari tiklayinca secim kalksin; Delete ile secili cikartma silinsin
  useEffect(() => {
    if (secili === null) return
    const tik = (e: PointerEvent): void => {
      if (!(e.target as HTMLElement).closest('.cikartma, .cikartma-paleti')) setSecili(null)
    }
    const tus = (e: KeyboardEvent): void => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && !yaziAlaniMi(e.target)) {
        e.preventDefault()
        void sil(secili)
      }
    }
    document.addEventListener('pointerdown', tik)
    window.addEventListener('keydown', tus)
    return () => {
      document.removeEventListener('pointerdown', tik)
      window.removeEventListener('keydown', tus)
    }
  }, [secili])

  if (!baglam) return null

  const enUst = (): number => Math.max(0, ...liste.map((c) => c.Z_SIRA)) + 1

  function guncelle(id: number, yama: Partial<Cikartma>, kaydet = true): void {
    setListe((onceki) => onceki.map((c) => (c.ID === id ? { ...c, ...yama } : c)))
    const hedef = listeRef.current.find((c) => c.ID === id)
    if (kaydet && hedef) sirayleKaydet(hedef)
  }

  async function ekle(tur: string): Promise<void> {
    const govde = katman.current?.parentElement
    const yeni = {
      BAGLAM: baglam!,
      TUR: tur,
      // Gorunen alanin ortasina, biraz daginik ve egik
      KONUM_X: Math.round((govde ? govde.scrollLeft + govde.clientWidth / 2 : 200) - VARSAYILAN_BOYUT / 2 + (Math.random() * 80 - 40)),
      KONUM_Y: Math.round((govde ? govde.scrollTop + govde.clientHeight / 2 : 200) - VARSAYILAN_BOYUT / 2 + (Math.random() * 60 - 30)),
      BOYUT: VARSAYILAN_BOYUT,
      ACI: Math.round(Math.random() * 24 - 12),
      Z_SIRA: enUst()
    }
    try {
      const id = await window.api.cikartma.save(yeni)
      setListe((l) => [...l, { ID: id, ...yeni }])
      setSecili(id)
    } catch (e) {
      console.warn('[cikartma]', e)
    }
  }

  async function sil(id: number): Promise<void> {
    setListe((l) => l.filter((c) => c.ID !== id))
    setSecili(null)
    // Bekleyen kayitlar bittikten sonra sil
    const onceki = kayitSirasi.current[id] ?? Promise.resolve()
    delete kayitSirasi.current[id]
    await onceki
    try {
      await window.api.cikartma.remove(id)
    } catch (e) {
      console.warn('[cikartma]', e)
    }
  }

  function basla(e: React.PointerEvent, c: Cikartma): void {
    e.stopPropagation()
    const kutu = katman.current!.getBoundingClientRect()
    surukle.current = { id: c.ID, dx: e.clientX - kutu.left - c.KONUM_X, dy: e.clientY - kutu.top - c.KONUM_Y, tasindi: false }
    setSecili(c.ID)
    if (c.Z_SIRA < enUst() - 1) guncelle(c.ID, { Z_SIRA: enUst() })
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  function hareket(e: React.PointerEvent): void {
    const s = surukle.current
    if (!s) return
    const kutu = katman.current!.getBoundingClientRect()
    const x = Math.max(0, e.clientX - kutu.left - s.dx)
    const y = Math.max(0, e.clientY - kutu.top - s.dy)
    s.tasindi = true
    guncelle(s.id, { KONUM_X: x, KONUM_Y: y }, false)
  }

  function birak(): void {
    const s = surukle.current
    surukle.current = null
    if (s?.tasindi) guncelle(s.id, {})
  }

  return (
    <>
      <div className="cikartma-katmani" ref={katman}>
        {liste.map((c) => {
          const t = cikartmaBul(c.TUR)
          if (!t) return null
          return (
            <div
              key={c.ID}
              className={`cikartma${secili === c.ID ? ' secili' : ''}`}
              style={{ left: c.KONUM_X, top: c.KONUM_Y, width: c.BOYUT, height: c.BOYUT, zIndex: c.Z_SIRA }}
              title={t.ad}
              onPointerDown={(e) => basla(e, c)}
              onPointerMove={hareket}
              onPointerUp={birak}
              onPointerCancel={birak}
            >
              <svg className="cikartma-resim" viewBox="0 0 64 64" style={{ transform: `rotate(${c.ACI}deg)` }}>
                {t.cizim}
              </svg>

              {secili === c.ID && (
                <div className="cikartma-arac" onPointerDown={(e) => e.stopPropagation()}>
                  <button title="Küçült" onClick={() => guncelle(c.ID, { BOYUT: Math.max(EN_KUCUK, c.BOYUT - 12) })}>
                    −
                  </button>
                  <button title="Büyüt" onClick={() => guncelle(c.ID, { BOYUT: Math.min(EN_BUYUK, c.BOYUT + 12) })}>
                    +
                  </button>
                  <button title="Sola döndür" onClick={() => guncelle(c.ID, { ACI: c.ACI - 15 })}>
                    ⟲
                  </button>
                  <button title="Sağa döndür" onClick={() => guncelle(c.ID, { ACI: c.ACI + 15 })}>
                    ⟳
                  </button>
                  <button title="Sil" className="sil" onClick={() => void sil(c.ID)}>
                    ×
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {paletAcik && (
        <div className="cikartma-paleti" role="dialog" aria-label="Çıkartmalar">
          <div className="cikartma-paleti-bas">
            <b>Çıkartmalar</b>
            <button className="dgm sessiz" onClick={onPaletKapat}>
              Kapat
            </button>
          </div>
          <div className="cikartma-kaydirma">
            {CIKARTMA_GRUPLARI.map((grup) => (
              <section key={grup.kod}>
                <h3 className="cikartma-grup">{grup.ad}</h3>
                <div className="cikartma-izgara">
                  {CIKARTMALAR.filter((t) => t.grup === grup.kod).map((t) => (
                    <button key={t.kod} className="cikartma-sec" title={t.ad} onClick={() => void ekle(t.kod)}>
                      <svg className="cikartma-resim" viewBox="0 0 64 64">
                        {t.cizim}
                      </svg>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
          <p className="cikartma-ipucu">Dokunup yapıştırın, sürükleyerek taşıyın. Seçince büyütüp döndürebilirsiniz.</p>
        </div>
      )}
    </>
  )
}
