import { app, BrowserWindow, Menu, Tray, dialog, shell } from 'electron'
import { join } from 'path'
import { getConfig, initDb, loadConfig, saveConfig } from './db'
import { registerHandlers } from './handlers'
import { startReminderLoop, stopReminderLoop } from './reminders'
import { uygulamaSimgesi } from './simge'

let win: BrowserWindow | null = null
let tray: Tray | null = null
let gercektenCik = false
let tepsiBilgisiVerildi = false

/** Windows acilisinda "--gizli" ile baslatilir: pencere gostermeden tepside calisir. */
const GIZLI_ARG = '--gizli'
const gizliBaslat = process.argv.includes(GIZLI_ARG)

const tekKopya = app.requestSingleInstanceLock()
if (!tekKopya) app.quit()

function createWindow(): void {
  win = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 1040,
    minHeight: 680,
    show: false,
    backgroundColor: '#2f3a34',
    title: 'planova',
    icon: uygulamaSimgesi(),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      // Hatirlatma alarm sesi, uygulama arka plandayken de (tiklama beklemeden) calabilsin
      autoplayPolicy: 'no-user-gesture-required'
    }
  })

  win.on('ready-to-show', () => {
    if (!gizliBaslat) win?.show()
  })

  win.on('close', (e) => {
    if (!gercektenCik) {
      e.preventDefault()
      win?.hide()
      tepsiBilgisiVer()
    }
  })

  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    void win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

/** Pencere ilk kapatildiginda bir kez: uygulamanin arka planda calistigini hatirlat. */
function tepsiBilgisiVer(): void {
  if (tepsiBilgisiVerildi || !tray) return
  tepsiBilgisiVerildi = true
  tray.displayBalloon({
    icon: uygulamaSimgesi(64),
    title: 'planova arka planda çalışıyor',
    content: 'Hatırlatmalar gelmeye devam edecek. Açmak için saatin yanındaki planova simgesine çift tıklayın.'
  })
}

function windowsIleBasliyorMu(): boolean {
  return app.getLoginItemSettings({ args: [GIZLI_ARG] }).openAtLogin
}

function windowsIleBaslat(acik: boolean): void {
  app.setLoginItemSettings({ openAtLogin: acik, args: [GIZLI_ARG] })
}

function createTray(): void {
  tray = new Tray(uygulamaSimgesi(32))
  tray.setToolTip('planova')
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'planova’yı aç', click: () => showWindow() },
      { type: 'separator' },
      {
        label: 'Windows ile başlat',
        type: 'checkbox',
        // Gelistirme modunda kayit, gecici electron.exe'yi gosterecegi icin kapali
        enabled: app.isPackaged,
        checked: windowsIleBasliyorMu(),
        click: (item) => windowsIleBaslat(item.checked)
      },
      { type: 'separator' },
      {
        label: 'Çıkış',
        click: () => {
          gercektenCik = true
          app.quit()
        }
      }
    ])
  )
  tray.on('double-click', () => showWindow())
}

function showWindow(): void {
  if (!win) return createWindow()
  if (win.isMinimized()) win.restore()
  win.show()
  win.focus()
}

app.on('second-instance', () => showWindow())

void app.whenReady().then(async () => {
  app.setAppUserModelId('com.temayazilim.planner')
  loadConfig()
  registerHandlers()

  // Kurulu uygulamanin ilk acilisinda Windows ile gizli baslatmayi ac: hatirlatmalar
  // bilgisayar yeniden basladiginda da gelsin. Bir kez yapilir; kullanici tepsiden kapatabilir.
  if (app.isPackaged && !getConfig().otomatikBaslatmaAyarlandi) {
    windowsIleBaslat(true)
    saveConfig({ otomatikBaslatmaAyarlandi: true })
  }

  createWindow()
  createTray()
  Menu.setApplicationMenu(null)

  try {
    await initDb()
  } catch (err: any) {
    dialog.showErrorBox(
      'Veritabanına bağlanılamadı',
      `${String(err?.message ?? err)}\n\nAyarlar bölümünden bağlantı bilgilerini düzeltip "Kaydet ve yeniden bağlan" deyin.`
    )
  }

  startReminderLoop(() => win)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('before-quit', () => {
  gercektenCik = true
  stopReminderLoop()
})

app.on('window-all-closed', () => {
  // tepside calismaya devam eder
})
