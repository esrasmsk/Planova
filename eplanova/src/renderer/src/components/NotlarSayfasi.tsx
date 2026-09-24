import { useEffect, useRef, useState } from 'react'
import type { AppConfig, Sayfa } from '../types'
import { onayIste } from './Ortak'

interface Props {
  config: AppConfig | null
  yenile: number
}

export default function NotlarSayfasi({ config, yenile }: Props): JSX.Element {
  const [sayfalar, setSayfalar] = useState<Sayfa[]>([])
  const [aktif, setAktif] = useState<Sayfa | null>(null)
  const [baslik, setBaslik] = useState('')
  const [icerik, setIcerik] = useState('')
  const [ozel, setOzel] = useState(false)
  const [durum, setDurum] = useState('')
  const [kilitAcik, setKilitAcik] = useState(false)
  const [pinGirdi, setPinGirdi] = useState('')
  const [pinHata, setPinHata] = useState('')
  const ilk = useRef(true)

  const pinVar = Boolean(config?.pin)

  useEffect(() => {
    void listele()
  }, [yenile])

  async function listele(): Promise<void> {
    setSayfalar(await window.api.page.list())
  }

  async function ac(s: Sayfa): Promise<void> {
    if (s.OZEL && pinVar && !kilitAcik) {
      setAktif(s)
      setBaslik(s.BASLIK)
      setIcerik('')
      setOzel(true)
      return
    }
    const tam = await window.api.page.get(s.ID)
    ilk.current = true
    setAktif(tam)
    setBaslik(tam?.BASLIK ?? '')
    setIcerik(tam?.ICERIK ?? '')
    setOzel(Boolean(tam?.OZEL))
    setDurum('')
    setTimeout(() => (ilk.current = false), 0)
  }

  async function yeni(): Promise<void> {
    const id = await window.api.page.save({ BASLIK: 'Başlıksız sayfa', ICERIK: '', OZEL: 0 })
    await listele()
    const tam = await window.api.page.get(id)
    ilk.current = true
    setAktif(tam)
    setBaslik(tam?.BASLIK ?? '')
    setIcerik('')
    setOzel(false)
    setTimeout(() => (ilk.current = false), 0)
  }

  async function sil(): Promise<void> {
    if (!aktif) return
    if (!(await onayIste(`"${aktif.BASLIK}" sayfası silinsin mi?`))) return
    await window.api.page.remove(aktif.ID)
    setAktif(null)
    await listele()
  }

  useEffect(() => {
    if (!aktif || ilk.current) return
    if (aktif.OZEL && pinVar && !kilitAcik) return
    setDurum('Yazılıyor…')
    const t = setTimeout(async () => {
      await window.api.page.save({ ID: aktif.ID, BASLIK: baslik || 'Başlıksız sayfa', ICERIK: icerik, OZEL: ozel ? 1 : 0 })
      setDurum('Kaydedildi')
      void listele()
    }, 700)
    return () => clearTimeout(t)
  }, [baslik, icerik, ozel])

  function pinDene(): void {
    if (pinGirdi === config?.pin) {
      setKilitAcik(true)
      setPinHata('')
      setPinGirdi('')
      if (aktif) void ac(aktif)
    } else {
      setPinHata('PIN doğru değil.')
    }
  }

  const kilitli = Boolean(aktif?.OZEL) && pinVar && !kilitAcik

  return (
    <div className="not-duzeni">
      <div className="not-liste">
        <button className="dgm birincil" style={{ width: '100%', marginBottom: 12 }} onClick={() => void yeni()}>
          Yeni sayfa
        </button>

        {sayfalar.length === 0 && <p className="bos">Henüz sayfa yok.</p>}

        {sayfalar.map((s) => (
          <button
            key={s.ID}
            className={`not-ogesi${aktif?.ID === s.ID ? ' aktif' : ''}`}
            onClick={() => void ac(s)}
          >
            <b>
              {s.OZEL ? '🔒 ' : ''}
              {s.BASLIK}
            </b>
            <span>{s.GUNCELLEME ? String(s.GUNCELLEME).slice(0, 10).split('-').reverse().join('.') : 'yeni'}</span>
          </button>
        ))}
      </div>

      <div className="not-govde">
        {!aktif ? (
          <p className="bos">Soldan bir sayfa seçin ya da yeni bir sayfa açın.</p>
        ) : kilitli ? (
          <div className="kilit-perde">
            <p className="bos" style={{ padding: 0 }}>
              Bu sayfa kişisel olarak işaretli. Açmak için PIN girin.
            </p>
            <input
              className="alan"
              style={{ maxWidth: 200, textAlign: 'center', letterSpacing: 4 }}
              type="password"
              value={pinGirdi}
              onChange={(e) => setPinGirdi(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && pinDene()}
            />
            {pinHata && <span style={{ color: 'var(--kil)' }}>{pinHata}</span>}
            <button className="dgm birincil" onClick={pinDene}>
              Sayfayı aç
            </button>
          </div>
        ) : (
          <>
            <div className="takvim-ust">
              <input
                className="alan"
                style={{ fontFamily: 'var(--baslik)', fontSize: 22, fontWeight: 600, border: 0, background: 'transparent', padding: 0 }}
                value={baslik}
                onChange={(e) => setBaslik(e.target.value)}
                placeholder="Sayfa başlığı"
              />
              <label style={{ display: 'flex', gap: 6, alignItems: 'center', whiteSpace: 'nowrap', fontSize: 12 }}>
                <input type="checkbox" checked={ozel} onChange={(e) => setOzel(e.target.checked)} />
                Kişisel
              </label>
              <button className="dgm tehlike" onClick={() => void sil()}>
                Sil
              </button>
            </div>

            <textarea
              className="not-icerik"
              value={icerik}
              maxLength={8000}
              onChange={(e) => setIcerik(e.target.value)}
              placeholder="Buraya yazın…"
            />

            <p className="bos" style={{ padding: '6px 0', fontSize: 12 }}>
              {durum} · {icerik.length}/8000 karakter
              {ozel && !pinVar && ' · PIN tanımlamak için Ayarlar bölümüne bakın'}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
