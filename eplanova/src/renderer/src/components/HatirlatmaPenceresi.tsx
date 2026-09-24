import { useEffect, useRef, useState } from 'react'
import { coz, saatMetni } from '../tarih'
import { alarmCal } from '../alarmSesi'

export interface Bildirim {
  anahtar: number
  gorevId: number
  baslik: string
  kalan: string
  detay: string | null
  zaman: string | null
}

interface Props {
  bildirimler: Bildirim[]
  /** Ayarlar'daki "Alarm sesi çal" secenegi */
  sesAcik: boolean
  onKapat: (anahtar: number) => void
  onAc: (b: Bildirim) => void
}

const AYLAR_KISA = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']

/** Titreyen cift canli alarm saati. */
function AlarmSaati(): JSX.Element {
  return (
    <svg className="alarm-saati" viewBox="0 0 120 120" aria-hidden="true">
      <defs>
        <radialGradient id="alarm-govde" cx="40%" cy="35%" r="70%">
          <stop offset="0" stopColor="#ff8a75" />
          <stop offset="0.55" stopColor="#f0483a" />
          <stop offset="1" stopColor="#b8262a" />
        </radialGradient>
        <linearGradient id="alarm-can" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe27a" />
          <stop offset="1" stopColor="#e0a100" />
        </linearGradient>
        <radialGradient id="alarm-kadran" cx="45%" cy="40%" r="65%">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#f3ece0" />
        </radialGradient>
      </defs>

      {/* titresim cizgileri */}
      <g className="alarm-titresim" stroke="#fff" strokeWidth="4" strokeLinecap="round" fill="none">
        <path d="M14 44 Q8 60 14 76" />
        <path d="M6 38 Q-2 60 6 82" opacity="0.6" />
        <path d="M106 44 Q112 60 106 76" />
        <path d="M114 38 Q122 60 114 82" opacity="0.6" />
      </g>

      <g className="alarm-govdesi">
        {/* ayaklar */}
        <path d="M36 98 L28 110 M84 98 L92 110" stroke="#7a1d1f" strokeWidth="6" strokeLinecap="round" />
        {/* canlar ve cekic */}
        <g className="alarm-canlar">
          <path d="M24 34 A20 20 0 0 1 50 18 L28 44 Z" fill="url(#alarm-can)" stroke="#b07d00" strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M96 34 A20 20 0 0 0 70 18 L92 44 Z" fill="url(#alarm-can)" stroke="#b07d00" strokeWidth="2.5" strokeLinejoin="round" />
          <rect x="56" y="14" width="8" height="12" rx="2" fill="#7a1d1f" />
          <circle cx="60" cy="12" r="5" fill="#ffd23f" stroke="#b07d00" strokeWidth="2" />
        </g>
        {/* govde */}
        <circle cx="60" cy="64" r="40" fill="url(#alarm-govde)" stroke="#8f1c20" strokeWidth="2.5" />
        <ellipse cx="46" cy="42" rx="12" ry="6" fill="#fff" opacity="0.35" transform="rotate(-30 46 42)" />
        {/* kadran */}
        <circle cx="60" cy="64" r="30" fill="url(#alarm-kadran)" stroke="#8f1c20" strokeWidth="2" />
        {Array.from({ length: 12 }, (_, i) => (
          <line
            key={i}
            x1="60"
            y1={i % 3 === 0 ? 38 : 39.5}
            x2="60"
            y2={i % 3 === 0 ? 45 : 43}
            stroke="#3a2a2a"
            strokeWidth={i % 3 === 0 ? 3 : 1.6}
            strokeLinecap="round"
            transform={`rotate(${i * 30} 60 64)`}
          />
        ))}
        {/* akrep ve yelkovan */}
        <line x1="60" y1="64" x2="49" y2="55" stroke="#2b2020" strokeWidth="4" strokeLinecap="round" />
        <line x1="60" y1="64" x2="72" y2="45" stroke="#2b2020" strokeWidth="3" strokeLinecap="round" />
        <line x1="60" y1="64" x2="60" y2="80" stroke="#e5483b" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="60" cy="64" r="3.6" fill="#e5483b" stroke="#2b2020" strokeWidth="1.5" />
      </g>
    </svg>
  )
}

/**
 * Kurumsal klasik tema icin modern saat: sade beyaz kadran, gercek saati gosteren ibreler,
 * akan saniye ibresi, cevresinde donen vurgu halkasi ve disa yayilan dalgalar.
 */
function KurumsalSaat(): JSX.Element {
  const simdi = new Date()
  const saniye = simdi.getSeconds()
  const dakika = simdi.getMinutes() + saniye / 60
  const saat = (simdi.getHours() % 12) + dakika / 60
  return (
    <svg className="kurumsal-saat" viewBox="0 0 120 120" aria-hidden="true">
      <defs>
        <linearGradient id="kurumsal-halka" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff6b6b" />
          <stop offset="1" stopColor="#ffb4a2" />
        </linearGradient>
      </defs>

      {/* disa yayilan dalgalar */}
      <circle className="kurumsal-dalga d1" cx="60" cy="60" r="40" />
      <circle className="kurumsal-dalga d2" cx="60" cy="60" r="40" />
      <circle className="kurumsal-dalga d3" cx="60" cy="60" r="40" />

      <g className="kurumsal-saat-govde">
        {/* sade zil kulaklari */}
        <path className="kurumsal-kulak sol" d="M27 30 a15 15 0 0 1 20 -11" />
        <path className="kurumsal-kulak sag" d="M93 30 a15 15 0 0 0 -20 -11" />

        {/* donen vurgu halkasi */}
        <circle cx="60" cy="62" r="45" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="3" />
        <circle className="kurumsal-yay" cx="60" cy="62" r="45" fill="none" stroke="url(#kurumsal-halka)" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="70 213" />

        {/* kadran */}
        <circle cx="60" cy="62" r="38" fill="#ffffff" />
        <circle cx="60" cy="62" r="38" fill="none" stroke="#dfe5ef" strokeWidth="1.5" />
        {Array.from({ length: 12 }, (_, i) => (
          <line
            key={i}
            x1="60"
            y1={i % 3 === 0 ? 28 : 29.5}
            x2="60"
            y2={i % 3 === 0 ? 34 : 32}
            stroke={i % 3 === 0 ? '#1f3a60' : '#a1abbe'}
            strokeWidth={i % 3 === 0 ? 2.6 : 1.4}
            strokeLinecap="round"
            transform={`rotate(${i * 30} 60 62)`}
          />
        ))}

        {/* ibreler: gercek saat */}
        <line x1="60" y1="62" x2="60" y2="44" stroke="#1f3a60" strokeWidth="4" strokeLinecap="round" transform={`rotate(${saat * 30} 60 62)`} />
        <line x1="60" y1="62" x2="60" y2="35" stroke="#1f3a60" strokeWidth="2.6" strokeLinecap="round" transform={`rotate(${dakika * 6} 60 62)`} />
        <g transform={`rotate(${saniye * 6} 60 62)`}>
          <g className="kurumsal-saniye">
            <line x1="60" y1="69" x2="60" y2="31" stroke="#e5484d" strokeWidth="1.4" strokeLinecap="round" />
          </g>
        </g>
        <circle cx="60" cy="62" r="3.4" fill="#e5484d" stroke="#ffffff" strokeWidth="1.5" />
      </g>
    </svg>
  )
}

/** Zamani gelen hatirlatma: ekranin ortasinda, titreyen alarm saatiyle. */
export default function HatirlatmaPenceresi({ bildirimler, sesAcik, onKapat, onAc }: Props): JSX.Element | null {
  const tamamDugmesi = useRef<HTMLButtonElement>(null)
  const b = bildirimler[0]

  const acik = Boolean(b)
  // Alarm calarken ekran kirmizi yanip soner; 60 sn sonra ya da kapatilinca durur
  const [caliyor, setCaliyor] = useState(false)
  const [susturuldu, setSusturuldu] = useState(false)

  useEffect(() => {
    tamamDugmesi.current?.focus()
  }, [b?.anahtar])

  useEffect(() => {
    if (!acik) return
    setCaliyor(true)
    setSusturuldu(false)
    const t = setTimeout(() => setCaliyor(false), 60000)
    return () => {
      clearTimeout(t)
      setCaliyor(false)
    }
  }, [acik])

  useEffect(() => {
    if (!caliyor || !sesAcik || susturuldu) return
    return alarmCal()
  }, [caliyor, sesAcik, susturuldu])

  if (!b) return null

  const d = coz(b.zaman)

  return (
    <div
      className={`perde hatirlatma-perde${caliyor ? ' caliyor' : ''}`}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="hatirlatma-baslik"
      onKeyDown={(e) => e.key === 'Escape' && onKapat(b.anahtar)}
    >
      <div className="hatirlatma-kart" key={b.anahtar}>
        <div className="hatirlatma-bant">
          <span className="hatirlatma-parilti p1" />
          <span className="hatirlatma-parilti p2" />
          <span className="hatirlatma-parilti p3" />
          <AlarmSaati />
          <KurumsalSaat />
          <span className="hatirlatma-etiket">
            <i className="hatirlatma-canli" aria-hidden="true" />
            Hatırlatma{bildirimler.length > 1 && ` · 1 / ${bildirimler.length}`}
          </span>
        </div>

        <div className="hatirlatma-govde">
          <h2 id="hatirlatma-baslik">{b.baslik}</h2>

          <div className="hatirlatma-cipler">
            <span className="hatirlatma-cip kalan">
              <span className="hatirlatma-emoji">⏰ </span>
              {b.kalan}
            </span>
            {d && (
              <span className="hatirlatma-cip">
                {d.getDate()} {AYLAR_KISA[d.getMonth()]} · {saatMetni(b.zaman)}
              </span>
            )}
          </div>

          {b.detay && <p className="hatirlatma-detay">{b.detay.slice(0, 240)}</p>}

          {caliyor && sesAcik && !susturuldu && (
            <button className="hatirlatma-sustur" onClick={() => setSusturuldu(true)}>
              <span className="hatirlatma-emoji">🔇 </span>Sesi kapat
            </button>
          )}

          <div className="hatirlatma-dugmeler">
            <button className="hatirlatma-dgm ikincil" onClick={() => onAc(b)}>
              Görevi aç
            </button>
            <button className="hatirlatma-dgm birincil" ref={tamamDugmesi} onClick={() => onKapat(b.anahtar)}>
              {bildirimler.length > 1 ? 'Sonraki' : 'Tamam'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
