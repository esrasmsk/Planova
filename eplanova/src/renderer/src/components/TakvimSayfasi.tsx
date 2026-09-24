import { useEffect, useState } from 'react'
import type { Gorev } from '../types'
import { Bos, GorevSatiri, onayIste } from './Ortak'
import { AYLAR, GUNLER_KISA, ayEkle, ayIzgarasi, ayniGun, coz, gunMetni, haftaninGunu, isoGun } from '../tarih'

interface Props {
  seciliGun: Date
  setSeciliGun: (d: Date) => void
  yenile: number
  onDuzenle: (g: Partial<Gorev> | null) => void
  onDegisti: () => void
}

export default function TakvimSayfasi({
  seciliGun,
  setSeciliGun,
  yenile,
  onDuzenle,
  onDegisti
}: Props): JSX.Element {
  const [ayBasi, setAyBasi] = useState(new Date(seciliGun.getFullYear(), seciliGun.getMonth(), 1))
  const [aylik, setAylik] = useState<Gorev[]>([])

  const izgara = ayIzgarasi(ayBasi.getFullYear(), ayBasi.getMonth())

  useEffect(() => {
    void yukle()
  }, [ayBasi, yenile])

  async function yukle(): Promise<void> {
    const bas = isoGun(izgara[0])
    const bit = isoGun(izgara[41])
    setAylik(await window.api.task.list({ baslangic: bas, bitis: bit }))
  }

  function gunun(d: Date): Gorev[] {
    return aylik.filter((g) => {
      const b = coz(g.BASLANGIC)
      return b !== null && ayniGun(b, d)
    })
  }

  async function tamamla(g: Gorev): Promise<void> {
    await window.api.task.complete(g.ID, g.DURUM !== 1)
    onDegisti()
  }

  async function ertele(g: Gorev): Promise<void> {
    await window.api.task.ertele(g.ID)
    onDegisti()
  }

  async function sil(g: Gorev): Promise<void> {
    if (!(await onayIste(`"${g.BASLIK}" silinsin mi?`))) return
    await window.api.task.remove(g.ID)
    onDegisti()
  }

  const bugun = new Date()
  const secilenler = gunun(seciliGun)

  return (
    <>
      <div className="takvim-ust">
        <button className="dgm" onClick={() => setAyBasi(ayEkle(ayBasi, -1))} aria-label="Önceki ay">
          ‹
        </button>
        <strong style={{ fontFamily: 'var(--baslik)', fontSize: 20, fontWeight: 600, minWidth: 190 }}>
          {AYLAR[ayBasi.getMonth()]} {ayBasi.getFullYear()}
        </strong>
        <button className="dgm" onClick={() => setAyBasi(ayEkle(ayBasi, 1))} aria-label="Sonraki ay">
          ›
        </button>
        <button
          className="dgm sessiz"
          onClick={() => {
            setAyBasi(new Date(bugun.getFullYear(), bugun.getMonth(), 1))
            setSeciliGun(bugun)
          }}
        >
          Bugüne dön
        </button>
      </div>

      <div className="izgara">
        {GUNLER_KISA.map((g) => (
          <div className="izgara-bas" key={g}>
            {g}
          </div>
        ))}

        {izgara.map((d) => {
          const isler = gunun(d)
          const disay = d.getMonth() !== ayBasi.getMonth()
                  return (
            <button
              key={d.toISOString()}
              className={
                'hucre' +
                (disay ? ' disay' : '') +
                (ayniGun(d, seciliGun) ? ' secili' : '') +
                (ayniGun(d, bugun) ? ' bugun' : '')
              }
              onClick={() => setSeciliGun(d)}
              onDoubleClick={() => onDuzenle({ BASLANGIC: `${isoGun(d)}T09:00:00` })}
            >
              <span className="gun-no">{d.getDate()}</span>
              {isler.slice(0, 3).map((g) => (
                <span className={`hucre-satir${g.DURUM === 1 ? ' bitti' : ''}`} key={g.ID}>
                  {g.BASLIK}
                </span>
              ))}
              {isler.length > 3 && <span className="hucre-satir">+{isler.length - 3} tane daha</span>}
            </button>
          )
        })}
      </div>

      <h2 className="bolum-basligi">
        {gunMetni(seciliGun)} · {haftaninGunu(seciliGun)}
      </h2>

      {secilenler.length === 0 ? (
        <Bos metin="Bu güne henüz bir şey yazılmamış. Hücreye çift tıklayarak hızlıca ekleyebilirsiniz." />
      ) : (
        <ul className="gorev-listesi">
          {secilenler.map((g) => (
            <GorevSatiri key={g.ID} gorev={g} onTamamla={tamamla} onDuzenle={onDuzenle} onSil={sil} onErtele={ertele} />
          ))}
        </ul>
      )}
    </>
  )
}
