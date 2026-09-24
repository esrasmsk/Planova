import { useEffect, useState } from 'react'
import type { Etiket, Gorev } from '../types'
import { UYARI_SECENEKLERI, coz, isoGun } from '../tarih'

interface Props {
  gorev: Partial<Gorev> | null
  varsayilanTarih: Date
  etiketler: Etiket[]
  onKapat: () => void
  onKaydedildi: () => void
}

const iki = (n: number): string => String(n).padStart(2, '0')

export default function GorevModal({
  gorev,
  varsayilanTarih,
  etiketler,
  onKapat,
  onKaydedildi
}: Props): JSX.Element {
  const mevcut = coz(gorev?.BASLANGIC ?? null) ?? varsayilanTarih

  const [baslik, setBaslik] = useState(gorev?.BASLIK ?? '')
  const [detay, setDetay] = useState(gorev?.DETAY ?? '')
  const [tarih, setTarih] = useState(isoGun(mevcut))
  const [saat, setSaat] = useState(`${iki(mevcut.getHours() || 9)}:${iki(mevcut.getMinutes())}`)
  const [tumGun, setTumGun] = useState(Boolean(gorev?.TUM_GUN))
  const [oncelik, setOncelik] = useState(Number(gorev?.ONCELIK ?? 1))
  const [tekrar, setTekrar] = useState(gorev?.TEKRAR_TIP ?? 'YOK')
  const [aralik, setAralik] = useState(Number(gorev?.TEKRAR_ARALIK ?? 1))
  const [tekrarBitis, setTekrarBitis] = useState(
    gorev?.TEKRAR_BITIS ? isoGun(coz(gorev.TEKRAR_BITIS)!) : ''
  )
  const [secilenEtiketler, setSecilenEtiketler] = useState<number[]>(
    (gorev?.etiketler ?? []).map((e) => e.ID)
  )
  const [uyarilar, setUyarilar] = useState<number[]>(
    gorev?.uyarilar?.length ? gorev.uyarilar.map((u) => u.DK_ONCE) : [1440, 180]
  )
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [hata, setHata] = useState('')

  useEffect(() => {
    const esc = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onKapat()
    }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onKapat])

  function degistir<T>(liste: T[], deger: T): T[] {
    return liste.includes(deger) ? liste.filter((x) => x !== deger) : [...liste, deger]
  }

  async function kaydet(): Promise<void> {
    if (!baslik.trim()) {
      setHata('Görev için bir başlık yazın.')
      return
    }
    setKaydediliyor(true)
    setHata('')
    try {
      await window.api.task.save({
        ID: gorev?.ID ?? 0,
        BASLIK: baslik.trim(),
        DETAY: detay.trim() || null,
        BASLANGIC: `${tarih}T${tumGun ? '00:00' : saat}:00`,
        BITIS: null,
        TUM_GUN: tumGun ? 1 : 0,
        ONCELIK: oncelik,
        RENK: null,
        TEKRAR_TIP: tekrar,
        TEKRAR_ARALIK: aralik,
        TEKRAR_BITIS: tekrarBitis || null,
        etiketIdler: secilenEtiketler,
        uyariDakikalari: uyarilar
      })
      onKaydedildi()
    } catch (err: any) {
      setHata(String(err?.message ?? err))
      setKaydediliyor(false)
    }
  }

  return (
    <div className="perde" onMouseDown={(e) => e.target === e.currentTarget && onKapat()}>
      <div className="kart" role="dialog" aria-modal="true">
        <h2>{gorev?.ID ? 'Görevi düzenle' : 'Yeni görev'}</h2>

        <label className="etiketli" htmlFor="g-baslik">
          Ne yapılacak
        </label>
        <input
          id="g-baslik"
          className="alan"
          value={baslik}
          autoFocus
          onChange={(e) => setBaslik(e.target.value)}
          placeholder="Örn. Mali müşavire e-fatura mutabakatı gönder"
        />

        <div style={{ height: 14 }} />

        <label className="etiketli" htmlFor="g-detay">
          Notlar
        </label>
        <textarea
          id="g-detay"
          className="alan"
          rows={3}
          value={detay ?? ''}
          onChange={(e) => setDetay(e.target.value)}
        />

        <hr className="ayrac" />

        <div className="satir-2">
          <div>
            <label className="etiketli" htmlFor="g-tarih">
              Tarih
            </label>
            <input
              id="g-tarih"
              className="alan"
              type="date"
              value={tarih}
              onChange={(e) => setTarih(e.target.value)}
            />
          </div>
          <div>
            <label className="etiketli" htmlFor="g-saat">
              Saat
            </label>
            <input
              id="g-saat"
              className="alan"
              type="time"
              value={saat}
              disabled={tumGun}
              onChange={(e) => setSaat(e.target.value)}
            />
          </div>
        </div>

        <div style={{ marginTop: 10, display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
            <input type="checkbox" checked={tumGun} onChange={(e) => setTumGun(e.target.checked)} />
            Tüm gün
          </label>

          <div className="secim-seridi">
            {[
              { v: 0, ad: 'Düşük' },
              { v: 1, ad: 'Normal' },
              { v: 2, ad: 'Önemli' }
            ].map((o) => (
              <button
                key={o.v}
                className={`secim${oncelik === o.v ? ' acik' : ''}`}
                onClick={() => setOncelik(o.v)}
              >
                {o.ad}
              </button>
            ))}
          </div>
        </div>

        <hr className="ayrac" />

        <label className="etiketli">Hatırlat</label>
        <div className="secim-seridi">
          {UYARI_SECENEKLERI.map((u) => (
            <button
              key={u.dk}
              className={`secim${uyarilar.includes(u.dk) ? ' acik' : ''}`}
              onClick={() => setUyarilar(degistir(uyarilar, u.dk))}
            >
              {u.ad}
            </button>
          ))}
        </div>

        <hr className="ayrac" />

        <label className="etiketli">Etiketler</label>
        <div className="secim-seridi">
          {etiketler.length === 0 && <span className="bos">Henüz etiket yok. Ayarlar bölümünden ekleyin.</span>}
          {etiketler.map((e) => (
            <button
              key={e.ID}
              className={`secim etiket-secim${secilenEtiketler.includes(e.ID) ? ' acik' : ''}`}
              onClick={() => setSecilenEtiketler(degistir(secilenEtiketler, e.ID))}
              style={
                secilenEtiketler.includes(e.ID) ? { background: e.RENK, borderColor: e.RENK, color: '#fffdf6' } : {}
              }
            >
              {e.AD}
            </button>
          ))}
        </div>

        <hr className="ayrac" />

        <div className="satir-2">
          <div>
            <label className="etiketli" htmlFor="g-tekrar">
              Tekrar
            </label>
            <select
              id="g-tekrar"
              className="alan"
              value={tekrar}
              onChange={(e) => setTekrar(e.target.value)}
            >
              <option value="YOK">Tekrarlanmasın</option>
              <option value="GUNLUK">Her gün</option>
              <option value="HAFTALIK">Her hafta</option>
              <option value="AYLIK">Her ay</option>
              <option value="YILLIK">Her yıl</option>
            </select>
          </div>
          {tekrar !== 'YOK' && (
            <div>
              <label className="etiketli" htmlFor="g-aralik">
                Kaç {tekrar === 'GUNLUK' ? 'günde' : tekrar === 'HAFTALIK' ? 'haftada' : tekrar === 'AYLIK' ? 'ayda' : 'yılda'} bir
              </label>
              <input
                id="g-aralik"
                className="alan"
                type="number"
                min={1}
                value={aralik}
                onChange={(e) => setAralik(Number(e.target.value))}
              />
            </div>
          )}
        </div>

        {tekrar !== 'YOK' && (
          <div style={{ marginTop: 12 }}>
            <label className="etiketli" htmlFor="g-tbitis">
              Şu tarihten sonra dursun (boş bırakılabilir)
            </label>
            <input
              id="g-tbitis"
              className="alan"
              type="date"
              value={tekrarBitis}
              onChange={(e) => setTekrarBitis(e.target.value)}
            />
          </div>
        )}

        {hata && (
          <p style={{ color: 'var(--kil)', marginTop: 14 }}>{hata}</p>
        )}

        <div className="kart-alt">
          <button className="dgm" onClick={onKapat}>
            Vazgeç
          </button>
          <button className="dgm birincil" onClick={() => void kaydet()} disabled={kaydediliyor}>
            {kaydediliyor ? 'Kaydediliyor' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  )
}
