import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import './globals.css'

export const metadata: Metadata = {
  title: 'Mahjong Solitaire · 3 difficulty levels',
  description:
    'Mahjong Solitaire with three difficulty levels, hints, shuffles and every deal verified solvable. English/Thai, dark & light themes, stats stored in your browser.',
  icons: { icon: '/favicon.svg' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0e1512',
}

// Applies the saved (or system) theme before first paint, so there is no flash.
const THEME_BOOT = `(function(){try{var t=localStorage.getItem('mahjong.v1.theme');if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme='dark'}})()`

const FONTS =
  'https://fonts.googleapis.com/css2?family=Bai+Jamjuree:wght@400;500;600;700&family=Trirong:wght@500;600;700&display=swap'
// Only the glyphs printed on tiles and the seal are fetched from the CJK face.
const TILE_GLYPHS = encodeURIComponent('東南西北中發白萬花季一二三四五六七八九麻雀')
const CJK_FONT = `https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@700;900&text=${TILE_GLYPHS}&display=swap`

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href={FONTS} />
        <link rel="stylesheet" href={CJK_FONT} />
      </head>
      <body>{children}</body>
    </html>
  )
}
