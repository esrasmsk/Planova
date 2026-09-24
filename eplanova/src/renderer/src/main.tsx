import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'

async function baslat(): Promise<void> {
  const kok = document.getElementById('root')!
  try {
    // Masaustunde window.api preload'dan gelir (Firebird). Yoksa mobildeyiz: SQLite katmanini yukle.
    if (!window.api) {
      const { mobilApiOlustur } = await import('./api/mobilApi')
      window.api = await mobilApiOlustur()
    }
  } catch (err: any) {
    kok.innerHTML = `<p style="padding:24px;font-family:sans-serif;color:#fff">Veritabanı açılamadı: ${String(
      err?.message ?? err
    )}</p>`
    return
  }

  ReactDOM.createRoot(kok).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}

void baslat()
