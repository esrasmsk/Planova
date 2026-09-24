import { BrowserWindow, Notification } from 'electron'
import { exec, getConfig, parseLocal, query } from './db'
import { uygulamaSimgesi } from './simge'

let timer: NodeJS.Timeout | null = null

function metin(dkOnce: number): string {
  if (dkOnce <= 0) return 'Zamanı geldi'
  if (dkOnce < 60) return `${dkOnce} dakika kaldı`
  if (dkOnce < 1440) {
    const s = Math.floor(dkOnce / 60)
    const d = dkOnce % 60
    return d ? `${s} saat ${d} dakika kaldı` : `${s} saat kaldı`
  }
  const g = Math.floor(dkOnce / 1440)
  const s = Math.floor((dkOnce % 1440) / 60)
  return s ? `${g} gün ${s} saat kaldı` : `${g} gün kaldı`
}

async function kontrol(win: BrowserWindow | null): Promise<void> {
  let satirlar: any[] = []
  try {
    satirlar = await query(
      `SELECT u.ID AS UYARI_ID, u.DK_ONCE, g.ID AS GOREV_ID, g.BASLIK, g.DETAY, g.BASLANGIC
         FROM PL_UYARI u
         JOIN PL_GOREV g ON g.ID = u.GOREV_ID
        WHERE u.GONDERILDI = 0
          AND g.DURUM = 0
          AND g.BASLANGIC > DATEADD(-14 DAY TO CURRENT_TIMESTAMP)`
    )
  } catch {
    return // baglanti yoksa sessizce bekle
  }

  const simdi = Date.now()
  let tetiklendi = false

  for (const s of satirlar) {
    const bas = parseLocal(s.BASLANGIC)
    if (!bas) continue

    const tetikZamani = bas.getTime() - Number(s.DK_ONCE) * 60000
    if (simdi < tetikZamani) continue

    // Gecikmis on-uyari: zamani coktan gecmisse sessizce kapat
    const cokGec = simdi > bas.getTime() && Number(s.DK_ONCE) > 0

    try {
      await exec('UPDATE PL_UYARI SET GONDERILDI = 1, GONDERIM = CURRENT_TIMESTAMP WHERE ID = ?', [s.UYARI_ID])
    } catch {
      continue
    }

    if (cokGec) continue

    tetiklendi = true

    const saat = `${String(bas.getHours()).padStart(2, '0')}:${String(bas.getMinutes()).padStart(2, '0')}`
    const gun = `${String(bas.getDate()).padStart(2, '0')}.${String(bas.getMonth() + 1).padStart(2, '0')}`

    if (Notification.isSupported()) {
      const n = new Notification({
        title: `⏰ ${s.BASLIK}`,
        icon: uygulamaSimgesi(128),
        body: `${metin(Number(s.DK_ONCE))} — ${gun} ${saat}${s.DETAY ? `\n${String(s.DETAY).slice(0, 120)}` : ''}`,
        urgency: 'critical',
        timeoutType: 'never'
      })
      n.on('click', () => {
        if (win) {
          if (win.isMinimized()) win.restore()
          win.show()
          win.focus()
          win.webContents.send('reminder:open', { gorevId: s.GOREV_ID })
        }
      })
      n.show()
    }

    // Uygulama tepsideyse ya da kucultulmusse pencereyi odak calmadan one getir:
    // hatirlatma penceresi ekranin ortasinda gorunsun
    if (win) {
      if (win.isMinimized()) win.restore()
      if (!win.isVisible()) win.showInactive()
      win.flashFrame(true)
    }

    win?.webContents.send('reminder:fired', {
      gorevId: s.GOREV_ID,
      baslik: s.BASLIK,
      detay: s.DETAY,
      zaman: s.BASLANGIC,
      kalan: metin(Number(s.DK_ONCE))
    })
  }

  if (tetiklendi) win?.webContents.send('data:changed')
}

export function startReminderLoop(getWin: () => BrowserWindow | null): void {
  stopReminderLoop()
  const ms = Math.max(10, getConfig().kontrolSaniye || 30) * 1000
  timer = setInterval(() => void kontrol(getWin()), ms)
  setTimeout(() => void kontrol(getWin()), 4000)
}

export function stopReminderLoop(): void {
  if (timer) clearInterval(timer)
  timer = null
}
