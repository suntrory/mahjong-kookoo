import { useCallback, useEffect, useReducer } from 'react'
import {
  buildNeighbours,
  deal,
  findMoves,
  isFree,
  remainingCount,
  shuffleRemaining,
  verifyPuzzle,
} from '../lib/mahjong'
import type { Difficulty, Neighbours, Puzzle } from '../lib/mahjong'
import { TILE_TYPES } from '../lib/mahjong'
import { tileNameKey } from '../lib/tiles'
import { t } from '../lib/i18n'
import {
  MAX_SHUFFLES,
  clearGame,
  defaultStatsStore,
  loadGame,
  loadSettings,
  loadStats,
  saveGame,
  saveSettings,
  saveStats,
} from '../lib/storage'
import type { GameSnapshot, Settings, StatsStore } from '../lib/storage'

export interface Toast {
  text: string
  tone: 'info' | 'good' | 'bad'
}

export interface Hint {
  kind: 'pair' | 'stuck'
  cells: number[]
  title: string
  body: string
}

export interface GameState {
  puzzle: Puzzle
  removed: boolean[]
  history: Array<[number, number]>
  selected: number | null
  elapsed: number
  paused: boolean
  status: 'playing' | 'won'
  hintsUsed: number
  shufflesUsed: number
  deadEnds: number
  hint: Hint | null
  toast: Toast | null
  stats: StatsStore
  settings: Settings
  createdAt: number
}

export type Action =
  | { type: 'new'; difficulty: Difficulty }
  | { type: 'restart' }
  | { type: 'select'; cell: number }
  | { type: 'hint' }
  | { type: 'shuffle' }
  | { type: 'undo' }
  | { type: 'togglePause' }
  | { type: 'tick' }
  | { type: 'settings'; patch: Partial<Settings> }
  | { type: 'clearStats' }
  | { type: 'dismiss' }
  | { type: 'dismissToast' }

/* ------------------------------------------------------------------ */

const nbCache = new Map<string, Neighbours>()

export function neighboursFor(puzzle: Puzzle): Neighbours {
  const key = `${puzzle.id}:${puzzle.tiles.join('.')}`
  const cached = nbCache.get(key)
  if (cached) return cached
  const nb = buildNeighbours(puzzle.slots)
  if (nbCache.size > 6) nbCache.clear()
  nbCache.set(key, nb)
  return nb
}

function bumpPlayed(stats: StatsStore, difficulty: Difficulty): StatsStore {
  const current = stats.byDifficulty[difficulty]
  return {
    ...stats,
    byDifficulty: { ...stats.byDifficulty, [difficulty]: { ...current, played: current.played + 1 } },
  }
}

function bumpCompleted(state: GameState): StatsStore {
  const difficulty = state.puzzle.difficulty
  const current = state.stats.byDifficulty[difficulty]
  return {
    byDifficulty: {
      ...state.stats.byDifficulty,
      [difficulty]: {
        ...current,
        completed: current.completed + 1,
        bestTime: current.bestTime === null ? state.elapsed : Math.min(current.bestTime, state.elapsed),
        totalTime: current.totalTime + state.elapsed,
        hints: current.hints + state.hintsUsed,
      },
    },
    recent: [
      {
        difficulty,
        time: state.elapsed,
        hints: state.hintsUsed,
        shuffles: state.shufflesUsed,
        at: Date.now(),
      },
      ...state.stats.recent,
    ].slice(0, 12),
  }
}

function freshGame(difficulty: Difficulty, stats: StatsStore, settings: Settings): GameState {
  const puzzle = deal(difficulty)
  return {
    puzzle,
    removed: new Array<boolean>(puzzle.slots.length).fill(false),
    history: [],
    selected: null,
    elapsed: 0,
    paused: false,
    status: 'playing',
    hintsUsed: 0,
    shufflesUsed: 0,
    deadEnds: 0,
    hint: null,
    toast: null,
    stats: bumpPlayed(stats, difficulty),
    settings,
    createdAt: Date.now(),
  }
}

function hydrate(saved: GameSnapshot, stats: StatsStore, settings: Settings): GameState {
  return {
    puzzle: saved.puzzle,
    removed: saved.removed,
    history: saved.history,
    selected: null,
    elapsed: saved.elapsed,
    paused: false,
    status: saved.status,
    hintsUsed: saved.hintsUsed,
    shufflesUsed: saved.shufflesUsed,
    deadEnds: saved.deadEnds,
    hint: null,
    toast: null,
    stats,
    settings,
    createdAt: saved.createdAt,
  }
}

