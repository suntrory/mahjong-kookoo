import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { boundsOf, isFree } from '../lib/mahjong'
import type { Puzzle } from '../lib/mahjong'
import { neighboursFor } from '../hooks/useGame'
import { tileFace, tileLabel } from '../lib/tiles'
import { t } from '../lib/i18n'
import type { Lang } from '../lib/i18n'

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
const BASE_H = 72
const LIFT = 9

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

  const baseW = (bounds.maxX / 2) * BASE_W
  const baseH = (bounds.maxY / 2) * BASE_H + bounds.maxZ * LIFT

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const measure = () => {
      const availableW = el.clientWidth - 4
      const availableH = Math.max(280, Math.min(window.innerHeight * 0.62, 660))
      setScale(Math.min(1.12, availableW / baseW, availableH / baseH))
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

  const boardW = baseW * scale
  const boardH = baseH * scale

  const selectedType = selected !== null && !removed[selected] ? puzzle.tiles[selected] : -1
  const hintSet = useMemo(() => new Set(hintCells), [hintCells])

  return (
    <div className="board-wrap">
      <div className="board-shell" ref={wrapRef}>
        <div
          className={`board${paused ? ' board--paused' : ''}`}
          style={{ width: boardW, height: boardH }}
          role="grid"
          aria-label={t(lang, 'board.label')}
        >
          {puzzle.slots.map((slot, i) => {
            if (removed[i]) return null
            const face = tileFace(puzzle.tiles[i])
            const isSelected = selected === i
            const isHint = hintSet.has(i)
            const isMatch =
              highlightMatch &&
              selectedType >= 0 &&
              puzzle.tiles[i] === selectedType &&
              !isSelected &&
              free[i]

            const classes = ['tile', `tile--${face.suit}`]
            if (!free[i]) classes.push('tile--blocked')
            if (!free[i] && dimCovered) classes.push('tile--dim')
            if (isSelected) classes.push('tile--selected')
            if (isMatch) classes.push('tile--match')
            if (isHint) classes.push('tile--hint')

            const width = BASE_W * scale - Math.max(1, scale)
            const height = BASE_H * scale - Math.max(1, scale)
            const left = (slot.x / 2) * BASE_W * scale
            const top = (slot.y / 2) * BASE_H * scale - slot.z * LIFT * scale

            return (
              <button
                key={i}
                type="button"
                role="gridcell"
                data-tile={i}
                data-type={puzzle.tiles[i]}
                data-free={free[i] ? '1' : '0'}
                data-layer={slot.z}
                className={classes.join(' ')}
                style={
                  {
                    left,
                    top,
                    width,
                    height,
                    zIndex: (slot.z + 1) * 1000 + slot.y * 10 + slot.x,
                    '--tile-h': `${height}px`,
                  } as CSSProperties
                }
                aria-label={`${t(lang, 'board.tile', {
                  name: tileLabel(lang, puzzle.tiles[i]),
                  col: Math.floor(slot.x / 2) + 1,
                  row: Math.floor(slot.y / 2) + 1,
                  layer: slot.z + 1,
                })}${t(lang, free[i] ? 'board.free' : 'board.blocked')}`}
                aria-pressed={isSelected}
                onClick={() => onSelect(i)}
              >
                <span className="tile-face" aria-hidden="true">
                  {face.number !== null && <span className="tile-num">{face.number}</span>}
                  {face.pips > 0 && (
                    <span className={`tile-pips tile-pips--${face.suit}`}>
                      {Array.from({ length: face.pips }, (_, k) => (
                        <span key={k} className="pip" />
                      ))}
                    </span>
                  )}
                  {face.glyph && <span className="tile-glyph">{face.glyph}</span>}
                </span>
              </button>
            )
          })}
        </div>

        {paused && (
          <div className="board-paused">
            <div className="board-paused__card">
              <span className="board-paused__icon" aria-hidden="true">
                ⏸
              </span>
              <p>{t(lang, 'board.paused')}</p>
              <button type="button" className="btn btn--primary" onClick={onResume}>
                {t(lang, 'topbar.resume')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
