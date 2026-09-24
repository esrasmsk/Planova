import { useEffect, useRef, useState } from 'react'
import type { Sticky } from '../types'

const RENKLER = ['#fdf08a', '#fbc2d4', '#bfe3c8', '#bcd9f0', '#f7cfa0', '#ded0f0']

export default function YapiskanPano({ yenile }: { yenile: number }): JSX.Element {
  const [notlar, setNotlar] = useState<Sticky[]>([])
  const notlarRef = useRef(notlar)
  notlarRef.current = notlar
  const pano = useRef<HTMLDivElement>(null)
  const surukle = useRef<{ id: number; dx: number; dy: number } | null>(null)
  const kaydetZaman = useRef<Record<number, ReturnType<typeof setTimeout>>>({})

  useEffect(() => {
    void (async () => setNotlar(await window.api.sticky.list()))()
  }, [yenile])

  function gecikmeliKaydet(n: Sticky): void {
    clearTimeout(kaydetZaman.current[n.ID])
    kaydetZaman.current[n.ID] = setTimeout(() => void window.api.sticky.save(n), 500)
  }

  function guncelle(id: number, yama: Partial<Sticky>, hemen = false): void {
    // Kaydetme setNotlar'in icinde olmamali: React (StrictMode) o fonksiyonu iki kez calistirir,
    // ayni kayda iki UPDATE gider ve Firebird "update conflict" verir.
    const eski = notlarRef.current.find((n) => n.ID === id)
    if (!eski) return
    const hedef = { ...eski, ...yama }
    setNotlar((onceki) => onceki.map((n) => (n.ID === id ? { ...n, ...yama } : n)))
    if (hemen) void window.api.sticky.save(hedef)
    else gecikmeliKaydet(hedef)
  }

  async function ekle(): Promise<void> {
    const kutu = pano.current?.getBoundingClientRect()
    const yeni = {
      ICERIK: '',
      RENK: RENKLER[Math.floor(Math.random() * RENKLER.length)],
      KONUM_X: Math.round(30 + Math.random() * Math.max(60, (kutu?.width ?? 700) - 280)),
      KONUM_Y: Math.round(24 + Math.random() * 160),
      EGIM: Math.round(Math.random() * 8 - 4),
      Z_SIRA: notlar.length + 1
    }
    const id = await window.api.sticky.save(yeni)
    setNotlar([...notlar, { ID: id, ...yeni } as Sticky])
  }

  async function sil(id: number): Promise<void> {
    await window.api.sticky.remove(id)
    setNotlar(notlar.filter((n) => n.ID !== id))
  }

  function basla(e: React.PointerEvent, n: Sticky): void {
    if ((e.target as HTMLElement).closest('textarea, button')) return
    const kutu = pano.current!.getBoundingClientRect()
    surukle.current = {
      id: n.ID,
      dx: e.clientX - kutu.left - n.KONUM_X,
      dy: e.clientY - kutu.top - n.KONUM_Y
    }
    const enUst = Math.max(0, ...notlar.map((x) => x.Z_SIRA)) + 1
    guncelle(n.ID, { Z_SIRA: enUst })
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  function hareket(e: React.PointerEvent): void {
    const s = surukle.current
    if (!s) return
    const kutu = pano.current!.getBoundingClientRect()
    const x = Math.max(0, Math.min(kutu.width - 210, e.clientX - kutu.left - s.dx))
    const y = Math.max(0, Math.min(kutu.height - 80, e.clientY - kutu.top - s.dy))
    setNotlar((onceki) => onceki.map((n) => (n.ID === s.id ? { ...n, KONUM_X: x, KONUM_Y: y } : n)))
  }

  function birak(): void {
    const s = surukle.current
    surukle.current = null
    if (!s) return
    const n = notlar.find((x) => x.ID === s.id)
    if (n) void window.api.sticky.save(n)
  }

  return (
    <>
      <div className="takvim-ust">
        <button className="dgm birincil" onClick={() => void ekle()}>
          Not yapıştır
        </button>
        <span className="bos" style={{ padding: 0, fontSize: 13 }}>
          Notları sürükleyerek yerleştirin; yazdıklarınız kendiliğinden kaydedilir.
        </span>
      </div>

      <div className="pano" ref={pano} onPointerMove={hareket} onPointerUp={birak} onPointerCancel={birak} onPointerLeave={birak}>
        {notlar.map((n) => (
          <div
            key={n.ID}
            className="pusula"
            style={{
              left: n.KONUM_X,
              top: n.KONUM_Y,
              background: n.RENK,
              zIndex: n.Z_SIRA,
              transform: `rotate(${n.EGIM}deg)`
            }}
            onPointerDown={(e) => basla(e, n)}
          >
            <textarea
              value={n.ICERIK ?? ''}
              maxLength={2000}
              placeholder="Aklına geleni yaz…"
              onChange={(e) => guncelle(n.ID, { ICERIK: e.target.value })}
            />
            <div className="pusula-arac">
              {RENKLER.map((r) => (
                <button
                  key={r}
                  className="renk-nokta"
                  style={{ background: r }}
                  aria-label={`Rengi değiştir`}
                  onClick={() => guncelle(n.ID, { RENK: r }, true)}
                />
              ))}
              <button
                className="dgm sessiz"
                style={{ marginLeft: 'auto', fontSize: 12 }}
                onClick={() => void sil(n.ID)}
              >
                Kaldır
              </button>
            </div>
          </div>
        ))}

        {notlar.length === 0 && (
          <p
            className="bos"
            style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#6b5636' }}
          >
            Pano boş. "Not yapıştır" ile başlayın.
          </p>
        )}
      </div>
    </>
  )
}
