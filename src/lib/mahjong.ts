/**
 * Mahjong Solitaire engine
 * ------------------------------------------------------------------
 * - layouts 3 ระดับ (72 / 108 / 144 ตัว) เป็นพีระมิดหลายชั้น
 * - แจกไพ่แบบ "ถอยหลัง" (reverse removal) → ทุกกระดานมีทางแก้จริงเสมอ
 * - verify ด้วยพยาน (witness): replay ลำดับการเก็บที่ใช้สร้างกระดาน
 * - shuffle เก็บไพ่ที่เหลือแล้วแจกใหม่ → ยังแก้ได้เสมอ
 */

export type Difficulty = 'easy' | 'medium' | 'hard'
export const DIFFICULTIES: readonly Difficulty[] = ['easy', 'medium', 'hard'] as const

export interface DifficultyMeta {
  key: Difficulty
  labelEn: string
  labelTh: string
  tiles: number
  layers: number
  accent: string
}

/* ------------------------------------------------------------------ *
 * tile types — 36 แบบ × 4 ใบ = 144
 * ------------------------------------------------------------------ */

export type Suit = 'dots' | 'bamboo' | 'chars' | 'wind' | 'dragon' | 'flower' | 'season'

export interface TileType {
  id: number
  suit: Suit
  value: number
}

const SUIT_ORDER: Suit[] = ['dots', 'bamboo', 'chars']

export const TILE_TYPES: TileType[] = (() => {
  const list: TileType[] = []
  for (const suit of SUIT_ORDER) for (let v = 1; v <= 9; v++) list.push({ id: list.length, suit, value: v })
  for (let v = 1; v <= 4; v++) list.push({ id: list.length, suit: 'wind', value: v })
  for (let v = 1; v <= 3; v++) list.push({ id: list.length, suit: 'dragon', value: v })
  list.push({ id: list.length, suit: 'flower', value: 1 })
  list.push({ id: list.length, suit: 'season', value: 1 })
  return list
})()

export const WIND_CHARS = ['東', '南', '西', '北']
export const DRAGON_CHARS = ['中', '發', '白']

/* ------------------------------------------------------------------ *
 * layouts — x/y เป็นหน่วยครึ่งใบ (ไพ่กว้าง 2 หน่วย)
 * ------------------------------------------------------------------ */

export interface Slot {
  x: number
  y: number
  z: number
}

function rect(x0: number, y0: number, cols: number, rows: number, z: number): Slot[] {
  const out: Slot[] = []
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) out.push({ x: x0 + c * 2, y: y0 + r * 2, z })
  }
  return out
}

export const LAYOUTS: Record<Difficulty, Slot[]> = {
  // แบนเป็นหลัก: ชั้นล่างกว้าง ชั้นบนเป็นก้อนเล็ก ๆ ตรงกลาง
  easy: [...rect(0, 0, 10, 6, 0), ...rect(3, 1, 3, 4, 1)],
  medium: [...rect(0, 0, 10, 6, 0), ...rect(1, 1, 8, 4, 1), ...rect(2, 2, 4, 3, 2)],
  hard: [
    ...rect(0, 0, 12, 6, 0),
    ...rect(1, 1, 8, 5, 1),
    ...rect(2, 2, 6, 4, 2),
    ...rect(3, 3, 4, 2, 3),
  ],
}

export const DIFFICULTY_META: Record<Difficulty, DifficultyMeta> = {
  easy: { key: 'easy', labelEn: 'Easy', labelTh: 'ง่าย', tiles: LAYOUTS.easy.length, layers: 2, accent: '#34d399' },
  medium: {
    key: 'medium',
    labelEn: 'Medium',
    labelTh: 'ปานกลาง',
    tiles: LAYOUTS.medium.length,
    layers: 3,
    accent: '#60a5fa',
  },
  hard: { key: 'hard', labelEn: 'Hard', labelTh: 'ยาก', tiles: LAYOUTS.hard.length, layers: 4, accent: '#f472b6' },
}

export interface Puzzle {
  id: string
  difficulty: Difficulty
  slots: Slot[]
  /** type id ต่อ slot */
  tiles: number[]
  /** ลำดับการเก็บที่ใช้สร้างกระดาน (เป็นทางแก้ที่ถูกต้อง) */
  witness: Array<[number, number]>
}