function initState(): GameState {
  const settings = loadSettings()
  const stats = loadStats()
  // ถ้ามีเซฟที่ยังเล่นไม่จบ → เล่นต่อ
  const saved = typeof localStorage !== 'undefined' ? loadGame() : null
  if (saved && saved.status === 'playing') return hydrate(saved, stats, settings)
  return freshGame('easy', stats, settings)
}

function finish(state: GameState): GameState {
  if (state.status === 'won') return state
  return {
    ...state,
    status: 'won',
    paused: false,
    hint: null,
    selected: null,
    toast: { text: t(state.settings.lang, 'toast.cleared'), tone: 'good' },
    stats: bumpCompleted(state),
  }
}

/* ------------------------------------------------------------------ */

function reducer(state: GameState, action: Action): GameState {
  const lang = state.settings.lang

  switch (action.type) {
    case 'new':
      return freshGame(action.difficulty, state.stats, state.settings)

    case 'restart': {
      const puzzle = state.puzzle
      return {
        ...state,
        removed: new Array<boolean>(puzzle.slots.length).fill(false),
        history: [],
        selected: null,
        elapsed: 0,
        paused: false,
        status: 'playing',
        hintsUsed: 0,
        shufflesUsed: 0,
        deadEnds: 0,
        hint: null,
        toast: { text: t(lang, 'toast.restarted'), tone: 'info' },
        createdAt: Date.now(),
      }
    }

    case 'select': {
      if (state.status !== 'playing' || state.paused) return state
      const cell = action.cell
      if (state.removed[cell]) return state
      const nb = neighboursFor(state.puzzle)
      if (!isFree(cell, state.removed, nb)) {
        return { ...state, toast: { text: t(lang, 'board.blockedToast'), tone: 'info' }, hint: null }
      }
      if (state.selected === null) return { ...state, selected: cell, hint: null }
      if (state.selected === cell) return { ...state, selected: null }

      const first = state.selected
      if (state.puzzle.tiles[first] !== state.puzzle.tiles[cell]) {
        return { ...state, selected: cell, hint: null }
      }

      const removed = state.removed.slice()
      removed[first] = true
      removed[cell] = true
      const history: Array<[number, number]> = [...state.history, [first, cell]]
      const next: GameState = { ...state, removed, history, selected: null, hint: null }

      if (remainingCount(removed) === 0) return finish(next)

      const after = neighboursFor(next.puzzle)
      if (findMoves(next.puzzle.tiles, removed, after).length === 0) {
        return {
          ...next,
          deadEnds: next.deadEnds + 1,
          toast: { text: t(lang, 'toast.noMoves'), tone: 'bad' },
        }
      }
      return next
    }

    case 'hint': {
      if (state.status !== 'playing') return state
      const nb = neighboursFor(state.puzzle)
      const moves = findMoves(state.puzzle.tiles, state.removed, nb)
      if (!moves.length) {
        const stuck: Hint = {
          kind: 'stuck',
          cells: [],
          title: t(lang, 'hint.title.stuck'),
          body: t(lang, 'hint.body.stuck'),
        }
        return { ...state, hint: stuck, hintsUsed: state.hintsUsed + 1, selected: null }
      }
      const [a, b] = moves[Math.floor(Math.random() * moves.length)]
      const pos = (index: number) => {
        const slot = state.puzzle.slots[index]
        const base = `C${Math.floor(slot.x / 2) + 1} R${Math.floor(slot.y / 2) + 1}`
        return slot.z ? `${base} L${slot.z + 1}` : base
      }
      const nameOf = (index: number) => {
        const type = state.puzzle.tiles[index]
        return `${t(lang, tileNameKey(type), { n: TILE_TYPES[type].value })} (${pos(index)})`
      }
      const nameA = nameOf(a)
      const nameB = nameOf(b)
      const hint: Hint = {
        kind: 'pair',
        cells: [a, b],
        title: t(lang, 'hint.title.pair'),
        body: t(lang, 'hint.body.pair', { a: nameA, b: nameB }),
      }
      return { ...state, hint, hintsUsed: state.hintsUsed + 1, selected: null }
    }

    case 'shuffle': {
      if (state.status !== 'playing') return state
      if (state.shufflesUsed >= MAX_SHUFFLES) {
        return { ...state, toast: { text: t(lang, 'toast.noShuffles'), tone: 'bad' } }
      }
      try {
        const result = shuffleRemaining(state.puzzle, state.removed)
        const puzzle: Puzzle = { ...state.puzzle, tiles: result.tiles, witness: result.witness }
        if (!verifyPuzzle({ ...puzzle, witness: result.witness }).ok) {
          return { ...state, toast: { text: t(lang, 'toast.noMoves'), tone: 'bad' } }
        }
        return {
          ...state,
          puzzle,
          selected: null,
          hint: null,
          shufflesUsed: state.shufflesUsed + 1,
          toast: {
            text: t(lang, 'toast.shuffled', { n: remainingCount(state.removed) }),
            tone: 'info',
          },
        }
      } catch {
        return { ...state, toast: { text: t(lang, 'toast.noMoves'), tone: 'bad' } }
      }
    }

    case 'undo': {
      if (!state.history.length || state.status !== 'playing') return state
      const history = state.history.slice()
      const last = history.pop()
      if (!last) return state
      const removed = state.removed.slice()
      removed[last[0]] = false
      removed[last[1]] = false
      return {
        ...state,
        removed,
        history,
        selected: null,
        hint: null,
        toast: { text: t(lang, 'toast.undone'), tone: 'info' },
      }
    }

    case 'togglePause':
      if (state.status !== 'playing') return state
      return { ...state, paused: !state.paused, hint: null, selected: null }

    case 'tick':
      if (state.status !== 'playing' || state.paused) return state
      return { ...state, elapsed: state.elapsed + 1 }

    case 'settings': {
      const settings = { ...state.settings, ...action.patch }
      return { ...state, settings }
    }

    case 'clearStats':
      return {
        ...state,
        stats: defaultStatsStore(),
        toast: { text: t(lang, 'toast.statsCleared'), tone: 'info' },
      }

    case 'dismiss':
      return { ...state, hint: null }

    case 'dismissToast':
      return { ...state, toast: null }

    default:
      return state
  }
}

