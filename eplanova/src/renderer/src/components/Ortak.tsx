import { useEffect, useRef, useState } from 'react'
import type { Gorev } from '../types'
import { coz, kalanMetni, saatMetni } from '../tarih'

// ------------------------------------------------------------------ onay kutusu

interface OnayIstegi {
  mesaj: string
  cevapla: (evet: boolean) => void
}

let onayGoster: ((istek: OnayIstegi) => void) | null = null

/**
 * window.confirm yerine kullanilir. Electron'da confirm() arayuzu kilitliyor ve
 * kapandiktan sonra klavye odagini geri vermiyor (sonraki pencerede yazi yazilamiyor).
 */
export function onayIste(mesaj: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (!onayGoster) return resolve(false)
    onayGoster({ mesaj, cevapla: resolve })
  })
}

/** App icinde bir kez yerlestirilir; onayIste() cagrilarini gosterir. */
export function OnayKutusu(): JSX.Element | null {
  const [istek, setIstek] = useState<OnayIstegi | null>(null)
  const silDugmesi = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    onayGoster = setIstek
    return () => {
      onayGoster = null
    }
  }, [])

  useEffect(() => {
    if (istek) silDugmesi.current?.focus()
  }, [istek])

  if (!istek) return null

  function bitir(evet: boolean): void {
    istek?.cevapla(evet)
    setIstek(null)
  }

  return (
    <div
      className="perde"
      onMouseDown={(e) => e.target === e.currentTarget && bitir(false)}
      onKeyDown={(e) => e.key === 'Escape' && bitir(false)}
    >
      <div className="kart onay-kart" role="alertdialog" aria-modal="true">
        <p>{istek.mesaj}</p>
        <div className="kart-alt">
          <button className="dgm" onClick={() => bitir(false)}>
            Vazgeç
          </button>
          <button className="dgm tehlike" ref={silDugmesi} onClick={() => bitir(true)}>
            Sil
          </button>
        </div>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------ gorev satiri

export function Tik(): JSX.Element {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <path d="M3 8.6 6.3 12 13 4.4" />
    </svg>
  )
}

export function Bos({ metin }: { metin: string }): JSX.Element {
  return <p className="bos">{metin}</p>
}

interface SatirProps {
  gorev: Gorev
  tarihGoster?: boolean
  onTamamla: (g: Gorev) => void
  onDuzenle: (g: Gorev) => void
  onSil: (g: Gorev) => void
  /** Yarina tasi (kagit ajandadaki ok isareti); verilmezse dugme gorunmez. */
  onErtele?: (g: Gorev) => void
}

/** Satirin kayarak kaybolma suresi (ms); styles.css'teki .gorev.tasiniyor ile ayni. */
const TASIMA_MS = 320

export function GorevSatiri({ gorev, tarihGoster, onTamamla, onDuzenle, onSil, onErtele }: SatirProps): JSX.Element {
  const [tasiniyor, setTasiniyor] = useState(false)
  const bas = coz(gorev.BASLANGIC)
  const bitti = gorev.DURUM === 1
  const gecikmis = !bitti && bas !== null && bas.getTime() < Date.now()

  // Yalnizca bitmemis ve tarihi bugun ya da daha eski isler yarina tasinabilir
  const yarinBasi = new Date()
  yarinBasi.setHours(24, 0, 0, 0)
  const tasinabilir = Boolean(onErtele) && !bitti && bas !== null && bas.getTime() < yarinBasi.getTime()

  function yarinaTasi(): void {
    if (tasiniyor) return
    setTasiniyor(true)
    setTimeout(() => onErtele?.(gorev), TASIMA_MS)
  }

  return (
    <li className={`gorev${bitti ? ' bitti' : ''}${tasiniyor ? ' tasiniyor' : ''}`}>
      <span className={`oncelik o${gorev.ONCELIK}`} aria-hidden="true" />

      <button
        className="kutu"
        onClick={() => onTamamla(gorev)}
        aria-label={bitti ? 'Tamamlandı işaretini kaldır' : 'Tamamlandı olarak işaretle'}
      >
        <Tik />
      </button>

      <span className="saat">{gorev.TUM_GUN ? 'gün' : saatMetni(gorev.BASLANGIC)}</span>

      <div className="gorev-govde">
        <div className="gorev-baslik">{gorev.BASLIK}</div>
        <div className="gorev-alt">
          {tarihGoster && bas && (
            <span>
              {String(bas.getDate()).padStart(2, '0')}.{String(bas.getMonth() + 1).padStart(2, '0')}.
              {bas.getFullYear()}
            </span>
          )}
          {!bitti && bas && <span className={gecikmis ? 'gecikmis' : ''}>{kalanMetni(bas)}</span>}
          {gorev.TEKRAR_TIP !== 'YOK' && <span>tekrarlı</span>}
          {gorev.uyarilar?.length > 0 && <span>{gorev.uyarilar.length} hatırlatma</span>}
          {gorev.etiketler?.map((e) => (
            <span className="rozetcik" key={e.ID}>
              <i className="nokta" style={{ background: e.RENK }} />
              {e.AD}
            </span>
          ))}
          {gorev.DETAY && <span title={gorev.DETAY}>{gorev.DETAY.slice(0, 70)}</span>}
        </div>
      </div>

      {tasinabilir && (
        <button className="yarina-tasi" onClick={yarinaTasi} title="Bu işi yarına taşı">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12h13M13 6l6 6-6 6" />
          </svg>
          Yarına
        </button>
      )}

      <div className="gorev-eylem">
        <button className="dgm sessiz" onClick={() => onDuzenle(gorev)}>
          Düzenle
        </button>
        <button className="dgm sessiz" onClick={() => onSil(gorev)}>
          Sil
        </button>
      </div>
    </li>
  )
}
