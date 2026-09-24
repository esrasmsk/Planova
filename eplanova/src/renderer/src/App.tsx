import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { AppConfig, Etiket, Gorev, Sekme } from './types'
import { gunMetni, haftaninGunu } from './tarih'
import BugunSayfasi from './components/BugunSayfasi'
import TakvimSayfasi from './components/TakvimSayfasi'
import YapiskanPano from './components/YapiskanPano'
import NotlarSayfasi from './components/NotlarSayfasi'
import AramaSayfasi from './components/AramaSayfasi'
import AyarlarSayfasi from './components/AyarlarSayfasi'
import GorevModal from './components/GorevModal'
import { OnayKutusu } from './components/Ortak'
import CikartmaKatmani from './components/CikartmaKatmani'
import HatirlatmaPenceresi, { type Bildirim } from './components/HatirlatmaPenceresi'
import SekmeSimgesi from './sekmeSimgeleri'
import { type SayfaCevirme, cevirmeyeHazirla, sayfayiCevir } from './sayfaCevir'

interface SekmeTanim {
  kod: Sekme
  ad: string
  emoji: string
  renk: string
  cizgili: boolean
  marjli: boolean
}

const SEKMELER: SekmeTanim[] = [
  { kod: 'bugun', emoji: '☀️', ad: 'Bugün', renk: 'var(--kil)', cizgili: true, marjli: true },
  { kod: 'takvim', emoji: '📅', ad: 'Takvim', renk: 'var(--mavi)', cizgili: false, marjli: false },
  { kod: 'yapiskan', emoji: '📌', ad: 'Pano', renk: 'var(--hardal)', cizgili: false, marjli: false },
  { kod: 'notlar', emoji: '📝', ad: 'Notlar', renk: 'var(--adaci)', cizgili: false, marjli: false },
  { kod: 'arama', emoji: '🔍', ad: 'Ara', renk: 'var(--zeytin)', cizgili: false, marjli: false },
  { kod: 'ayarlar', emoji: '⚙️', ad: 'Ayarlar', renk: 'var(--ayar-renk, #6d7278)', cizgili: false, marjli: false }
]

