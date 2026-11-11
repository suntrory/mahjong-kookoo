import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { TILE_TYPES, boundsOf, isFree } from '../lib/mahjong'
import type { Puzzle } from '../lib/mahjong'
import { neighboursFor } from '../hooks/useGame'
import { tileFace, tileLabel } from '../lib/tiles'
import { t } from '../lib/i18n'
import type { Lang } from '../lib/i18n'
import { Icon } from './Icons'

interface BoardProps {
  puzzle: Puzzle
  removed: boolean[]
  selected: number | null
  hintCells: number[]
  lang: Lang
  dimCovered: boolean
  highlightMatch: boolean
  paused: boolean
  onSelect: (cell: number) => void
  onResume: () => void
}

const BASE_W = 56
const BASE_H = 74
/** Thickness of a tile as drawn (its side extrudes down-left by this much). */
const DEPTH = 7
const CJK_NUMERALS = ['一', '二', '三', '四', '五', '六', '七', '八', '九']

function Face({ typeId }: { typeId: number }) {
  const face = tileFace(typeId)
  const value = TILE_TYPES[typeId]?.value ?? 1

  if (face.pips > 0) {
    return (
      <span className="tile-face" aria-hidden="true">
        <span className="tile-index">{face.number}</span>
        <span className={`pips pips--${face.suit}`} data-count={face.pips}>
          {Array.from({ length: face.pips }, (_, k) => (
            <span key={k} className="pip" />
          ))}
        </span>
      </span>
    )
  }

  if (face.suit === 'chars') {
    return (
      <span className="tile-face tile-face--chars" aria-hidden="true">
        <span className="tile-index">{face.number}</span>
        <span className="tile-rank">{CJK_NUMERALS[value - 1]}</span>
        <span className="tile-wan">{face.glyph}</span>
      </span>
    )
  }

  return (
    <span className="tile-face" aria-hidden="true">
      <span className="tile-glyph">{face.glyph}</span>
    </span>
  )
}

export function Board({
  puzzle,
  removed,
  selected,
  hintCells,
  lang,
  dimCovered,
  highlightMatch,
  paused,
  onSelect,
  onResume,
}: BoardProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const [scale, setScale] = useState(1)

  const bounds = useMemo(() => boundsOf(puzzle.slots), [puzzle.slots])
  const nb = useMemo(() => neighboursFor(puzzle), [puzzle])
  const free = useMemo(
    () => puzzle.slots.map((_, i) => isFree(i, removed, nb)),
    [puzzle.slots, removed, nb],
  )

  const lift = bounds.maxZ * DEPTH
  const baseW = (bounds.maxX / 2) * BASE_W + lift + DEPTH
  const baseH = (bounds.maxY / 2) * BASE_H + lift + DEPTH

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const measure = () => {
      const availableW = el.clientWidth - 4
      const availableH = Math.max(260, Math.min(window.innerHeight * 0.64, 700))
      setScale(Math.min(1.15, availableW / baseW, availableH / baseH))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [baseW, baseH])

  const selectedType = selected !== null && !removed[selected] ? puzzle.tiles[selected] : -1
  const hintSet = useMemo(() => new Set(hintCells), [hintCells])

  const tileW = BASE_W * scale
  const tileH = BASE_H * scale

  return (
    <div className="board-shell" ref={wrapRef}>
      <div
        className={`board${paused ? ' board--paused' : ''}`}
        style={
          {
            width: baseW * scale,
            height: baseH * scale,
            '--th': `${tileH}px`,
            '--u': `${(DEPTH * scale) / 6}px`,
          } as CSSProperties
        }
        role="grid"
        aria-label={t(lang, 'board.label')}
      >
        {puzzle.slots.map((slot, i) => {
          if (removed[i]) return null
          const typeId = puzzle.tiles[i]
          const type = TILE_TYPES[typeId] ?? TILE_TYPES[0]
          const isSelected = selected === i
          const isHint = hintSet.has(i)
          const isMatch =
            highlightMatch && selectedType >= 0 && typeId === selectedType && !isSelected && free[i]

          const classes = ['tile', `tile--${type.suit}`]
          if (type.suit === 'dragon') classes.push(`tile--dragon-${type.value}`)
          if (!free[i]) classes.push('tile--blocked')
          if (!free[i] && dimCovered) classes.push('tile--dim')
          if (isSelected) classes.push('tile--selected')
          if (isMatch) classes.push('tile--match')
          if (isHint) classes.push('tile--hint')

          // Higher layers sit up and to the right; the side of each tile extrudes
          // down-left, so tiles further left / further down must paint on top.
          const left = (DEPTH + (slot.x / 2) * BASE_W + slot.z * DEPTH) * scale
          const top = (lift + (slot.y / 2) * BASE_H - slot.z * DEPTH) * scale

          return (
            <button
              key={i}
              type="button"
              role="gridcell"
              data-tile={i}
              data-type={typeId}
              data-free={free[i] ? '1' : '0'}
              data-layer={slot.z}
              className={classes.join(' ')}
              style={{
                left,
                top,
                width: tileW,
                height: tileH,
                zIndex: (slot.z + 1) * 10000 + slot.y * 100 + (bounds.maxX - slot.x),
              }}
              aria-label={`${t(lang, 'board.tile', {
                name: tileLabel(lang, typeId),
                col: Math.floor(slot.x / 2) + 1,
                row: Math.floor(slot.y / 2) + 1,
                layer: slot.z + 1,
              })}${t(lang, free[i] ? 'board.free' : 'board.blocked')}`}
              aria-pressed={isSelected}
              onClick={() => onSelect(i)}
            >
              <Face typeId={typeId} />
            </button>
          )
        })}
      </div>

      {paused && (
        <div className="board-paused">
          <div className="board-paused__card">
            <p>{t(lang, 'board.paused')}</p>
            <button type="button" className="btn btn--primary" onClick={onResume}>
              <Icon name="play" size={16} />
              {t(lang, 'topbar.resume')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
