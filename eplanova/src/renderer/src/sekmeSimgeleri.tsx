/**
 * Ayrac sekmelerinin simgeleri: sade cizgi simgeler (24x24, currentColor).
 * Emojiye gore her platformda ayni gorunur. Klasik temada CSS ile gizlenir.
 */
import type { Sekme } from './types'

const CIZIMLER: Record<Sekme, JSX.Element> = {
  bugun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  takvim: (
    <>
      <rect x="3" y="4.5" width="18" height="17" rx="2.5" />
      <path d="M3 10h18M8 2.5v4M16 2.5v4" />
    </>
  ),
  yapiskan: (
    <>
      <path d="M4 4h16v10l-6 6H4z" />
      <path d="M14 20v-6h6" />
    </>
  ),
  notlar: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7.5 18.5 3 20l1.5-4.5z" />
    </>
  ),
  arama: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.5-4.5" />
    </>
  ),
  ayarlar: (
    <>
      <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3" />
      <path d="M1.5 14h5M9.5 8h5M17.5 16h5" />
    </>
  )
}

export default function SekmeSimgesi({ kod }: { kod: Sekme }): JSX.Element {
  return (
    <svg
      className="sekme-ikon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {CIZIMLER[kod]}
    </svg>
  )
}
