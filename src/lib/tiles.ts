import { DRAGON_CHARS, TILE_TYPES, WIND_CHARS } from './mahjong'
import { t } from './i18n'
import type { Lang } from './i18n'

/** key ในพจนานุกรมสำหรับชื่อไพ่ */
export function tileNameKey(typeId: number): string {
  const type = TILE_TYPES[typeId]
  if (!type) return 'tile.dots'
  if (type.suit === 'dots' || type.suit === 'bamboo' || type.suit === 'chars') return `tile.${type.suit}`
  if (type.suit === 'wind') return `tile.wind.${type.value}`
  if (type.suit === 'dragon') return `tile.dragon.${type.value}`
  return `tile.${type.suit}`
}

export function tileLabel(lang: Lang, typeId: number): string {
  const type = TILE_TYPES[typeId]
  const n = type ? type.value : 0
  return t(lang, tileNameKey(typeId), { n })
}

export interface TileFace {
  suit: 'dots' | 'bamboo' | 'chars' | 'wind' | 'dragon' | 'flower' | 'season'
  /** ตัวใหญ่กลางไพ่ (ถ้าไม่มี pips) */
  glyph: string
  /** ตัวเลขมุมบน (เฉพาะชุด) */
  number: number | null
  /** จำนวนจุด/แท่งที่ต้องวาด */
  pips: number
}

export function tileFace(typeId: number): TileFace {
  const type = TILE_TYPES[typeId] ?? TILE_TYPES[0]
  switch (type.suit) {
    case 'dots':
    case 'bamboo':
      return { suit: type.suit, glyph: '', number: type.value, pips: type.value }
    case 'chars':
      return { suit: 'chars', glyph: '萬', number: type.value, pips: 0 }
    case 'wind':
      return { suit: 'wind', glyph: WIND_CHARS[type.value - 1] ?? '東', number: null, pips: 0 }
    case 'dragon':
      return { suit: 'dragon', glyph: DRAGON_CHARS[type.value - 1] ?? '中', number: null, pips: 0 }
    case 'flower':
      return { suit: 'flower', glyph: '花', number: null, pips: 0 }
    default:
      return { suit: 'season', glyph: '季', number: null, pips: 0 }
  }
}