export default function App(): JSX.Element {
  const [sekme, setSekme] = useState<Sekme>('bugun')

  // Sayfa gecisi: sekme degismeden once eski sayfanin kopyasi alinir,
  // yeni sayfa ekrana cizilmeden once (useLayoutEffect) gecis animasyonu baslar.
  const sayfaRef = useRef<HTMLDivElement>(null)
  const cevirme = useRef<SayfaCevirme | null>(null)
  const gosterilenSekme = useRef<Sekme>('bugun')

  function sekmeDegistir(yeni: Sekme): void {
    if (yeni === gosterilenSekme.current) return
    if (sayfaRef.current) cevirme.current = cevirmeyeHazirla(sayfaRef.current)
    setCikartmaPaleti(false)
    setSekme(yeni)
  }

  useLayoutEffect(() => {
    const onceki = gosterilenSekme.current
    gosterilenSekme.current = sekme
    const c = cevirme.current
    cevirme.current = null
    if (!c || !sayfaRef.current || onceki === sekme) return
    sayfayiCevir(c, sayfaRef.current)
  }, [sekme])

  const [seciliGun, setSeciliGun] = useState(new Date())
  const [etiketler, setEtiketler] = useState<Etiket[]>([])
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [ozet, setOzet] = useState({ acik: 0, bugun: 0, geciken: 0 })
  const [yenile, setYenile] = useState(0)
  const [modal, setModal] = useState<Partial<Gorev> | null | false>(false)
  const [bildirimler, setBildirimler] = useState<Bildirim[]>([])
  const [cikartmaPaleti, setCikartmaPaleti] = useState(false)

  const tetikle = useCallback(() => setYenile((n) => n + 1), [])

  const etiketleriYenile = useCallback(async () => {
    try {
      setEtiketler(await window.api.tag.list())
    } catch {
      /* baglanti yoksa bos kalsin */
    }
  }, [])

  useEffect(() => {
    void (async () => {
      setConfig(await window.api.config.get())
      await etiketleriYenile()
    })()
  }, [etiketleriYenile])

  useEffect(() => {
    void (async () => {
      try {
        setOzet(await window.api.stats())
      } catch {
        /* yoksay */
      }
    })()
  }, [yenile])

  useEffect(() => {
    const b1 = window.api.onDataChanged(tetikle)
    const b2 = window.api.onReminder((v) => {
      setBildirimler((o) => [
        ...o,
        {
          anahtar: Date.now() + Math.random(),
          gorevId: Number(v.gorevId),
          baslik: v.baslik,
          kalan: v.kalan,
          detay: v.detay ?? null,
          zaman: v.zaman ?? null
        }
      ])
    })
    const b3 = window.api.onReminderOpen(async (v) => {
      try {
        const g = await window.api.task.get(v.gorevId)
        if (g) setModal(g)
      } catch {
        /* gorev silinmis ya da baglanti yoksa acma */
      }
    })
    return () => {
      b1()
      b2()
      b3()
    }
  }, [tetikle])

  useEffect(() => {
    const kisayol = (e: KeyboardEvent): void => {
      if (e.ctrlKey && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        setModal(null)
      }
      if (e.ctrlKey && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        sekmeDegistir('arama')
      }
    }
    window.addEventListener('keydown', kisayol)
    return () => window.removeEventListener('keydown', kisayol)
  }, [])

  const aktif = SEKMELER.find((s) => s.kod === sekme)!
  // Cikartmalarin hangi sayfaya ait oldugu: sayfa basina bir alan
  const cikartmaBaglami: string | null =
    sekme === 'bugun' || sekme === 'takvim' || sekme === 'notlar' ? sekme : sekme === 'yapiskan' ? 'pano' : null

  const basliklar: Record<Sekme, { h1: string; alt: string }> = {
    bugun: { h1: gunMetni(new Date()), alt: `${haftaninGunu(new Date())} · ${ozet.acik} açık iş` },
    takvim: { h1: 'Takvim', alt: 'Bir güne çift tıklayarak hızlıca görev ekleyin' },
    yapiskan: { h1: 'Pano', alt: 'Kalıcı hatırlatmalar ve dağınık fikirler' },
    notlar: { h1: 'Notlar', alt: 'Kişisel sayfalar ve uzun yazılar' },
    arama: { h1: 'Ara', alt: 'Defterin tamamında arama' },
    ayarlar: { h1: 'Ayarlar', alt: window.api.platform === 'mobil' ? 'Etiketler ve PIN' : 'Bağlantı, etiketler ve PIN' }
  }

  return (
    <div className={`masa tema-${config?.tema ?? 'klasik'}`}>
      <div className="defter">
        <div className="sirt" aria-hidden="true">
          {Array.from({ length: 16 }, (_, i) => (
            <span className="halka" key={i} />
          ))}
        </div>

        <div className="sayfa-yigini">
          <div className="delikler" aria-hidden="true">
            {Array.from({ length: 16 }, (_, i) => (
              <span className="delik" key={i} />
            ))}
          </div>

          <div
            ref={sayfaRef}
            className={`sayfa${aktif.cizgili ? ' cizgili' : ''}${aktif.marjli ? ' marjli' : ''}`}
          >
            <header className="sayfa-basi">
              <div>
                <h1>{basliklar[sekme].h1}</h1>
                <p className="altyazi">{basliklar[sekme].alt}</p>
              </div>
              <div className="bas-sag">
                {cikartmaBaglami && (
                  <button
                    className={`dgm${cikartmaPaleti ? ' acik' : ''}`}
                    onClick={() => setCikartmaPaleti((a) => !a)}
                    aria-pressed={cikartmaPaleti}
                  >
                    Çıkartma
                  </button>
                )}
                {sekme !== 'ayarlar' && sekme !== 'arama' && (
                  <button className="dgm birincil" onClick={() => setModal(null)}>
                    Görev ekle
                  </button>
                )}
              </div>
            </header>

            <div className="sayfa-govde">
              {sekme === 'bugun' && (
                <BugunSayfasi
                  etiketler={etiketler}
                  yenile={yenile}
                  onDuzenle={(g) => setModal(g)}
                  onDegisti={tetikle}
                />
              )}

              {sekme === 'takvim' && (
                <TakvimSayfasi
                  seciliGun={seciliGun}
                  setSeciliGun={setSeciliGun}
                  yenile={yenile}
                  onDuzenle={(g) => setModal(g)}
                  onDegisti={tetikle}
                />
              )}

              {sekme === 'yapiskan' && <YapiskanPano yenile={yenile} />}

              {sekme === 'notlar' && <NotlarSayfasi config={config} yenile={yenile} />}

              {sekme === 'arama' && (
                <AramaSayfasi
                  onGunSec={(d) => {
                    setSeciliGun(d)
                    sekmeDegistir('takvim')
                  }}
                />
              )}

              {sekme === 'ayarlar' && (
                <AyarlarSayfasi
                  config={config}
                  setConfig={setConfig}
                  etiketler={etiketler}
                  etiketleriYenile={() => void etiketleriYenile()}
                />
              )}

              <CikartmaKatmani
                baglam={cikartmaBaglami}
                paletAcik={cikartmaPaleti}
                onPaletKapat={() => setCikartmaPaleti(false)}
              />
            </div>

            <footer className="durum-cubugu">
              <span>{ozet.acik} açık</span>
              <span>{ozet.bugun} bugün</span>
              {ozet.geciken > 0 && <span style={{ color: 'var(--kil)' }}>{ozet.geciken} gecikmiş</span>}
              <span style={{ marginLeft: 'auto' }}>Ctrl+N yeni görev · Ctrl+F ara</span>
            </footer>
          </div>
        </div>

        <nav className="sekmeler">
          {SEKMELER.map((s) => (
            <button
              key={s.kod}
              className={`sekme${sekme === s.kod ? ' aktif' : ''}`}
              style={{ ['--sekme-renk' as any]: s.renk }}
              onClick={() => sekmeDegistir(s.kod)}
            >
              {s.kod === 'bugun' && ozet.geciken > 0 && <span className="rozet">{ozet.geciken}</span>}
              {/* Renkli temada emoji, klasik (kurumsal) temada cizgi simgesi gorunur */}
              <span className="sekme-emoji" aria-hidden="true">
                {s.emoji}
              </span>
              <SekmeSimgesi kod={s.kod} />
              {s.ad}
            </button>
          ))}
        </nav>
      </div>

      {modal !== false && (
        <GorevModal
          gorev={modal}
          varsayilanTarih={seciliGun}
          etiketler={etiketler}
          onKapat={() => setModal(false)}
          onKaydedildi={() => {
            setModal(false)
            tetikle()
          }}
        />
      )}

      <OnayKutusu />

      <HatirlatmaPenceresi
        bildirimler={bildirimler}
        sesAcik={config?.alarmSesi !== false}
        onKapat={(anahtar) => setBildirimler((o) => o.filter((x) => x.anahtar !== anahtar))}
        onAc={async (b) => {
          setBildirimler((o) => o.filter((x) => x.anahtar !== b.anahtar))
          try {
            const g = await window.api.task.get(b.gorevId)
            if (g) setModal(g)
          } catch {
            /* gorev silinmis olabilir */
          }
        }}
      />
    </div>
  )
}
