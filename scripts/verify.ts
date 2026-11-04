/**
 * ชุดทดสอบ engine ของ Mahjong Solitaire
 * รัน: node --experimental-strip-types scripts/verify.ts
 *
 * ตรวจว่า:
 *  1. layout แต่ละระดับมีจำนวนไพ่ตรง + ไม่มีตำแหน่งซ้ำ
 *  2. deal() ทุกกระดานมี witness ที่ replay ได้จริง (เล่นจบได้)
 *  3. ชนิดไพ่มี 4 ใบต่อแบบเสมอ
 *  4. มี move ให้เดินตั้งแต่เปิดกระดาน
 *  5. เดินตาม witness จนจบได้จริง
 *  6. shuffle เก็บไพ่ที่เหลือแล้วยังแก้ได้ + จำนวนไพ่อ่อน conserve
 */
import {
  DIFFICULTIES,
  DIFFICULTY_META,
  LAYOUTS,
  TILE_TYPES,
  buildNeighbours,
  deal,
  findMoves,
  formatTime,
  isFree,
  mulberry32,
  remainingCount,
  shuffleRemaining,
  verifyPuzzle,
} from '../src/lib/mahjong.ts'
import type { Puzzle } from '../src/lib/mahjong.ts'

let failures = 0
function check(name: string, ok: boolean, detail = ''): void {
  if (ok) console.log(`  ✅ ${name}`)
  else {
    failures++
    console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

/* ------------------------------------------------------------------ */
console.log('\n=== 1) Layouts ===')
for (const d of DIFFICULTIES) {
  const slots = LAYOUTS[d]
  const meta = DIFFICULTY_META[d]
  const unique = new Set(slots.map((s) => `${s.x},${s.y},${s.z}`))
  const layers = new Set(slots.map((s) => s.z))
  console.log(`  ${d.padEnd(6)} ${slots.length} ใบ · ${layers.size} ชั้น`)
  check(`${d}: จำนวนไพ่ = ${meta.tiles}`, slots.length === meta.tiles, `${slots.length}`)
  check(`${d}: ไม่มีตำแหน่งซ้ำ`, unique.size === slots.length, `${unique.size}/${slots.length}`)
  check(`${d}: จำนวนหาร 4 ลงตัว`, slots.length % 4 === 0, `${slots.length}`)
  check(`${d}: จำนวนชั้นตรง meta`, layers.size === meta.layers, `${layers.size}`)
}

/* ------------------------------------------------------------------ */
console.log('\n=== 2) deal + verify (20 ต่อระดับ) ===')
const PER = 20
const timings: Record<string, number> = {}

for (const difficulty of DIFFICULTIES) {
  const rnd = mulberry32(0xa11ce + difficulty.length * 97)
  const started = Date.now()
  let okVerify = 0
  let okCounts = 0
  let hasMoves = 0
  let witnessLengths = 0
  let countsTotal = 0

  for (let i = 0; i < PER; i++) {
    const puzzle = deal(difficulty, rnd)
    const v = verifyPuzzle(puzzle)
    if (v.ok) okVerify++
    if (v.countsOk) okCounts++
    if (v.pairs === puzzle.slots.length / 2) witnessLengths++
    if (findMoves(puzzle.tiles, new Array(puzzle.slots.length).fill(false), buildNeighbours(puzzle.slots)).length > 0) {
      hasMoves++
    }

    // ตรวจชนิดไพ่ว่ามี 4 ใบต่อแบบ
    const counts = new Map<number, number>()
    for (const t of puzzle.tiles) counts.set(t, (counts.get(t) ?? 0) + 1)
    if ([...counts.values()].every((n) => n === 4)) countsTotal++
  }

  const ms = Date.now() - started
  timings[difficulty] = ms / PER
  console.log(`\n  ${difficulty.toUpperCase()} — ${PER} กระดานใน ${ms}ms (${(ms / PER).toFixed(1)}ms/กระดาน)`)
  check(`${difficulty}: ทุกกระดาน verify ผ่าน`, okVerify === PER, `${okVerify}/${PER}`)
  check(`${difficulty}: ทุกแบบมี 4 ใบ`, countsTotal === PER, `${countsTotal}/${PER}`)
  check(`${difficulty}: witness ครบทุกคู่`, witnessLengths === PER, `${witnessLengths}/${PER}`)
  check(`${difficulty}: เปิดกระดานมี move ทันที`, hasMoves === PER, `${hasMoves}/${PER}`)
  check(`${difficulty}: countsOk = true`, okCounts === PER, `${okCounts}/${PER}`)
}

/* ------------------------------------------------------------------ */
console.log('\n=== 3) เดินตาม witness จนจบ (เล่นจริง) ===')
let solvedBoards = 0
let wrongMoves = 0
let totalMoves = 0
for (const difficulty of DIFFICULTIES) {
  const rnd = mulberry32(555 + difficulty.length)
  for (let i = 0; i < 5; i++) {
    const puzzle: Puzzle = deal(difficulty, rnd)
    const nb = buildNeighbours(puzzle.slots)
    const removed = new Array<boolean>(puzzle.slots.length).fill(false)
    let ok = true
    for (const [a, b] of puzzle.witness) {
      if (!isFree(a, removed, nb) || !isFree(b, removed, nb) || puzzle.tiles[a] !== puzzle.tiles[b]) {
        ok = false
        wrongMoves++
        break
      }
      removed[a] = true
      removed[b] = true
      totalMoves++
    }
    if (ok && remainingCount(removed) === 0) solvedBoards++
  }
}
console.log(`  เก็บครบ ${solvedBoards}/15 กระดาน · ${totalMoves} คู่ · ผิด ${wrongMoves}`)
check('เดินตาม witness แล้วจบทุกกระดาน', solvedBoards === 15, `${solvedBoards}/15`)
check('ไม่มี move ที่ผิดกติกา', wrongMoves === 0, `${wrongMoves}`)

/* ------------------------------------------------------------------ */
console.log('\n=== 4) shuffle ระหว่างเกม ===')
let shuffleOk = 0
let shuffleTrials = 0
let countsPreserved = 0
for (const difficulty of DIFFICULTIES) {
  const rnd = mulberry32(909 + difficulty.length)
  for (let i = 0; i < 6; i++) {
    const puzzle = deal(difficulty, rnd)
    const nb = buildNeighbours(puzzle.slots)
    const removed = new Array<boolean>(puzzle.slots.length).fill(false)

    // เก็บไปครึ่งหนึ่งตาม witness
    const half = Math.floor(puzzle.witness.length / 2)
    for (let k = 0; k < half; k++) {
      const [a, b] = puzzle.witness[k]
      if (!isFree(a, removed, nb) || !isFree(b, removed, nb)) break
      removed[a] = true
      removed[b] = true
    }

    const before = new Map<number, number>()
    for (let s = 0; s < puzzle.slots.length; s++) {
      if (removed[s]) continue
      before.set(puzzle.tiles[s], (before.get(puzzle.tiles[s]) ?? 0) + 1)
    }

    shuffleTrials++
    try {
      const result = shuffleRemaining(puzzle, removed, rnd)
      const after = new Map<number, number>()
      for (let s = 0; s < puzzle.slots.length; s++) {
        if (removed[s]) continue
        after.set(result.tiles[s], (after.get(result.tiles[s]) ?? 0) + 1)
      }
      const same = [...before.entries()].every(([t, n]) => after.get(t) === n) && before.size === after.size
      if (same) countsPreserved++
      if (result.verification.ok) shuffleOk++
    } catch {
      /* counted as failure */
    }
  }
}
console.log(`  shuffle ${shuffleTrials} ครั้ง · ผ่าน ${shuffleOk} · ไพ่คงเดิม ${countsPreserved}`)
check('shuffle แล้วยังแก้ได้ทุกครั้ง', shuffleOk === shuffleTrials, `${shuffleOk}/${shuffleTrials}`)
check('shuffle ไม่ทำไพ่หาย/เพิ่ม', countsPreserved === shuffleTrials, `${countsPreserved}/${shuffleTrials}`)

/* ------------------------------------------------------------------ */
console.log('\n=== 5) verify ปฏิเสธกระดานที่ไม่มีทางแก้ ===')
{
  const puzzle = deal('easy', mulberry32(42))
  // สลับไพ่สองใบให้ชนิดไม่ตรงกัน → witness เดิมใช้ไม่ได้
  const broken: Puzzle = { ...puzzle, tiles: puzzle.tiles.slice() }
  const [a] = broken.witness[0]
  broken.tiles[a] = (broken.tiles[a] + 1) % TILE_TYPES.length
  const v = verifyPuzzle(broken)
  check('จับได้ว่า witness ใช้ไม่ได้', v.ok === false)
  check('รายงานจำนวนคู่ที่เดินได้', v.pairs >= 0)
}

/* ------------------------------------------------------------------ */
console.log('\n=== 6) formatTime ===')
check('formatTime(0) = 00:00', formatTime(0) === '00:00')
check('formatTime(65) = 01:05', formatTime(65) === '01:05')
check('formatTime(3661) = 1:01:01', formatTime(3661) === '1:01:01')

/* ------------------------------------------------------------------ */
console.log('\n=== สรุป ===')
for (const d of DIFFICULTIES) {
  console.log(
    `${d.padEnd(7)} ${DIFFICULTY_META[d].tiles} ใบ · ${DIFFICULTY_META[d].layers} ชั้น · ${timings[d].toFixed(1)}ms/กระดาน`,
  )
}

if (failures > 0) {
  console.error(`\n❌ FAILED — ${failures} การตรวจสอบไม่ผ่าน`)
  process.exit(1)
}
console.log('\n✅ ALL CHECKS PASSED')
