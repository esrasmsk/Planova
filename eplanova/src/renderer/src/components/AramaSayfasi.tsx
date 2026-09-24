import { useEffect, useState } from 'react'
import { Bos } from './Ortak'
import { coz } from '../tarih'

interface Sonuc {
  gorevler: any[]
  notlar: any[]
  sayfalar: any[]
  stickyler: any[]
}

const BOS: Sonuc = { gorevler: [], notlar: [], sayfalar: [], stickyler: [] }

interface Props {
  onGunSec: (d: Date) => void
}

export default function AramaSayfasi({ onGunSec }: Props): JSX.Element {
  const [metin, setMetin] = useState('')
  const [sonuc, setSonuc] = useState<Sonuc>(BOS)
  const [arandi, setArandi] = useState(false)

  useEffect(() => {
    if (metin.trim().length < 2) {
      setSonuc(BOS)
      setArandi(false)
      return
    }
    const t = setTimeout(async () => {
      setSonuc(await window.api.search(metin))
      setArandi(true)
    }, 300)
    return () => clearTimeout(t)
  }, [metin])

  const toplam = sonuc.gorevler.length + sonuc.sayfalar.length + sonuc.stickyler.length

  return (
    <>
      <input
        className="alan"
        style={{ fontSize: 17, padding: '11px 14px' }}
        value={metin}
        autoFocus
        onChange={(e) => setMetin(e.target.value)}
        placeholder="Görevlerde, notlarda ve yapışkan notlarda ara"
      />

      {!arandi && <Bos metin="En az iki harf yazın." />}

      {arandi && toplam === 0 && <Bos metin={`"${metin}" hiçbir yerde geçmiyor.`} />}

      {sonuc.gorevler.length > 0 && (
        <>
          <h2 className="bolum-basligi">Görevler</h2>
          <ul className="gorev-listesi">
            {sonuc.gorevler.map((g) => {
              const d = coz(g.BASLANGIC)
              return (
                <li className="gorev" key={`g${g.ID}`}>
                  <span className="saat">{d ? `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}` : ''}</span>
                  <div className="gorev-govde">
                    <div className="gorev-baslik">{g.BASLIK}</div>
                    {g.DETAY && <div className="gorev-alt">{String(g.DETAY).slice(0, 120)}</div>}
                  </div>
                  {d && (
                    <button className="dgm sessiz" onClick={() => onGunSec(d)}>
                      Takvimde göster
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </>
      )}

      {sonuc.sayfalar.length > 0 && (
        <>
          <h2 className="bolum-basligi">Kişisel notlar</h2>
          <ul className="gorev-listesi">
            {sonuc.sayfalar.map((s) => (
              <li className="gorev" key={`s${s.ID}`}>
                <div className="gorev-govde">
                  <div className="gorev-baslik">
                    {s.OZEL ? '🔒 ' : ''}
                    {s.BASLIK}
                  </div>
                  {!s.OZEL && <div className="gorev-alt">{String(s.ICERIK ?? '').slice(0, 160)}</div>}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {sonuc.stickyler.length > 0 && (
        <>
          <h2 className="bolum-basligi">Yapışkan notlar</h2>
          <ul className="gorev-listesi">
            {sonuc.stickyler.map((y) => (
              <li className="gorev" key={`y${y.ID}`}>
                <span className="nokta" style={{ background: y.RENK, width: 12, height: 12, borderRadius: 2, marginTop: 8 }} />
                <div className="gorev-govde">
                  <div className="gorev-alt">{String(y.ICERIK ?? '').slice(0, 200)}</div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  )
}
