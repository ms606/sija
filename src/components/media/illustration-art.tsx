import type { ReactNode } from 'react'

/**
 * Original line-art illustrations for core demo nouns (created for this app).
 * Drawn on a 64×64 grid with currentColor, so they follow the theme.
 */
const A = { fill: 'currentColor', fillOpacity: 0.14, stroke: 'none' } as const

export const ART: Record<string, ReactNode> = {
  talo: (
    <>
      <path d="M10 30 32 12l22 18" />
      <path d="M15 27v25h34V27" />
      <rect {...A} x="15" y="27" width="34" height="25" />
      <path d="M27 52V38h10v14" />
      <rect x="19" y="32" width="6" height="6" />
      <rect x="39" y="32" width="6" height="6" />
      <path d="M43 17v6" />
    </>
  ),
  auto: (
    <>
      <path d="M8 40v-6l6-2 6-9h22l8 9 6 2v6z" />
      <path {...A} d="M8 40v-6l6-2 6-9h22l8 9 6 2v6z" />
      <path d="M22 32h22l-5-7H25z" />
      <circle cx="19" cy="42" r="5" />
      <circle cx="45" cy="42" r="5" />
      <path d="M6 46h52" opacity=".4" />
    </>
  ),
  poyta: (
    <>
      <rect {...A} x="8" y="24" width="48" height="6" rx="1.5" />
      <rect x="8" y="24" width="48" height="6" rx="1.5" />
      <path d="M13 30v22M51 30v22M19 30v14M45 30v14" />
      <path d="M26 24v-6h12v6" />
    </>
  ),
  tuoli: (
    <>
      <path d="M22 10v26M42 10v26M22 14h20M22 22h20" />
      <rect {...A} x="18" y="34" width="28" height="6" rx="1.5" />
      <rect x="18" y="34" width="28" height="6" rx="1.5" />
      <path d="M21 40v14M43 40v14" />
    </>
  ),
  kirja: (
    <>
      <path {...A} d="M32 18C26 13 16 13 9 15v32c7-2 17-2 23 3 6-5 16-5 23-3V15c-7-2-17-2-23 3z" />
      <path d="M32 18C26 13 16 13 9 15v32c7-2 17-2 23 3 6-5 16-5 23-3V15c-7-2-17-2-23 3z" />
      <path d="M32 18v32M15 24h11M15 30h11M38 24h11M38 30h11" />
    </>
  ),
  koira: (
    <>
      <path d="M16 30c0-8 6-14 14-14h6l8 6v8c0 4-3 6-6 6H22l-6 6z" />
      <path {...A} d="M16 30c0-8 6-14 14-14h6l8 6v8c0 4-3 6-6 6H22l-6 6z" />
      <path d="M44 22l6-2-1 8M24 36v14M36 36v14M48 30c4 0 6 4 4 8" />
      <circle cx="38" cy="24" r="1.6" fill="currentColor" />
      <path d="M44 28h3" />
    </>
  ),
  kissa: (
    <>
      <path d="M16 22 18 8l10 9h8l10-9 2 14c3 4 3 11 0 16-4 7-12 10-16 10s-12-3-16-10c-3-5-3-12 0-16z" />
      <path {...A} d="M16 22 18 8l10 9h8l10-9 2 14c3 4 3 11 0 16-4 7-12 10-16 10s-12-3-16-10c-3-5-3-12 0-16z" />
      <circle cx="25" cy="30" r="2" fill="currentColor" />
      <circle cx="39" cy="30" r="2" fill="currentColor" />
      <path d="M30 37h4l-2 2zM32 39v3M24 41l-10 2M40 41l10 2M24 38l-10-1M40 38l10-1" />
    </>
  ),
  omena: (
    <>
      <path d="M32 20c-4-4-14-4-17 4s0 20 7 25c3 2 6 2 10 0 4 2 7 2 10 0 7-5 10-17 7-25s-13-8-17-4z" />
      <path {...A} d="M32 20c-4-4-14-4-17 4s0 20 7 25c3 2 6 2 10 0 4 2 7 2 10 0 7-5 10-17 7-25s-13-8-17-4z" />
      <path d="M32 20c0-4 1-8 4-11" />
      <path d="M36 12c4-3 9-3 11 0-4 3-8 3-11 0z" />
    </>
  ),
  vesi: (
    <>
      <path d="M18 14h28l-4 38H22z" />
      <path {...A} d="M20 30h24l-2 22H22z" />
      <path d="M20 30h24" />
      <path d="M32 6c3 4 5 6 5 9a5 5 0 0 1-10 0c0-3 2-5 5-9z" />
    </>
  ),
  kahvi: (
    <>
      <path d="M14 26h30v12c0 8-6 14-15 14S14 46 14 38z" />
      <path {...A} d="M14 26h30v12c0 8-6 14-15 14S14 46 14 38z" />
      <path d="M44 30h4a5 5 0 0 1 0 10h-4" />
      <path d="M10 56h40" />
      <path d="M22 20c-2-3 2-5 0-8M30 20c-2-3 2-5 0-8M38 20c-2-3 2-5 0-8" />
    </>
  ),
  lapsi: (
    <>
      <circle cx="32" cy="16" r="7" />
      <path {...A} d="M24 28h16l3 14h-6v12H27V42h-6z" />
      <path d="M24 28h16l3 14h-6v12H27V42h-6z" />
      <path d="M24 30l-8 8M40 30l8 8M32 54v-8" />
    </>
  ),
  kauppa: (
    <>
      <path d="M10 26h44l-4-12H14z" />
      <path {...A} d="M10 26h44v4a5 5 0 0 1-11 0 5 5 0 0 1-11 0 5 5 0 0 1-11 0 5 5 0 0 1-11 0z" />
      <path d="M10 26v4a5 5 0 0 0 11 0 5 5 0 0 0 11 0 5 5 0 0 0 11 0 5 5 0 0 0 11 0v-4" />
      <path d="M14 34v18h36V34" />
      <path d="M20 52V40h8v12M34 40h10v7H34z" />
    </>
  ),
  pankki: (
    <>
      <path d="M8 24 32 10l24 14z" />
      <path {...A} d="M8 24 32 10l24 14z" />
      <path d="M12 28h40M14 28v20M24 28v20M40 28v20M50 28v20M10 50h44M8 54h48" />
      <circle cx="32" cy="19" r="2.5" />
    </>
  ),
  bussi: (
    <>
      <rect x="10" y="12" width="44" height="34" rx="6" />
      <rect {...A} x="10" y="12" width="44" height="34" rx="6" />
      <path d="M10 30h44M16 18h14v8H16zM34 18h14v8H34z" />
      <circle cx="20" cy="48" r="4" />
      <circle cx="44" cy="48" r="4" />
      <path d="M16 38h4M44 38h4" />
    </>
  ),
  koulu: (
    <>
      <path d="M12 28h40v24H12z" />
      <path {...A} d="M12 28h40v24H12z" />
      <path d="M8 30 32 16l24 14" />
      <path d="M32 16V6l9 3-9 3" />
      <path d="M28 52V42h8v10M17 34h7v5h-7zM40 34h7v5h-7z" />
    </>
  ),
  jarvi: (
    <>
      <path {...A} d="M6 38c8-6 18-6 26 0s18 6 26 0v18H6z" />
      <path d="M6 38c8-6 18-6 26 0s18 6 26 0" />
      <path d="M8 48c6-3 10-3 16 0M34 48c6-3 10-3 16 0" />
      <path d="M16 30V12l-6 10h12l-6-10M16 22l-5 8h10z" />
      <circle cx="48" cy="16" r="5" />
    </>
  ),
  saari: (
    <>
      <path {...A} d="M14 40c4-6 32-6 36 0z" />
      <path d="M14 40c4-6 32-6 36 0" />
      <path d="M6 46c6-3 10-3 16 0s10 3 16 0 10-3 20 0" />
      <path d="M32 36V18M32 18c-6-4-12-2-14 2M32 18c6-4 12-2 14 2M32 18c-2-5 0-9 4-11" />
    </>
  ),
  puu: (
    <>
      <circle {...A} cx="32" cy="24" r="16" />
      <path d="M20 34c-8-3-8-15 0-18 0-8 12-10 15-5 6-3 14 2 12 9 6 3 5 13-2 14" />
      <path d="M32 54V34M32 42l-6-5M32 38l6-5M24 54h16" />
    </>
  ),
  kuusi: (
    <>
      <path {...A} d="M32 6 18 26h7L14 40h9L10 52h44L41 40h9L39 26h7z" />
      <path d="M32 6 18 26h7L14 40h9L10 52h44L41 40h9L39 26h7z" />
      <path d="M32 52v6" />
    </>
  ),
  kasi: (
    <>
      <path {...A} d="M22 54c-6-6-10-14-10-20l4-2 6 8V14a3 3 0 0 1 6 0v14V10a3 3 0 0 1 6 0v18V13a3 3 0 0 1 6 0v17-11a3 3 0 0 1 6 0v19c0 8-4 14-8 17z" />
      <path d="M22 54c-6-6-10-14-10-20l4-2 6 8V14a3 3 0 0 1 6 0v14V10a3 3 0 0 1 6 0v18V13a3 3 0 0 1 6 0v17-11a3 3 0 0 1 6 0v19c0 8-4 14-8 17z" />
    </>
  ),
  avain: (
    <>
      <circle cx="20" cy="32" r="10" />
      <circle {...A} cx="20" cy="32" r="10" />
      <circle cx="20" cy="32" r="3.5" />
      <path d="M30 32h26M48 32v8M54 32v6M40 32v5" />
    </>
  ),
  puhelin: (
    <>
      <rect x="20" y="6" width="24" height="52" rx="5" />
      <rect {...A} x="23" y="12" width="18" height="36" rx="1.5" />
      <path d="M29 9h6M30 53h4" />
    </>
  ),
  ovi: (
    <>
      <path d="M18 56V8h28v48" />
      <path {...A} d="M18 56V8h28v48z" />
      <path d="M12 56h40M24 14h16v16H24zM24 36h16v14H24z" />
      <circle cx="41" cy="33" r="1.8" fill="currentColor" />
    </>
  ),
  kala: (
    <>
      <path {...A} d="M8 32c8-12 26-14 38-4l10-8v24l-10-8C34 46 16 44 8 32z" />
      <path d="M8 32c8-12 26-14 38-4l10-8v24l-10-8C34 46 16 44 8 32z" />
      <circle cx="18" cy="30" r="1.8" fill="currentColor" />
      <path d="M28 25c2 4 2 10 0 14" />
    </>
  ),
}

export const ILLUSTRATION_IDS = Object.keys(ART)
