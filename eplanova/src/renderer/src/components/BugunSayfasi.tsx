import { useEffect, useState } from 'react'
import type { Etiket, Gorev } from '../types'
import { Bos, GorevSatiri, onayIste } from './Ortak'
import { AYLAR, GUNLER_KISA, coz, gunEkle, isoGun, saatMetni } from '../tarih'

interface Props {
  etiketler: Etiket[]
  yenile: number
  onDuzenle: (g: Partial<Gorev> | null) => void
  onDegisti: () => void
}

/** Bugunden sonraki takvim ayinin ilk ve son gunu. */
function gelecekAyAraligi(b: Date): { ilk: Date; son: Date } {
  return {
    ilk: new Date(b.getFullYear(), b.getMonth() + 1, 1),
    son: new Date(b.getFullYear(), b.getMonth() + 2, 0)
  }
}

/** "3 Ekim Cmt" */
function maddeTarihi(d: Date): string {
  return `${d.getDate()} ${AYLAR[d.getMonth()]} ${GUNLER_KISA[(d.getDay() + 6) % 7]}`
}

export default function BugunSayfasi({ etiketler, yenile, onDuzenle, onDegisti }: Props): JSX.Element {
  const [geciken, setGeciken] = useState<Gorev[]>([])
  const [bugun, setBugun] = useState<Gorev[]>([])
  const [yarin, setYarin] = useState<Gorev[]>([])
  const [gelecekAy, setGelecekAy] = useState<Gorev[]>([])
  const [etiketFiltre, setEtiketFiltre] = useState<number | null>(null)

  useEffect(() => {
    void yukle()
  }, [yenile, etiketFiltre])

  async function yukle(): Promise<void> {
    const b = new Date()
    const bIso = isoGun(b)
    const ortak = etiketFiltre ? { etiketId: etiketFiltre } : {}
    const ay = gelecekAyAraligi(b)

    const [gec, bug, yar, gay] = await Promise.all([
      window.api.task.list({ ...ortak, bitis: isoGun(gunEkle(b, -1)), durum: 0 }),
      window.api.task.list({ ...ortak, baslangic: bIso, bitis: bIso }),
      window.api.task.list({ ...ortak, baslangic: isoGun(gunEkle(b, 1)), bitis: isoGun(gunEkle(b, 7)), durum: 0 }),
      window.api.task.list({ ...ortak, baslangic: isoGun(ay.ilk), bitis: isoGun(ay.son) })
    ])
    setGeciken(gec)
    setBugun(bug)
    setYarin(yar)
    setGelecekAy(gay)
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

  const props = { onTamamla: tamamla, onDuzenle, onSil: sil, onErtele: ertele }
  const acikBugun = bugun.filter((g) => g.DURUM === 0)
  const bitenBugun = bugun.filter((g) => g.DURUM === 1)
  const ayAdi = gelecekAyAraligi(new Date()).ilk

  return (
    <>
      <div className="secim-seridi">
        <button className={`secim etiket-secim${etiketFiltre === null ? ' acik' : ''}`} onClick={() => setEtiketFiltre(null)}>
          Tümü
        </button>
        {etiketler.map((e) => (
          <button
            key={e.ID}
            className={`secim etiket-secim${etiketFiltre === e.ID ? ' acik' : ''}`}
            onClick={() => setEtiketFiltre(etiketFiltre === e.ID ? null : e.ID)}
            style={etiketFiltre === e.ID ? { background: e.RENK, borderColor: e.RENK, color: '#fffdf6' } : {}}
          >
            {e.AD}
          </button>
        ))}
      </div>

      {geciken.length > 0 && (
        <>
          <h2 className="bolum-basligi fosfor-pembe">
            Günü geçmiş
          </h2>
          <ul className="gorev-listesi">
            {geciken.map((g) => (
              <GorevSatiri key={g.ID} gorev={g} tarihGoster {...props} />
            ))}
          </ul>
        </>
      )}

      <h2 className="bolum-basligi fosfor-sari">Bugün</h2>
      {acikBugun.length === 0 && bitenBugun.length === 0 ? (
        <Bos metin="Bugün için kayıt yok. Yeni bir görev ekleyebilirsiniz." />
      ) : (
        <ul className="gorev-listesi">
          {acikBugun.map((g) => (
            <GorevSatiri key={g.ID} gorev={g} {...props} />
          ))}
          {bitenBugun.map((g) => (
            <GorevSatiri key={g.ID} gorev={g} {...props} />
          ))}
        </ul>
      )}

      <h2 className="bolum-basligi fosfor-yesil">Önümüzdeki yedi gün</h2>
      {yarin.length === 0 ? (
        <Bos metin="Bu hafta başka bir şey planlanmamış." />
      ) : (
        <ul className="gorev-listesi">
          {yarin.map((g) => (
            <GorevSatiri key={g.ID} gorev={g} tarihGoster {...props} />
          ))}
        </ul>
      )}

      <h2 className="bolum-basligi fosfor-mavi">
        Önümüzdeki ay
        <span className="bolum-alt">
          {AYLAR[ayAdi.getMonth()]} {ayAdi.getFullYear()}
        </span>
      </h2>
      {gelecekAy.length === 0 ? (
        <Bos metin="Önümüzdeki ay için planlanmış görev yok." />
      ) : (
        <ul className="madde-listesi">
          {gelecekAy.map((g) => {
            const d = coz(g.BASLANGIC)
            return (
              <li key={g.ID} className={g.DURUM === 1 ? 'bitti' : ''}>
                <button className="madde" onClick={() => onDuzenle(g)} title="Düzenlemek için tıklayın">
                  <span className="madde-tarih">{d ? maddeTarihi(d) : ''}</span>
                  <span className="madde-saat">{g.TUM_GUN ? 'tüm gün' : saatMetni(g.BASLANGIC)}</span>
                  <span className="madde-baslik">{g.BASLIK}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
