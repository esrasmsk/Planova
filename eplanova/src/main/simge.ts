import { nativeImage } from 'electron'
import ikonYolu from '../../resources/ikon.png?asset'

/**
 * Uygulama simgesi (resources/ikon.png). Windows'ta SVG'den olusturulan nativeImage bos
 * ciktigi icin PNG kullaniliyor; "?asset" dosyayi derlemeye kopyalar.
 */
export function uygulamaSimgesi(boyut?: number): Electron.NativeImage {
  const img = nativeImage.createFromPath(ikonYolu)
  return boyut ? img.resize({ width: boyut, height: boyut, quality: 'best' }) : img
}
