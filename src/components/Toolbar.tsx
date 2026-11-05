import type { Hint } from '../hooks/useGame'
import { t } from '../lib/i18n'
import type { Lang } from '../lib/i18n'

interface ToolbarProps {
  canUndo: boolean
  disabled: boolean
  shufflesUsed: number
  hintDisabled?: boolean
  lang: Lang
  onHint: () => void
  onShuffle: () => void
  onUndo: () => void
}

export function Toolbar({
  canUndo,
  disabled,
  shufflesUsed,
  lang,
  onHint,
  onShuffle,
  onUndo,
}: ToolbarProps) {
  return (
    <div className="tools" role="group" aria-label={t(lang, 'tools.group')}>
      <button
        type="button"
        className="tool tool--hint"
        onClick={onHint}
        disabled={disabled}
        title={t(lang, 'tools.hintTitle')}
      >
        <span className="tool-icon" aria-hidden="true">
          💡
        </span>
        <span className="tool-label">{t(lang, 'tools.hint')}</span>
      </button>

      <button
        type="button"
        className="tool"
        onClick={onShuffle}
        disabled={disabled}
        title={t(lang, 'tools.shuffleTitle', { n: shufflesUsed })}
      >
        <span className="tool-icon" aria-hidden="true">
          🔀
        </span>
        <span className="tool-label">{t(lang, 'tools.shuffle')}</span>
        {shufflesUsed > 0 && <span className="tool-badge">{shufflesUsed}</span>}
      </button>

      <button
        type="button"
        className="tool"
        onClick={onUndo}
        disabled={disabled || !canUndo}
        title={t(lang, 'tools.undoTitle')}
      >
        <span className="tool-icon" aria-hidden="true">
          ↩️
        </span>
        <span className="tool-label">{t(lang, 'tools.undo')}</span>
      </button>
    </div>
  )
}

interface HintCardProps {
  hint: Hint
  hintsUsed: number
  lang: Lang
  onDismiss: () => void
}

export function HintCard({ hint, hintsUsed, lang, onDismiss }: HintCardProps) {
  return (
    <div className={`hint-card hint-card--${hint.kind}`} role="status" aria-live="polite">
      <div className="hint-head">
        <span className="hint-icon" aria-hidden="true">
          {hint.kind === 'stuck' ? '🧠' : '💡'}
        </span>
        <div className="hint-titles">
          <strong>{hint.title}</strong>
          <span className="hint-sub">
            {t(lang, hintsUsed === 1 ? 'hint.usedOne' : 'hint.used', { n: hintsUsed })}
          </span>
        </div>
        <button
          type="button"
          className="hint-close"
          onClick={onDismiss}
          aria-label={t(lang, 'hint.close')}
        >
          ×
        </button>
      </div>
      <p className="hint-body">{hint.body}</p>
      <div className="hint-actions">
        <button type="button" className="btn btn--ghost btn--sm" onClick={onDismiss}>
          {t(lang, 'hint.gotIt')}
        </button>
      </div>
    </div>
  )
}