export interface Verification {
  solvable: boolean
  pairs: number
  /** true = ไพ่แต่ละแบบมี 4 ใบพอดี */
  countsOk: boolean
  ok: boolean
}

/* ------------------------------------------------------------------ *
 * geometry — precompute ผู้ที่ทับ/ขนาบข้าง
 * ------------------------------------------------------------------ */

export interface Neighbours {
  covers: number[][]
  left: number[][]
  right: number[][]
}

export function buildNeighbours(slots: Slot[]): Neighbours {
  const covers: number[][] = slots.map(() => [])
  const left: number[][] = slots.map(() => [])
  const right: number[][] = slots.map(() => [])
  for (let i = 0; i < slots.length; i++) {
    for (let j = 0; j < slots.length; j++) {
      if (i === j) continue
      const a = slots[i]
      const b = slots[j]
      if (b.z > a.z && Math.abs(b.x - a.x) < 2 && Math.abs(b.y - a.y) < 2) covers[i].push(j)
      if (b.z === a.z && Math.abs(b.y - a.y) < 2) {
        // ข้างกัน = ชิดกันพอดี (ไพ่กว้าง 2 หน่วย) ไม่ใช่ทับกัน
        if (b.x === a.x - 2) left[i].push(j)
        if (b.x === a.x + 2) right[i].push(j)
      }
    }
  }
  return { covers, left, right }
}

export function isFree(index: number, removed: boolean[], nb: Neighbours): boolean {
  if (removed[index]) return false
  if (nb.covers[index].some((j) => !removed[j])) return false
  const leftBlocked = nb.left[index].some((j) => !removed[j])
  const rightBlocked = nb.right[index].some((j) => !removed[j])
  return !leftBlocked || !rightBlocked
}

export function freeTiles(removed: boolean[], nb: Neighbours): number[] {
  const out: number[] = []
  for (let i = 0; i < removed.length; i++) if (isFree(i, removed, nb)) out.push(i)
  return out
}

/** คู่ที่หยิบได้ตอนนี้ (ไพ่เหมือนกัน + ทั้งคู่ free) */
export function findMoves(tiles: number[], removed: boolean[], nb: Neighbours): Array<[number, number]> {
  const byType = new Map<number, number[]>()
  for (const i of freeTiles(removed, nb)) {
    const list = byType.get(tiles[i])
    if (list) list.push(i)
    else byType.set(tiles[i], [i])
  }
  const moves: Array<[number, number]> = []
  for (const list of byType.values()) {
    for (let a = 0; a < list.length; a++) {
      for (let b = a + 1; b < list.length; b++) moves.push([list[a], list[b]])
    }
  }
  return moves
}

/**
 * สร้างลำดับการเก็บไพ่ (ถอยหลัง) จากสถานะ removed ปัจจุบัน
 * เงื่อนไข: หลังเก็บแต่ละคู่ ต้องเหลือไพ่ที่หยิบได้ ≥ 2 ใบ (หรือหมดพอดี)
 * เพื่อไม่ให้เหลือไพ่ตั้งซ้อน/ติดกันที่เอาออกไม่ได้
 * คืน null ถ้าลองครบ attempts แล้วยังไม่ได้
 */
export function buildRemovalOrder(
  nb: Neighbours,
  startRemoved: boolean[],
  rnd: () => number = Math.random,
  attempts = 40,
): Array<[number, number]> | null {
  const startRemaining = remainingCount(startRemoved)

  for (let attempt = 0; attempt < attempts; attempt++) {
    const removed = startRemoved.slice()
    const order: Array<[number, number]> = []
    let failed = false

    while (remainingCount(removed) > 0) {
      const free = freeTiles(removed, nb)
      if (free.length < 2) {
        failed = true
        break
      }

      const pairs: Array<[number, number]> = []
      for (let a = 0; a < free.length; a++) {
        for (let b = a + 1; b < free.length; b++) pairs.push([free[a], free[b]])
      }
      const candidates = shuffled(pairs, rnd)

      let chosen: [number, number] | null = null
      for (const [a, b] of candidates) {
        removed[a] = true
        removed[b] = true
        const left = remainingCount(removed)
        if (left === 0 || freeTiles(removed, nb).length >= 2) {
          chosen = [a, b]
          break
        }
        removed[a] = false
        removed[b] = false
      }

      if (!chosen) {
        failed = true
        break
      }
      order.push(chosen)
    }

    if (!failed && order.length === startRemaining / 2) return order
  }
  return null
}

