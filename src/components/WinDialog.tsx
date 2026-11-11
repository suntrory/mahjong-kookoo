import { formatTime } from '../lib/mahjong'
import type { Difficulty } from '../lib/mahjong'
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
  const stars = starsFor(hints, shuffles)

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="win-title">
      <div className="modal">
        <span className="modal-seal" aria-hidden="true">
          發
        </span>
        <div className="win-stars" role="img" aria-label={t(lang, 'win.stars', { n: stars })}>
          {[1, 2, 3].map((s) => (
            <span key={s} className={`star${s <= stars ? ' star--on' : ''}`} aria-hidden="true">
              ★
            </span>
          ))}
        </div>
        <h2 id="win-title" className="modal-title">
          {t(lang, 'win.title')}
        </h2>
        <p className="modal-sub">
          {t(lang, 'win.sub', { difficulty: t(lang, `diff.${difficulty}`), tiles })}
        </p>

        <dl className="win-grid">
          <div className="win-stat">
            <dt>{t(lang, 'win.time')}</dt>
            <dd>{formatTime(elapsed)}</dd>
          </div>
          <div className="win-stat">
            <dt>{t(lang, 'win.hints')}</dt>
            <dd>{hints}</dd>
          </div>
          <div className="win-stat">
            <dt>{t(lang, 'win.shuffles')}</dt>
            <dd>{shuffles}</dd>
          </div>
        </dl>

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
