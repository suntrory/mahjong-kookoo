import { useEffect, useState } from 'react'
import { Board } from './components/Board'
import { SidePanel } from './components/SidePanel'
import { DifficultyPicker, TopBar } from './components/TopBar'
import { HintCard, Toolbar } from './components/Toolbar'
import { WinDialog } from './components/WinDialog'
import { useGame } from './hooks/useGame'
import { DIFFICULTY_META, remainingCount } from './lib/mahjong'
import type { Difficulty } from './lib/mahjong'
import { applyTheme, loadTheme, saveTheme } from './lib/theme'
import type { Theme } from './lib/theme'
import { t } from './lib/i18n'

export default function App() {
  const { state, actions } = useGame()
  const [theme, setTheme] = useState<Theme>(loadTheme)
  const lang = state.settings.lang

  const toggleTheme = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    applyTheme(next)
    saveTheme(next)
    setTheme(next)
  }
  const toggleLang = () => actions.updateSettings({ lang: lang === 'en' ? 'th' : 'en' })

  const [winDismissed, setWinDismissed] = useState(false)
  const [pendingDifficulty, setPendingDifficulty] = useState<Difficulty | null>(null)
  const [lastGameId, setLastGameId] = useState(state.createdAt)

  const { hint, shuffle, undo, select, dismissToast } = actions
  const remaining = remainingCount(state.removed)
  const shufflesUsed = state.shufflesUsed
  const won = state.status === 'won'
  const locked = won || state.paused

  // sync <html lang>
  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  // เกมใหม่ → เคลียร์ dialog/confirm
  if (lastGameId !== state.createdAt) {
    setLastGameId(state.createdAt)
    setWinDismissed(false)
    setPendingDifficulty(null)
  }

  const requestNewGame = (difficulty: Difficulty) => {
    const untouched = state.history.length === 0 && state.elapsed < 3
    if (untouched || state.status === 'won' || difficulty === state.puzzle.difficulty) {
      setPendingDifficulty(null)
      actions.newGame(difficulty)
      return
    }
    setPendingDifficulty(difficulty)
  }

  // auto-hide toast
  useEffect(() => {
    if (!state.toast) return
    const id = window.setTimeout(() => dismissToast(), 3200)
    return () => window.clearTimeout(id)
  }, [state.toast, dismissToast])

  // keyboard
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
      if (event.metaKey || event.ctrlKey) {
        if (event.key.toLowerCase() === 'z') {
          event.preventDefault()
          undo()
        }
        return
      }
      if (state.status === 'won') return
      switch (event.key.toLowerCase()) {
        case 'h':
          hint()
          break
        case 's':
          shuffle()
          break
        case 'u':
          undo()
          break
        case 'p':
          actions.togglePause()
          break
        case 'escape':
          actions.dismiss()
          break
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [actions, hint, shuffle, undo, state.status])

  return (
    <div className="app">
      <div className="app-glow" aria-hidden="true" />

      <div className="app-inner">
        <TopBar
          difficulty={state.puzzle.difficulty}
          elapsed={state.elapsed}
          paused={state.paused}
          status={state.status}
          theme={theme}
          lang={lang}
          onNewGame={requestNewGame}
          onTogglePause={actions.togglePause}
          onToggleTheme={toggleTheme}
          onToggleLang={toggleLang}
        />

        <main className="layout">
          <section className="game-column">
            <DifficultyPicker current={state.puzzle.difficulty} lang={lang} onPick={requestNewGame} />

            {pendingDifficulty && (
              <div className="confirm-bar" role="alert">
                <span>
                  {t(lang, 'app.confirmSwitch', { difficulty: t(lang, `diff.${pendingDifficulty}`) })}
                </span>
                <div className="confirm-bar__actions">
                  <button
                    type="button"
                    className="btn btn--danger btn--sm"
                    onClick={() => {
                      actions.newGame(pendingDifficulty)
                      setPendingDifficulty(null)
                    }}
                  >
                    {t(lang, 'action.startOver')}
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => setPendingDifficulty(null)}
                  >
                    {t(lang, 'action.keepPlaying')}
                  </button>
                </div>
              </div>
            )}

            {state.hint && (
              <HintCard hint={state.hint} hintsUsed={state.hintsUsed} lang={lang} onDismiss={actions.dismiss} />
            )}

            <div className="board-card">
              <div className="board-meta">
                <span className="board-meta-chip">{t(lang, 'app.remaining', { n: remaining })}</span>
                <span className="board-meta-chip">
                  💡 {state.hintsUsed} · 🔀 {state.shufflesUsed}
                </span>
              </div>
              <div className="progress" aria-hidden="true">
                <span
                  className="progress-bar"
                  style={{ width: `${((state.puzzle.slots.length - remaining) / state.puzzle.slots.length) * 100}%` }}
                />
              </div>

              <Board
                puzzle={state.puzzle}
                removed={state.removed}
                selected={state.selected}
                hintCells={state.hint ? state.hint.cells : []}
                lang={lang}
                dimCovered={state.settings.dimCovered}
                highlightMatch={state.settings.highlightMatch}
                paused={state.paused}
                onSelect={select}
                onResume={actions.togglePause}
              />
            </div>

            <Toolbar
              canUndo={state.history.length > 0}
              disabled={locked}
              shufflesUsed={shufflesUsed}
              lang={lang}
              onHint={hint}
              onShuffle={shuffle}
              onUndo={undo}
            />

            <p className="keyboard-hint">
              {lang === 'th'
                ? 'คีย์บอร์ด: H คำใบ้ · S สลับไพ่ · U ย้อนกลับ · P หยุด'
                : 'Keyboard: H hint · S shuffle · U undo · P pause'}
            </p>
          </section>

          <SidePanel
            difficulty={state.puzzle.difficulty}
            tiles={state.puzzle.slots.length}
            layers={DIFFICULTY_META[state.puzzle.difficulty].layers}
            stats={state.stats}
            settings={state.settings}
            lang={lang}
            shufflesUsed={shufflesUsed}
            onChangeSettings={actions.updateSettings}
            onClearStats={actions.clearStats}
            onRestart={actions.restart}
            onShuffle={shuffle}
          />
        </main>

        <footer className="footer">
          <span>{t(lang, 'app.footerStorage')}</span>
          <span className="footer-dot" aria-hidden="true">
            •
          </span>
          <span>{t(lang, 'app.footerVerified')}</span>
        </footer>
      </div>

      {state.toast && (
        <div className={`toast toast--${state.toast.tone}`} role="status" aria-live="polite">
          {state.toast.text}
        </div>
      )}

      {won && !winDismissed && (
        <WinDialog
          difficulty={state.puzzle.difficulty}
          tiles={state.puzzle.slots.length}
          elapsed={state.elapsed}
          hints={state.hintsUsed}
          shuffles={state.shufflesUsed}
          lang={lang}
          onAgain={() => requestNewGame(state.puzzle.difficulty)}
          onClose={() => setWinDismissed(true)}
        />
      )}
    </div>
  )
}
