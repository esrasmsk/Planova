import { useEffect, useState } from 'react'
import type { AppConfig, Etiket } from '../types'
import { onayIste } from './Ortak'
import { alarmDene } from '../alarmSesi'

interface Props {
  config: AppConfig | null
  setConfig: (c: AppConfig) => void
  etiketler: Etiket[]
  etiketleriYenile: () => void
}

const ETIKET_RENKLERI = ['#d9a441', '#7d9a72', '#c06c52', '#4f7d9e', '#7e5a7b', '#99954f']

export default function AyarlarSayfasi({
  config,
  setConfig,
  etiketler,
  etiketleriYenile
}: Props): JSX.Element {
  const [form, setForm] = useState<AppConfig | null>(config)
  const [mesaj, setMesaj] = useState('')
  const [yeniEtiket, setYeniEtiket] = useState('')
  const [yeniRenk, setYeniRenk] = useState(ETIKET_RENKLERI[0])
  const [pin1, setPin1] = useState('')
  const [pin2, setPin2] = useState('')

  useEffect(() => setForm(config), [config])

  if (!form) return <p className="bos">Ayarlar yükleniyor.</p>

  function yaz<K extends keyof AppConfig>(k: K, v: AppConfig[K]): void {
    setForm({ ...(form as AppConfig), [k]: v })
  }

  async function testEt(): Promise<void> {
    setMesaj('Deneniyor…')
    const r = await window.api.config.test(form as AppConfig)
    setMesaj(r.mesaj)
  }

  async function kaydet(): Promise<void> {
    const c = await window.api.config.save(form as AppConfig)
    setConfig(c)
    const r = await window.api.config.reconnect()
    setMesaj(r.mesaj)
  }

  async function etiketEkle(): Promise<void> {
    if (!yeniEtiket.trim()) return
    await window.api.tag.save({ AD: yeniEtiket.trim(), RENK: yeniRenk })
    setYeniEtiket('')
    etiketleriYenile()
  }

  async function etiketSil(id: number): Promise<void> {
    if (!(await onayIste('Etiket silinsin mi? Görevlerden de kaldırılır.'))) return
    await window.api.tag.remove(id)
    etiketleriYenile()
  }

  async function pinKaydet(): Promise<void> {
    if (pin1 !== pin2) {
      setMesaj('İki PIN aynı değil.')
      return
    }
    const c = await window.api.config.save({ pin: pin1 || null })
    setConfig(c)
    setPin1('')
    setPin2('')
    setMesaj(pin1 ? 'PIN ayarlandı.' : 'PIN kaldırıldı.')
  }

  return (
    <>
      {window.api.platform === 'masaustu' && (
        <>
          <h2 className="bolum-basligi" style={{ marginTop: 0 }}>
            Firebird bağlantısı
          </h2>

          <div className="satir-2">
            <div>
              <label className="etiketli" htmlFor="a-host">
                Sunucu
              </label>
              <input id="a-host" className="alan" value={form.host} onChange={(e) => yaz('host', e.target.value)} />
            </div>
            <div>
              <label className="etiketli" htmlFor="a-port">
                Port
              </label>
              <input
                id="a-port"
                className="alan"
                type="number"
                value={form.port}
                onChange={(e) => yaz('port', Number(e.target.value))}
              />
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <label className="etiketli" htmlFor="a-db">
              Veritabanı yolu
            </label>
            <input id="a-db" className="alan" value={form.database} onChange={(e) => yaz('database', e.target.value)} />
          </div>

          <div className="satir-2" style={{ marginTop: 12 }}>
            <div>
              <label className="etiketli" htmlFor="a-user">
                Kullanıcı
              </label>
              <input id="a-user" className="alan" value={form.user} onChange={(e) => yaz('user', e.target.value)} />
            </div>
            <div>
              <label className="etiketli" htmlFor="a-pass">
                Parola
              </label>
              <input
                id="a-pass"
                className="alan"
                type="password"
                value={form.password}
                onChange={(e) => yaz('password', e.target.value)}
              />
            </div>
          </div>

          <div className="satir-2" style={{ marginTop: 12 }}>
            <div>
              <label className="etiketli" htmlFor="a-cs">
                Karakter seti
              </label>
              <input id="a-cs" className="alan" value={form.charset} onChange={(e) => yaz('charset', e.target.value)} />
            </div>
            <div>
              <label className="etiketli" htmlFor="a-kontrol">
                Hatırlatma kontrol aralığı (saniye)
              </label>
              <input
                id="a-kontrol"
                className="alan"
                type="number"
                min={10}
                value={form.kontrolSaniye}
                onChange={(e) => yaz('kontrolSaniye', Number(e.target.value))}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 16, alignItems: 'center' }}>
            <button className="dgm" onClick={() => void testEt()}>
              Bağlantıyı dene
            </button>
            <button className="dgm birincil" onClick={() => void kaydet()}>
              Kaydet ve yeniden bağlan
            </button>
            {mesaj && <span style={{ fontSize: 12, color: 'var(--murekkep-soluk)' }}>{mesaj}</span>}
          </div>

          <hr className="ayrac" />
        </>
      )}

      {window.api.platform === 'mobil' && (
        <p className="bos" style={{ padding: 0, marginTop: 0 }}>
          Veriler bu cihazda saklanıyor; başka cihazlarla paylaşılmıyor.
        </p>
      )}

      <h2 className="bolum-basligi">Etiketler</h2>

      <div className="secim-seridi" style={{ marginBottom: 12 }}>
        {etiketler.map((e) => (
          <span key={e.ID} className="rozetcik" style={{ paddingRight: 4 }}>
            <i className="nokta" style={{ background: e.RENK }} />
            {e.AD}
            <button className="dgm sessiz" style={{ padding: '0 4px' }} onClick={() => void etiketSil(e.ID)}>
              ×
            </button>
          </span>
        ))}
        {etiketler.length === 0 && <span className="bos">Etiket yok.</span>}
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          className="alan"
          style={{ maxWidth: 220 }}
          value={yeniEtiket}
          placeholder="Yeni etiket adı"
          onChange={(e) => setYeniEtiket(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void etiketEkle()}
        />
        {ETIKET_RENKLERI.map((r) => (
          <button
            key={r}
            className="renk-nokta"
            style={{ background: r, width: 20, height: 20, boxShadow: yeniRenk === r ? '0 0 0 2px var(--murekkep)' : 'none' }}
            aria-label="Renk seç"
            onClick={() => setYeniRenk(r)}
          />
        ))}
        <button className="dgm" onClick={() => void etiketEkle()}>
          Etiket ekle
        </button>
      </div>

      <hr className="ayrac" />

      <h2 className="bolum-basligi">Görünüm</h2>
      <div className="secim-seridi">
        {([
          ['klasik', 'Klasik'],
          ['renkli', 'Renkli']
        ] as const).map(([kod, ad]) => (
          <button
            key={kod}
            className={`secim${(form.tema ?? 'klasik') === kod ? ' acik' : ''}`}
            onClick={async () => setConfig(await window.api.config.save({ tema: kod }))}
          >
            {ad}
          </button>
        ))}
      </div>

      <hr className="ayrac" />

      <h2 className="bolum-basligi">Hatırlatmalar</h2>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={form.alarmSesi !== false}
            onChange={async (e) => setConfig(await window.api.config.save({ alarmSesi: e.target.checked }))}
          />
          Hatırlatma gelince alarm sesi çal
        </label>
        <button className="dgm" onClick={alarmDene}>
          🔔 Sesi dene
        </button>
      </div>

      <hr className="ayrac" />

      <h2 className="bolum-basligi">Kişisel sayfa PIN'i</h2>
      <p className="bos" style={{ padding: '0 0 10px' }}>
        "Kişisel" işaretli sayfalar bu PIN girilmeden açılmaz. Basit bir görünürlük engelidir, şifreleme değildir.
      </p>

      <div className="satir-2" style={{ maxWidth: 420 }}>
        <div>
          <label className="etiketli" htmlFor="p1">
            PIN
          </label>
          <input id="p1" className="alan" type="password" value={pin1} onChange={(e) => setPin1(e.target.value)} />
        </div>
        <div>
          <label className="etiketli" htmlFor="p2">
            Tekrar
          </label>
          <input id="p2" className="alan" type="password" value={pin2} onChange={(e) => setPin2(e.target.value)} />
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <button className="dgm" onClick={() => void pinKaydet()}>
          {pin1 ? 'PIN ayarla' : 'PIN kaldır'}
        </button>
      </div>
    </>
  )
}
