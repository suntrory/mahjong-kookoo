# Mahjong Solitaire — React + Vite

A Mahjong Solitaire game with three difficulty levels, hints, shuffles, and **every deal verified to be solvable before you play**. Bilingual English/Thai (English default), dark & light themes, all state in `localStorage` — no backend.

เกมไพ่หยิบคู่ (Mahjong Solitaire) 3 ระดับ พร้อมระบบช่วยเหลือ และ **ตรวจสอบทุกกระดานว่ามีทางแก้จริง** ก่อนให้เล่น — ข้อมูลทั้งหมดเก็บใน `localStorage`

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build → dist/
npm run preview    # serve dist/
npm run verify     # engine test suite (deal + witness + shuffle)
```

## Features

- **3 levels** — Easy 72 tiles / 2 layers · Medium 104 / 3 · Hard 144 / 4
- **Help system**
  - **Hint** highlights a valid pair and names both tiles with board positions
  - **Shuffle** (3 per game) re-deals the remaining tiles and **keeps the board solvable**
  - **Undo**, automatic dead-end detection ("no moves left"), blocked-tile feedback
  - Match highlighting, dimmed blocked tiles
- **Verified deals** — boards are built *backwards* (removing free pairs from a full layout), so the removal order is a real solution; that witness is replayed on the final board before the game starts
- **localStorage** — in-progress game (resume after reload), per-level stats (best time, cleared/started), 12 recent games, settings
- **Themes** — dark / light (system default, toggle in header)
- **Languages** — English (default) / Thai; hints and toasts follow the language instantly
- Keyboard: `H` hint · `S` shuffle · `U` undo · `P` pause

## Structure

```
src/lib/mahjong.ts    engine: layouts, tile set, reverse deal, free/covered rules, witness verify, shuffle
src/lib/tiles.ts      tile naming + faces (dots / bamboo / characters / winds / dragons / flower / season)
src/lib/i18n.ts       EN/TH dictionary + t() (DEFAULT_LANG = 'en')
src/lib/theme.ts      dark/light theme (data-theme + localStorage)
src/lib/storage.ts    localStorage schema + validation on load (replays the move history)
src/hooks/useGame.ts  reducer: select/match, hint, shuffle, undo, timer, persistence
src/components/       Board (absolute-positioned 3D-ish tiles), TopBar, Toolbar, HintCard, SidePanel, WinDialog
scripts/verify.ts     engine test suite
```

## Difficulty & layouts

Coordinates are in half-tile units (a tile is 2×2), so upper layers can be offset by half a tile:

| Level | Layers (tiles per layer) | Total |
|---|---|---|
| Easy | 10×6 (60) · 3×4 (12) | 72 |
| Medium | 10×6 (60) · 8×4 (32) · 4×3 (12) | 104 |
| Hard | 12×6 (72) · 8×5 (40) · 6×4 (24) · 4×2 (8) | 144 |

## How a deal is guaranteed solvable

1. Start from the full layout and repeatedly pick **two currently free slots** (not covered by a higher layer, and at least one side open), remove them, and record the pair.
2. Guard each step: after removal the board must still have **≥ 2 free tiles** (or be empty) — this avoids leaving a stacked pair where the lower tile can never be taken.
3. Assign tile types to the recorded pairs (each type used 4 times; `tiles / 4` types per deal).
4. **Verify** by replaying the recorded order on the final board — both tiles must be free and of the same type at that moment. Only verified boards are shown.

`shuffleRemaining()` reuses the same routine on the *remaining* tiles, so a shuffle can never make a board unsolvable, and the tile multiset is preserved.

## Verification (`npm run verify`)

- layout sizes, no duplicate slots, layer count matches difficulty metadata
- 20 deals per level: all verified, every type has exactly 4 copies, a move exists at the start
- replay each witness to completion (15 boards) — no illegal moves
- shuffle 18 mid-game positions: solvable afterwards, tile counts preserved
- `verifyPuzzle` rejects a tampered deal (witness with mismatched tiles)
- timings ≈ 0.6–1.1 ms per deal

## Docker

```bash
docker compose up -d --build      # → http://localhost:8090 (override with WEB_PORT)
docker compose logs -f mahjong-web
docker compose down
```

- Multi-stage: `node:22-alpine` (build) → `nginxinc/nginx-unprivileged:1.27-alpine` (uid 101, port 8080)
- Hardening: `read_only` rootfs + tmpfs, `no-new-privileges`, healthcheck on `/healthz`
- nginx: gzip, 1-year cache for `/assets/*`, no-cache for `index.html`, SPA fallback, CSP + security headers

## localStorage

| key | contents |
|---|---|
| `mahjong.v1.game` | puzzle (slots, tiles, witness), removed flags, move history, timer, hints/shuffles |
| `mahjong.v1.stats` | per-level played/completed/best time + 12 recent games |
| `mahjong.v1.settings` | dim blocked tiles, highlight matches, language |
| `mahjong.v1.theme` | dark / light |

On load the game is validated twice: the deal's witness must still verify, and the saved move history is replayed to confirm the `removed` state — corrupted saves are discarded instead of trusted.