export function remainingCount(removed: boolean[]): number {
  let n = 0
  for (const r of removed) if (!r) n += 1
  return n
}

/* ------------------------------------------------------------------ *
 * random
 * ------------------------------------------------------------------ */

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffled<T>(items: readonly T[], rnd: () => number): T[] {
  const arr = items.slice()
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    const tmp = arr[i]
    arr[i] = arr[j]
    arr[j] = tmp
  }
  return arr
}

/* ------------------------------------------------------------------ *
 * deal (ถอยหลัง) + verify
 * ------------------------------------------------------------------ */

/**
 * สร้างกระดานโดย "ถอยหลัง": เลือกไพ่ที่หยิบได้สองใบออกเรื่อย ๆ จนหมด
 * ลำดับที่ได้คือทางแก้จริง → รับประกันว่าเล่นจบได้
 */
export function deal(difficulty: Difficulty, rnd: () => number = Math.random): Puzzle {
  const slots = LAYOUTS[difficulty].map((s) => ({ ...s }))
  const nb = buildNeighbours(slots)
  const empty = new Array<boolean>(slots.length).fill(false)
  const order = buildRemovalOrder(nb, empty, rnd)
  if (!order) throw new Error('cannot build a removable deal: ' + difficulty)

  // แจกชนิดไพ่: จำนวนชนิด = ใบทั้งหมด / 4 → แต่ละชนิดใช้ 2 คู่
  const typeCount = slots.length / 4
  const types = shuffled(
    TILE_TYPES.map((t) => t.id),
    rnd,
  ).slice(0, typeCount)
  const pairTypes: number[] = []
  for (const t of types) pairTypes.push(t, t)
  const assignedTypes = shuffled(pairTypes, rnd)

  const tiles = new Array<number>(slots.length).fill(0)
  order.forEach(([a, b], k) => {
    tiles[a] = assignedTypes[k]
    tiles[b] = assignedTypes[k]
  })

  const puzzle: Puzzle = {
    id: `mj_${Math.floor(rnd() * 1e9).toString(36)}`,
    difficulty,
    slots,
    tiles,
    witness: order,
  }
  const check = verifyPuzzle(puzzle)
  if (!check.ok) throw new Error('dealt puzzle failed verification')
  return puzzle
}

/** ตรวจว่ากระดานนี้เล่นจบได้จริงด้วยพยานที่แนบมา */
export function verifyPuzzle(puzzle: Puzzle): Verification {
  const { slots, tiles, witness } = puzzle
  const removed = new Array<boolean>(slots.length).fill(false)
  const nb = buildNeighbours(slots)
  let pairs = 0

  const counts = new Map<number, number>()
  for (const t of tiles) counts.set(t, (counts.get(t) ?? 0) + 1)

  for (const [a, b] of witness) {
    if (a === b || a < 0 || b < 0 || a >= slots.length || b >= slots.length) {
      return { solvable: false, pairs, countsOk: false, ok: false }
    }
    if (removed[a] || removed[b]) return { solvable: false, pairs, countsOk: false, ok: false }
    if (tiles[a] !== tiles[b]) return { solvable: false, pairs, countsOk: false, ok: false }
    if (!isFree(a, removed, nb) || !isFree(b, removed, nb)) {
      return { solvable: false, pairs, countsOk: false, ok: false }
    }
    removed[a] = true
    removed[b] = true
    pairs += 1
  }

  const solvable = removed.every(Boolean) && pairs === slots.length / 2
  const countsOk = [...counts.values()].every((n) => n % 4 === 0)
  return { solvable, pairs, countsOk, ok: solvable && countsOk }
}

