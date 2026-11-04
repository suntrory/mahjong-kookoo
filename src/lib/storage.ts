import { DIFFICULTIES, replayHistory, verifyPuzzle } from './mahjong'
import type { Difficulty, Puzzle } from './mahjong'
import { DEFAULT_LANG, isLang } from './i18n'
import type { Lang } from './i18n'

const GAME_KEY = 'mahjong.v1.game'
const STATS_KEY = 'mahjong.v1.stats'
const SETTINGS_KEY = 'mahjong.v1.settings'

export const MAX_SHUFFLES = 3

export interface GameSnapshot {
  puzzle: Puzzle
  removed: boolean[]
  history: Array<[number, number]>
  elapsed: number
  hintsUsed: number
  shufflesUsed: number
  deadEnds: number
  status: 'playing' | 'won'
  createdAt: number
  updatedAt: number
}

export interface DifficultyStats {
  played: number
  completed: number
  bestTime: number | null
  totalTime: number
  hints: number
}

export type Stats = Record<Difficulty, DifficultyStats>

export interface RecentGame {
  difficulty: Difficulty
  time: number
  hints: number
  shuffles: number
  at: number
}

export interface StatsStore {
  byDifficulty: Stats
  recent: RecentGame[]
}

export interface Settings {
  /** หรี่ไพ่ที่หยิบไม่ได้ */
  dimCovered: boolean
  /** เลือกไพ่แล้วไฮไลต์คู่ที่หยิบได้ */
  highlightMatch: boolean
  lang: Lang
}

export const DEFAULT_SETTINGS: Settings = {
  dimCovered: true,
  highlightMatch: true,
  lang: DEFAULT_LANG,
}

export function emptyStats(): Stats {
  return DIFFICULTIES.reduce((acc, d) => {
    acc[d] = { played: 0, completed: 0, bestTime: null, totalTime: 0, hints: 0 }
    return acc
  }, {} as Stats)
}

export function defaultStatsStore(): StatsStore {
  return { byDifficulty: emptyStats(), recent: [] }
}

function readJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function writeJSON(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

const isBoolArray = (v: unknown): v is boolean[] =>
  Array.isArray(v) && v.every((x) => typeof x === 'boolean')

export function loadGame(): GameSnapshot | null {
  const snap = readJSON<GameSnapshot>(GAME_KEY)
  if (!snap || typeof snap !== 'object') return null
  const puzzle = snap.puzzle
  if (!puzzle || !Array.isArray(puzzle.slots) || !Array.isArray(puzzle.tiles)) return null
  if (!DIFFICULTIES.includes(puzzle.difficulty)) return null
  if (puzzle.slots.length !== puzzle.tiles.length) return null
  if (!Array.isArray(puzzle.witness)) return null
  if (!isBoolArray(snap.removed) || snap.removed.length !== puzzle.slots.length) return null
  if (!Array.isArray(snap.history)) return null

  // ตรวจว่า deal นี้ยังแก้ได้ด้วย witness
  const deal = verifyPuzzle(puzzle)
  if (!deal.ok) return null

  // ตรวจว่าประวัติการเล่นถูกกติกา และตรงกับ removed ที่บันทึกไว้
  const replay = replayHistory(puzzle, snap.history)
  if (!replay.ok) return null
  if (replay.removed.some((r, i) => r !== snap.removed[i])) return null

  return {
    ...snap,
    elapsed: Number.isFinite(snap.elapsed) ? Math.max(0, Math.floor(snap.elapsed)) : 0,
    hintsUsed: Math.max(0, snap.hintsUsed | 0),
    shufflesUsed: Math.max(0, snap.shufflesUsed | 0),
    deadEnds: Math.max(0, snap.deadEnds | 0),
    status: snap.status === 'won' ? 'won' : 'playing',
    createdAt: snap.createdAt || Date.now(),
    updatedAt: snap.updatedAt || Date.now(),
  }
}

export function saveGame(snapshot: GameSnapshot): void {
  writeJSON(GAME_KEY, snapshot)
}

export function clearGame(): void {
  try {
    localStorage.removeItem(GAME_KEY)
  } catch {
    /* ignore */
  }
}

export function loadStats(): StatsStore {
  const raw = readJSON<StatsStore>(STATS_KEY)
  if (!raw || !raw.byDifficulty) return defaultStatsStore()
  const byDifficulty = emptyStats()
  for (const d of DIFFICULTIES) {
    const s = raw.byDifficulty[d]
    if (!s) continue
    byDifficulty[d] = {
      played: Math.max(0, s.played | 0),
      completed: Math.max(0, s.completed | 0),
      bestTime: Number.isFinite(s.bestTime) ? (s.bestTime as number) : null,
      totalTime: Math.max(0, s.totalTime | 0),
      hints: Math.max(0, s.hints | 0),
    }
  }
  const recent = Array.isArray(raw.recent)
    ? raw.recent.filter((r) => DIFFICULTIES.includes(r.difficulty)).slice(0, 12)
    : []
  return { byDifficulty, recent }
}

export function saveStats(stats: StatsStore): void {
  writeJSON(STATS_KEY, stats)
}

export function loadSettings(): Settings {
  const raw = readJSON<Partial<Settings>>(SETTINGS_KEY)
  if (!raw) return { ...DEFAULT_SETTINGS }
  return {
    dimCovered: typeof raw.dimCovered === 'boolean' ? raw.dimCovered : DEFAULT_SETTINGS.dimCovered,
    highlightMatch:
      typeof raw.highlightMatch === 'boolean' ? raw.highlightMatch : DEFAULT_SETTINGS.highlightMatch,
    lang: isLang(raw.lang) ? raw.lang : DEFAULT_SETTINGS.lang,
  }
}

export function saveSettings(settings: Settings): void {
  writeJSON(SETTINGS_KEY, settings)
}

export function storageUsage(): { bytes: number; entries: number } {
  let bytes = 0
  let entries = 0
  try {
    for (const key of [GAME_KEY, STATS_KEY, SETTINGS_KEY, 'mahjong.v1.theme']) {
      const v = localStorage.getItem(key)
      if (v) {
        bytes += v.length * 2
        entries++
      }
    }
  } catch {
    /* ignore */
  }
  return { bytes, entries }
}

export const STORAGE_KEYS = { GAME_KEY, STATS_KEY, SETTINGS_KEY }
