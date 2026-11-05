import { DIFFICULTY_META, formatTime } from '../lib/mahjong'
import type { Difficulty } from '../lib/mahjong'
import { accentInk } from '../lib/theme'
import { t } from '../lib/i18n'
import type { Lang } from '../lib/i18n'

interface WinDialogProps {
  difficulty: Difficulty
  tiles: number
  elapsed: number
  hints: number
  shuffles: number
  lang: Lang
  onAgain: () => void
  onClose: () => void
}

function starsFor(hints: number, shuffles: number): number {
  if (hints === 0 && shuffles === 0) return 3
  if (hints <= 3 && shuffles <= 2) return 2
  return 1
}

export function WinDialog({
  difficulty,
  tiles,
  elapsed,
  hints,
  shuffles,
  lang,
  onAgain,
  onClose,
}: WinDialogProps) {
  const meta = DIFFICULTY_META[difficulty]
  const stars = starsFor(hints, shuffles)

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="win-title">
      <div className="modal">
        <div className="modal-glow" aria-hidden="true" />
        <div className="win-stars" aria-label={t(lang, 'win.stars', { n: stars })}>
          {[1, 2, 3].map((s) => (
            <span key={s} className={`star${s <= stars ? ' star--on' : ''}`} aria-hidden="true">
              ★
            </span>
          ))}
        </div>
        <h2 id="win-title" className="modal-title">
          {t(lang, 'win.title')}
        </h2>
        <p className="modal-sub accent-ink" style={accentInk(meta.accent)}>
          {t(lang, 'win.sub', { difficulty: t(lang, `diff.${difficulty}`), tiles })}
        </p>

        <div className="win-grid">
          <div className="win-stat">
            <span className="win-stat-key">{t(lang, 'win.time')}</span>
            <span className="win-stat-value">{formatTime(elapsed)}</span>
          </div>
          <div className="win-stat">
            <span className="win-stat-key">{t(lang, 'win.hints')}</span>
            <span className="win-stat-value">{hints}</span>
          </div>
          <div className="win-stat">
            <span className="win-stat-key">{t(lang, 'win.shuffles')}</span>
            <span className="win-stat-value">{shuffles}</span>
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn btn--primary" onClick={onAgain}>
            {t(lang, 'win.again')}
          </button>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            {t(lang, 'win.viewBoard')}
          </button>
        </div>
      </div>
    </div>
  )
}
