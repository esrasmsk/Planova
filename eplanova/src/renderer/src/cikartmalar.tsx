/**
 * Cikartma paketi (64x64 SVG): kurumsal is etiketleri + eglenceli is cikartmalari.
 * Beyaz kesim kenari ve golge styles.css'teki ".cikartma-resim" kuralindan gelir; burada
 * yalnizca sekiller var. Yazilar Poppins (Turkce harfler ve ₺ dosyada dogrulandi).
 */
import type { ReactNode } from 'react'

export type CikartmaGrubu = 'is' | 'eglence'

export interface CikartmaTanim {
  kod: string
  ad: string
  grup: CikartmaGrubu
  cizim: ReactNode
}

export const CIKARTMA_GRUPLARI: { kod: CikartmaGrubu; ad: string }[] = [
  { kod: 'is', ad: 'İş etiketleri' },
  { kod: 'eglence', ad: 'Eğlenceli' }
]

const yazi = { fontFamily: 'Poppins, sans-serif', fontWeight: 700, textAnchor: 'middle' } as const

export const CIKARTMALAR: CikartmaTanim[] = [
  // ------------------------------------------------------------ kurumsal is etiketleri
  {
    kod: 'acil',
    ad: 'Acil',
    grup: 'is',
    cizim: (
      <>
        <rect x="4" y="17" width="56" height="30" rx="8" fill="#e5484d" stroke="#b4232a" strokeWidth="2" />
        <circle cx="17" cy="32" r="8" fill="#fff" />
        <text x="17" y="36.6" fontSize="13" fill="#e5484d" {...yazi}>!</text>
        <text x="38.5" y="36.4" fontSize="12.5" fill="#fff" letterSpacing="0.6" textLength="25" lengthAdjust="spacingAndGlyphs" {...yazi}>ACİL</text>
      </>
    )
  },
  {
    kod: 'onemli',
    ad: 'Önemli',
    grup: 'is',
    cizim: (
      <>
        <path d="M5 18 H45 L59 32 L45 46 H5 Z" fill="#ff9f1c" stroke="#d97706" strokeWidth="2" strokeLinejoin="round" />
        <circle cx="48" cy="32" r="3" fill="#fff" />
        <text x="24.5" y="35.4" fontSize="9.5" fill="#fff" textLength="31" lengthAdjust="spacingAndGlyphs" {...yazi}>ÖNEMLİ</text>
      </>
    )
  },
  {
    kod: 'onay',
    ad: 'Onaylandı',
    grup: 'is',
    cizim: (
      <g transform="rotate(-8 32 32)">
        <circle cx="32" cy="32" r="27" fill="#ecfbf1" stroke="#1f9d55" strokeWidth="3" />
        <circle cx="32" cy="32" r="22" fill="none" stroke="#1f9d55" strokeWidth="1.2" />
        <path d="M22 25 l7 7 l13 -13" fill="none" stroke="#1f9d55" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="6" y="36" width="52" height="13" rx="2" fill="#1f9d55" />
        <text x="32" y="45.6" fontSize="7.6" fill="#fff" letterSpacing="0.4" textLength="44" lengthAdjust="spacingAndGlyphs" {...yazi}>ONAYLANDI</text>
      </g>
    )
  },
  {
    kod: 'tamam',
    ad: 'Tamam',
    grup: 'is',
    cizim: (
      <>
        <rect x="4" y="19" width="56" height="26" rx="13" fill="#22c55e" stroke="#15803d" strokeWidth="2" />
        <circle cx="17" cy="32" r="8" fill="#fff" />
        <path d="M13.2 32.2 l2.8 2.8 l5 -5.4" fill="none" stroke="#15803d" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        <text x="39" y="35.8" fontSize="10.5" fill="#fff" textLength="27" lengthAdjust="spacingAndGlyphs" {...yazi}>TAMAM</text>
      </>
    )
  },
  {
    kod: 'bekliyor',
    ad: 'Bekliyor',
    grup: 'is',
    cizim: (
      <>
        <rect x="3" y="19" width="58" height="26" rx="13" fill="#fde68a" stroke="#d97706" strokeWidth="2" />
        <path
          d="M11 24 h10 M11 40 h10 M12 24 c0 6 7 6 7 8 c0 2 -7 2 -7 8 M20 24 c0 6 -7 6 -7 8 c0 2 7 2 7 8"
          fill="none"
          stroke="#92400e"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path d="M14 38.5 h4 l-2 -2.5 Z" fill="#92400e" />
        <text x="40" y="35.2" fontSize="8.4" fill="#92400e" textLength="31" lengthAdjust="spacingAndGlyphs" {...yazi}>BEKLİYOR</text>
      </>
    )
  },
  {
    kod: 'toplanti',
    ad: 'Toplantı',
    grup: 'is',
    cizim: (
      <>
        <rect x="4" y="12" width="56" height="40" rx="9" fill="#1f3a60" stroke="#132741" strokeWidth="2" />
        <circle cx="21" cy="24" r="3.8" fill="#9cc3ff" />
        <circle cx="43" cy="24" r="3.8" fill="#9cc3ff" />
        <circle cx="32" cy="22.5" r="4.6" fill="#fff" />
        <path d="M14.5 35 a6.5 6 0 0 1 13 0 Z M36.5 35 a6.5 6 0 0 1 13 0 Z" fill="#9cc3ff" />
        <path d="M24 35.5 a8 7.5 0 0 1 16 0 Z" fill="#fff" />
        <text x="32" y="46.2" fontSize="7.8" fill="#fff" letterSpacing="0.3" textLength="42" lengthAdjust="spacingAndGlyphs" {...yazi}>TOPLANTI</text>
      </>
    )
  },
  {
    kod: 'sontarih',
    ad: 'Son gün',
    grup: 'is',
    cizim: (
      <>
        <rect x="9" y="11" width="46" height="46" rx="7" fill="#fff" stroke="#1f3a60" strokeWidth="2.5" />
        <path d="M9 24 V18 a7 7 0 0 1 7 -7 H48 a7 7 0 0 1 7 7 V24 Z" fill="#e5484d" stroke="#1f3a60" strokeWidth="2.5" strokeLinejoin="round" />
        <line x1="20" y1="7" x2="20" y2="15" stroke="#1f3a60" strokeWidth="3" strokeLinecap="round" />
        <line x1="44" y1="7" x2="44" y2="15" stroke="#1f3a60" strokeWidth="3" strokeLinecap="round" />
        <text x="32" y="39" fontSize="11" fill="#1f3a60" {...yazi}>SON</text>
        <text x="32" y="51" fontSize="11" fill="#e5484d" {...yazi}>GÜN</text>
      </>
    )
  },
  {
    kod: 'taslak',
    ad: 'Taslak',
    grup: 'is',
    cizim: (
      <g transform="rotate(-6 32 32)">
        <rect x="5" y="18" width="54" height="28" rx="4" fill="#f3f4f6" stroke="#6b7280" strokeWidth="2" strokeDasharray="4 3" />
        <text x="32" y="36.4" fontSize="11" fill="#4b5563" letterSpacing="1" textLength="40" lengthAdjust="spacingAndGlyphs" {...yazi}>TASLAK</text>
      </g>
    )
  },
  {
    kod: 'takip',
    ad: 'Takip et',
    grup: 'is',
    cizim: (
      <>
        <ellipse cx="17" cy="56" rx="8" ry="2.6" fill="#cbd5e1" />
        <line x1="17" y1="9" x2="17" y2="56" stroke="#334155" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M18.5 11 H54 L46 22.5 L54 34 H18.5 Z" fill="#3b82f6" stroke="#1d4ed8" strokeWidth="2" strokeLinejoin="round" />
        <text x="33" y="25.8" fontSize="8.4" fill="#fff" textLength="24" lengthAdjust="spacingAndGlyphs" {...yazi}>TAKİP</text>
      </>
    )
  },
  {
    kod: 'odeme',
    ad: 'Ödeme',
    grup: 'is',
    cizim: (
      <>
        <rect x="4" y="12" width="56" height="30" rx="4" fill="#bbf7d0" stroke="#16a34a" strokeWidth="2" />
        <rect x="8.5" y="16.5" width="47" height="21" rx="2" fill="none" stroke="#16a34a" strokeWidth="1" strokeDasharray="2 2" />
        <circle cx="32" cy="27" r="8" fill="#16a34a" />
        <text x="32" y="31.4" fontSize="12" fill="#fff" {...yazi}>₺</text>
        <rect x="13" y="44" width="38" height="13" rx="3.5" fill="#16a34a" />
        <text x="32" y="53.3" fontSize="8" fill="#fff" textLength="28" lengthAdjust="spacingAndGlyphs" {...yazi}>ÖDEME</text>
      </>
    )
  },
  {
    kod: 'ara',
    ad: 'Ara',
    grup: 'is',
    cizim: (
      <>
        <circle cx="32" cy="32" r="27" fill="#0ea5e9" stroke="#0369a1" strokeWidth="2" />
        <path
          d="M24.5 14.5 c-3 0 -5.2 2.6 -4.4 6.3 c1.8 7.5 8.2 13.9 15.7 15.7 c3.7 0.8 6.3 -1.4 6.3 -4.4 v-3.3 l-6.2 -2.7 l-2.8 2.8 c-3.5 -1.8 -6.1 -4.4 -7.9 -7.9 l2.8 -2.8 l-2.7 -6.2 Z"
          fill="#fff"
        />
        <text x="32" y="51" fontSize="9" fill="#fff" letterSpacing="0.6" textLength="20" lengthAdjust="spacingAndGlyphs" {...yazi}>ARA</text>
      </>
    )
  },
  {
    kod: 'gizli',
    ad: 'Gizli',
    grup: 'is',
    cizim: (
      <g transform="rotate(-12 32 32)">
        <rect x="5" y="19" width="54" height="26" rx="3" fill="#fff5f5" stroke="#dc2626" strokeWidth="3" />
        <rect x="8.5" y="22.5" width="47" height="19" rx="1.5" fill="none" stroke="#dc2626" strokeWidth="1" />
        <text x="32" y="37" fontSize="12.5" fill="#dc2626" letterSpacing="2" textLength="38" lengthAdjust="spacingAndGlyphs" {...yazi}>GİZLİ</text>
      </g>
    )
  },

  // ------------------------------------------------------------ eglenceli is cikartmalari
  {
    kod: 'kahve',
    ad: 'Kahve molası',
    grup: 'eglence',
    cizim: (
      <>
        <path d="M21 19 q-3 -4 0 -8 M29 19 q-3 -4 0 -8 M37 19 q-3 -4 0 -8" fill="none" stroke="#a8a29e" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M44 28 h4 a7 7 0 0 1 0 14 h-4" fill="none" stroke="#7c4a2d" strokeWidth="3.2" />
        <path d="M12 23 H45 V41 a11 11 0 0 1 -11 11 H23 a11 11 0 0 1 -11 -11 Z" fill="#fff" stroke="#7c4a2d" strokeWidth="2.5" strokeLinejoin="round" />
        <rect x="13.2" y="28" width="30.6" height="10" fill="#c2410c" />
        <text x="28.5" y="35.6" fontSize="7.6" fill="#fff" textLength="24" lengthAdjust="spacingAndGlyphs" {...yazi}>MOLA</text>
        <path d="M24 43.5 Q28.5 47 33 43.5" fill="none" stroke="#7c4a2d" strokeWidth="2" strokeLinecap="round" />
        <ellipse cx="30" cy="57" rx="18" ry="3" fill="#e7d8cc" />
      </>
    )
  },
  {
    kod: 'ampul',
    ad: 'Fikir',
    grup: 'eglence',
    cizim: (
      <>
        <g stroke="#f59e0b" strokeWidth="2.6" strokeLinecap="round">
          <line x1="32" y1="2" x2="32" y2="6" />
          <line x1="11" y1="10" x2="14" y2="13" />
          <line x1="53" y1="10" x2="50" y2="13" />
          <line x1="5" y1="27" x2="9" y2="27" />
          <line x1="59" y1="27" x2="55" y2="27" />
        </g>
        <circle cx="32" cy="26" r="15" fill="#fde047" stroke="#ca8a04" strokeWidth="2.2" />
        <path d="M27 30 l2.5 -4 l2.5 4 l2.5 -4 l2.5 4" fill="none" stroke="#ca8a04" strokeWidth="1.6" strokeLinejoin="round" />
        <rect x="25" y="39" width="14" height="9" rx="2" fill="#94a3b8" stroke="#64748b" strokeWidth="1.5" />
        <line x1="25.5" y1="43.5" x2="38.5" y2="43.5" stroke="#64748b" strokeWidth="1.2" />
        <text x="32" y="60" fontSize="8.4" fill="#b45309" textLength="28" lengthAdjust="spacingAndGlyphs" {...yazi}>FİKİR!</text>
      </>
    )
  },
  {
    kod: 'roket',
    ad: 'Başla',
    grup: 'eglence',
    cizim: (
      <>
        <path d="M26.5 43 Q32 62 37.5 43 Z" fill="#fb923c" />
        <path d="M29 43 Q32 54 35 43 Z" fill="#fde047" />
        <path d="M24 33 L15 45 L24 42.5 Z M40 33 L49 45 L40 42.5 Z" fill="#e5484d" stroke="#991b1b" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M32 4 C43 12 45 28 40 43 H24 C19 28 21 12 32 4 Z" fill="#f1f5f9" stroke="#334155" strokeWidth="2.2" strokeLinejoin="round" />
        <circle cx="32" cy="22" r="5.5" fill="#38bdf8" stroke="#334155" strokeWidth="2" />
        <path d="M26 10.5 Q32 6 38 10.5" fill="none" stroke="#e5484d" strokeWidth="3" strokeLinecap="round" />
      </>
    )
  },
  {
    kod: 'harika',
    ad: 'Harika iş',
    grup: 'eglence',
    cizim: (
      <>
        <path d="M20 4 L30 26 L24 29 L13 7 Z" fill="#3b82f6" stroke="#1d4ed8" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M44 4 L34 26 L40 29 L51 7 Z" fill="#e5484d" stroke="#b4232a" strokeWidth="1.5" strokeLinejoin="round" />
        <circle cx="32" cy="41" r="17" fill="#fbbf24" stroke="#d97706" strokeWidth="2.5" />
        <circle cx="32" cy="41" r="12.5" fill="none" stroke="#fde68a" strokeWidth="1.5" />
        <polygon
          points="32.00,32.00 34.35,37.76 40.56,38.22 35.80,42.24 37.29,48.28 32.00,45.00 26.71,48.28 28.20,42.24 23.44,38.22 29.65,37.76"
          fill="#fff"
          stroke="#d97706"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </>
    )
  },
  {
    kod: 'hedef',
    ad: 'Hedef',
    grup: 'eglence',
    cizim: (
      <>
        <circle cx="30" cy="34" r="25" fill="#e5484d" stroke="#b4232a" strokeWidth="2" />
        <circle cx="30" cy="34" r="18" fill="#fff" />
        <circle cx="30" cy="34" r="11" fill="#e5484d" />
        <circle cx="30" cy="34" r="4.5" fill="#fff" />
        <line x1="30" y1="34" x2="54" y2="10" stroke="#1f3a60" strokeWidth="3" strokeLinecap="round" />
        <path d="M49 8 L54 10 L56 15 M52 5 L57 7 L59 12" fill="none" stroke="#1f3a60" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </>
    )
  },
  {
    kod: 'kupa',
    ad: 'Birinci',
    grup: 'eglence',
    cizim: (
      <>
        <path d="M19 13 h-6 a7 7 0 0 0 7 11 M45 13 h6 a7 7 0 0 1 -7 11" fill="none" stroke="#d97706" strokeWidth="3" strokeLinecap="round" />
        <path d="M19 8 H45 V22 a13 13 0 0 1 -26 0 Z" fill="#fbbf24" stroke="#d97706" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M25 12 v9" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
        <rect x="29" y="34" width="6" height="8" fill="#d97706" />
        <rect x="18" y="42" width="28" height="13" rx="2.5" fill="#1f3a60" />
        <text x="32" y="51.6" fontSize="7.6" fill="#fde68a" textLength="20" lengthAdjust="spacingAndGlyphs" {...yazi}>NO.1</text>
      </>
    )
  },
  {
    kod: 'arti1',
    ad: '+1',
    grup: 'eglence',
    cizim: (
      <>
        <path
          d="M9 12 h46 a6 6 0 0 1 6 6 v20 a6 6 0 0 1 -6 6 H27 l-11 10 v-10 H9 a6 6 0 0 1 -6 -6 V18 a6 6 0 0 1 6 -6 Z"
          fill="#8b5cf6"
          stroke="#6d28d9"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <text x="32" y="35.5" fontSize="17" fill="#fff" {...yazi}>+1</text>
      </>
    )
  },
  {
    kod: 'ates',
    ad: 'Çok iyi gidiyor',
    grup: 'eglence',
    cizim: (
      <>
        <path
          d="M32 4 C36 17 49 22 49 39 A17 17 0 0 1 15 39 C15 29 23 25 23 16 C27 20 30 23 32 4 Z"
          fill="#f97316"
          stroke="#c2410c"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="M32 26 C34 32 41 35 41 43 A9 9 0 0 1 23 43 C23 37 30 35 32 26 Z" fill="#fde047" />
      </>
    )
  },
  {
    kod: 'konfeti',
    ad: 'Yaşasın',
    grup: 'eglence',
    cizim: (
      <>
        <path d="M8 57 L20 25 L40 45 Z" fill="#f59e0b" stroke="#b45309" strokeWidth="2" strokeLinejoin="round" />
        <path d="M14 41 L25 51 M17 33 L32 47" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" opacity="0.8" />
        <path d="M30 22 q6 -8 2 -14 M38 30 q8 -2 12 -9 M42 40 q8 2 14 -2" fill="none" stroke="#8b5cf6" strokeWidth="2.4" strokeLinecap="round" />
        <rect x="44" y="8" width="5" height="5" rx="1" fill="#22c55e" transform="rotate(20 46 10)" />
        <rect x="52" y="30" width="5" height="5" rx="1" fill="#e5484d" transform="rotate(-25 54 32)" />
        <circle cx="24" cy="10" r="2.6" fill="#3b82f6" />
        <circle cx="56" cy="48" r="2.4" fill="#f59e0b" />
        <circle cx="38" cy="14" r="2" fill="#e5484d" />
      </>
    )
  },
  {
    kod: 'raptiye',
    ad: 'Raptiye',
    grup: 'eglence',
    cizim: (
      <>
        <line x1="32" y1="36" x2="32" y2="60" stroke="#8a8f94" strokeWidth="3" strokeLinecap="round" />
        <path d="M20 36 h24 l-4 -7 H24 Z" fill="#b4232a" />
        <path d="M24 29 V17 h16 V29 Z" fill="#e5484d" />
        <rect x="18" y="8" width="28" height="10" rx="5" fill="#ff5a4e" stroke="#b4232a" strokeWidth="2" />
        <ellipse cx="25" cy="11.5" rx="4" ry="1.8" fill="#fff" opacity="0.6" />
      </>
    )
  },
  {
    kod: 'tesekkur',
    ad: 'Teşekkürler',
    grup: 'eglence',
    cizim: (
      <>
        <path d="M32 44 C14 33 9 23 12 15 C15 7 27 5 32 15 C37 5 49 7 52 15 C55 23 50 33 32 44 Z" fill="#ff5d8f" stroke="#e03a70" strokeWidth="2" />
        <ellipse cx="20" cy="16" rx="4.5" ry="2.6" fill="#fff" opacity="0.55" transform="rotate(-35 20 16)" />
        <rect x="6" y="39" width="52" height="15" rx="4" fill="#fff" stroke="#e03a70" strokeWidth="2" />
        <text x="32" y="50" fontSize="8.6" fill="#e03a70" textLength="38" lengthAdjust="spacingAndGlyphs" {...yazi}>SAĞ OL</text>
      </>
    )
  },
  {
    kod: 'havali',
    ad: 'Havalı',
    grup: 'eglence',
    cizim: (
      <>
        <circle cx="32" cy="32" r="26" fill="#fde047" stroke="#ca8a04" strokeWidth="2" />
        <path d="M12 25 H52" stroke="#1f2937" strokeWidth="2.5" strokeLinecap="round" />
        <path
          d="M13 25 h16 v5 a6 6 0 0 1 -6 6 h-4 a6 6 0 0 1 -6 -6 Z M35 25 h16 v5 a6 6 0 0 1 -6 6 h-4 a6 6 0 0 1 -6 -6 Z"
          fill="#1f2937"
        />
        <path d="M17 27.5 l4 0" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
        <path d="M23 44 Q33 51 42 42" fill="none" stroke="#7a4b00" strokeWidth="3" strokeLinecap="round" />
      </>
    )
  },
  {
    kod: 'pil',
    ad: 'Enerjim bitti',
    grup: 'eglence',
    cizim: (
      <>
        <rect x="5" y="19" width="47" height="26" rx="5" fill="#fff" stroke="#334155" strokeWidth="3" />
        <rect x="52" y="26.5" width="6" height="11" rx="2" fill="#334155" />
        <rect x="9.5" y="23.5" width="8" height="17" rx="2" fill="#e5484d" />
        <text x="35" y="36" fontSize="10" fill="#334155" textLength="18" lengthAdjust="spacingAndGlyphs" {...yazi}>%5</text>
      </>
    )
  },
  {
    kod: 'cuma',
    ad: 'Cuma!',
    grup: 'eglence',
    cizim: (
      <>
        <polygon
          points="32.00,3.00 37.69,10.75 46.50,6.89 47.56,16.44 57.11,17.50 53.25,26.31 61.00,32.00 53.25,37.69 57.11,46.50 47.56,47.56 46.50,57.11 37.69,53.25 32.00,61.00 26.31,53.25 17.50,57.11 16.44,47.56 6.89,46.50 10.75,37.69 3.00,32.00 10.75,26.31 6.89,17.50 16.44,16.44 17.50,6.89 26.31,10.75"
          fill="#facc15"
          stroke="#ca8a04"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <text x="32" y="36.5" fontSize="12" fill="#b91c1c" transform="rotate(-8 32 32)" textLength="40" lengthAdjust="spacingAndGlyphs" {...yazi}>CUMA!</text>
      </>
    )
  }
]

/** Onceki paketten kalan cikartmalar kaybolmasin: eski kod -> yeni paketteki en yakini. */
const ESKI_KODLAR: Record<string, string> = {
  yildiz: 'harika',
  kalp: 'tesekkur',
  cicek: 'tesekkur',
  yaprak: 'onay',
  gunes: 'harika',
  bulut: 'bekliyor',
  simsek: 'ates',
  ay: 'bekliyor',
  gokkusagi: 'konfeti',
  gulen: 'havali'
}

export const cikartmaBul = (kod: string): CikartmaTanim | undefined =>
  CIKARTMALAR.find((c) => c.kod === (ESKI_KODLAR[kod] ?? kod))