/* ------------------------------------------------------------------ */

function toSnapshot(state: GameState): GameSnapshot {
  return {
    puzzle: state.puzzle,
    removed: state.removed,
    history: state.history,
    elapsed: state.elapsed,
    hintsUsed: state.hintsUsed,
    shufflesUsed: state.shufflesUsed,
    deadEnds: state.deadEnds,
    status: state.status,
    createdAt: state.createdAt,
    updatedAt: Date.now(),
  }
}

export function useGame() {
  const [state, dispatch] = useReducer(reducer, undefined, initState)

  const elapsedBucket = Math.floor(state.elapsed / 5)
  useEffect(() => {
    saveGame(toSnapshot(state))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    state.puzzle,
    state.removed,
    state.history,
    state.status,
    state.hintsUsed,
    state.shufflesUsed,
    state.createdAt,
    elapsedBucket,
  ])

  useEffect(() => {
    saveStats(state.stats)
  }, [state.stats])

  useEffect(() => {
    saveSettings(state.settings)
  }, [state.settings])

  useEffect(() => {
    if (state.status !== 'playing' || state.paused) return
    const id = window.setInterval(() => dispatch({ type: 'tick' }), 1000)
    return () => window.clearInterval(id)
  }, [state.status, state.paused])

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) dispatch({ type: 'togglePause' })
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  const newGame = useCallback((difficulty: Difficulty) => dispatch({ type: 'new', difficulty }), [])
  const restart = useCallback(() => dispatch({ type: 'restart' }), [])
  const select = useCallback((cell: number) => dispatch({ type: 'select', cell }), [])
  const hint = useCallback(() => dispatch({ type: 'hint' }), [])
  const shuffle = useCallback(() => dispatch({ type: 'shuffle' }), [])
  const undo = useCallback(() => dispatch({ type: 'undo' }), [])
  const togglePause = useCallback(() => dispatch({ type: 'togglePause' }), [])
  const updateSettings = useCallback(
    (patch: Partial<Settings>) => dispatch({ type: 'settings', patch }),
    [],
  )
  const clearStats = useCallback(() => dispatch({ type: 'clearStats' }), [])
  const dismiss = useCallback(() => dispatch({ type: 'dismiss' }), [])
  const dismissToast = useCallback(() => dispatch({ type: 'dismissToast' }), [])
  const resetEverything = useCallback(() => {
    clearGame()
    dispatch({ type: 'clearStats' })
  }, [])

  return {
    state,
    actions: {
      newGame,
      restart,
      select,
      hint,
      shuffle,
      undo,
      togglePause,
      updateSettings,
      clearStats,
      dismiss,
      dismissToast,
      resetEverything,
    },
  }
}