/** ตรวจประวัติการเล่นของผู้เล่นว่าทุกคู่ถูกกติกาจริง (ใช้ตอนโหลดเซฟ) */
export function replayHistory(
  puzzle: Puzzle,
  history: Array<[number, number]>,
): { ok: boolean; removed: boolean[] } {
  const removed = new Array<boolean>(puzzle.slots.length).fill(false)
  const nb = buildNeighbours(puzzle.slots)
  for (const pair of history) {
    if (!Array.isArray(pair) || pair.length !== 2) return { ok: false, removed }
    const [a, b] = pair
    if (a === b || a < 0 || b < 0 || a >= removed.length || b >= removed.length) {
      return { ok: false, removed }
    }
    if (removed[a] || removed[b]) return { ok: false, removed }
    if (puzzle.tiles[a] !== puzzle.tiles[b]) return { ok: false, removed }
    if (!isFree(a, removed, nb) || !isFree(b, removed, nb)) return { ok: false, removed }
    removed[a] = true
    removed[b] = true
  }
  return { ok: true, removed }
}

/* ------------------------------------------------------------------ *
 * shuffle — เก็บไพ่ที่เหลือแล้วแจกใหม่ (ยังแก้ได้เสมอ)
 * ------------------------------------------------------------------ */

export interface ShuffleResult {
  tiles: number[]
  witness: Array<[number, number]>
  verification: Verification
}

export function shuffleRemaining(
  puzzle: Puzzle,
  removed: boolean[],
  rnd: () => number = Math.random,
): ShuffleResult {
  const slots = puzzle.slots
  const nb = buildNeighbours(slots)
  const open = removed.map((r) => !r)

  // ลำดับการเก็บของไพ่ที่เหลือ (ต้องไม่ตัน) แล้วค่อยแจกชนิดไพ่ตามลำดับนั้น
  const order = buildRemovalOrder(nb, removed, rnd)
  if (!order) throw new Error('cannot shuffle a stuck board')

  // ชนิดไพ่ที่เหลือ → จับเป็นคู่
  const perType = new Map<number, number>()
  for (let i = 0; i < slots.length; i++) {
    if (!open[i]) continue
    perType.set(puzzle.tiles[i], (perType.get(puzzle.tiles[i]) ?? 0) + 1)
  }
  const pairTypes: number[] = []
  for (const [type, count] of perType) {
    if (count % 2 !== 0) throw new Error('odd tile count for type ' + type)
    for (let k = 0; k < count / 2; k++) pairTypes.push(type)
  }
  const assigned = shuffled(pairTypes, rnd)

  const tiles = puzzle.tiles.slice()
  order.forEach(([a, b], k) => {
    tiles[a] = assigned[k]
    tiles[b] = assigned[k]
  })

  const next: Puzzle = { ...puzzle, tiles, witness: order }
  return { tiles, witness: order, verification: verifyPuzzleFor(next, removed) }
}

/** verify โดยเริ่มจากสถานะที่ removed ไปแล้วบางส่วน */
export function verifyPuzzleFor(puzzle: Puzzle, alreadyRemoved: boolean[]): Verification {
  const { slots, tiles, witness } = puzzle
  const nb = buildNeighbours(slots)
  const removed = alreadyRemoved.slice()
  let pairs = 0
  for (const [a, b] of witness) {
    if (removed[a] || removed[b] || tiles[a] !== tiles[b]) {
      return { solvable: false, pairs, countsOk: false, ok: false }
    }
    if (!isFree(a, removed, nb) || !isFree(b, removed, nb)) {
      return { solvable: false, pairs, countsOk: false, ok: false }
    }
    removed[a] = true
    removed[b] = true
    pairs += 1
  }
  const solvable = removed.every(Boolean)
  return { solvable, pairs, countsOk: true, ok: solvable }
}

/* ------------------------------------------------------------------ *
 * display helpers
 * ------------------------------------------------------------------ */

export interface BoardBounds {
  maxX: number
  maxY: number
  maxZ: number
}

export function boundsOf(slots: Slot[]): BoardBounds {
  let maxX = 0
  let maxY = 0
  let maxZ = 0
  for (const s of slots) {
    maxX = Math.max(maxX, s.x)
    maxY = Math.max(maxY, s.y)
    maxZ = Math.max(maxZ, s.z)
  }
  return { maxX: maxX + 2, maxY: maxY + 2, maxZ }
}

export function formatTime(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(sec).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}
