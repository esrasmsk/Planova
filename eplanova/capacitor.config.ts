import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.temayazilim.planova',
  appName: 'planova',
  webDir: 'dist-mobil',
  android: {
    // Masa yesili; uygulama acilirken beyaz parlama olmasin
    backgroundColor: '#2b352f'
  },
  ios: {
    backgroundColor: '#2b352f',
    contentInset: 'never'
  },
  plugins: {
    CapacitorSQLite: {
      iosDatabaseLocation: 'Library/CapacitorDatabase',
      androidIsEncryption: false
    },
    LocalNotifications: {
      iconColor: '#7e5a7b'
    }
  }
}

export default config
