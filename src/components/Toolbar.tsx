import type { Hint } from '../hooks/useGame'
import { t } from '../lib/i18n'
import type { Lang } from '../lib/i18n'
import { Icon } from './Icons'

interface ToolbarProps {
  canUndo: boolean
  disabled: boolean
  shufflesUsed: number
  lang: Lang
  onHint: () => void
  onShuffle: () => void
  onUndo: () => void
}

export function Toolbar({ canUndo, disabled, shufflesUsed, lang, onHint, onShuffle, onUndo }: ToolbarProps) {
  return (
    <div className="dock" role="group" aria-label={t(lang, 'tools.group')}>
      <button
        type="button"
        className="tool tool--hint"
        onClick={onHint}
        disabled={disabled}
        title={t(lang, 'tools.hintTitle')}
      >
        <Icon name="hint" size={20} />
        <span className="tool-label">{t(lang, 'tools.hint')}</span>
        <kbd className="tool-key">H</kbd>
      </button>

      <button
        type="button"
        className="tool"
        onClick={onShuffle}
        disabled={disabled}
        title={t(lang, 'tools.shuffleTitle', { n: shufflesUsed })}
      >
        <Icon name="shuffle" size={20} />
        <span className="tool-label">{t(lang, 'tools.shuffle')}</span>
        {shufflesUsed > 0 ? (
          <span className="tool-badge">{shufflesUsed}</span>
        ) : (
          <kbd className="tool-key">S</kbd>
        )}
      </button>

      <button
        type="button"
        className="tool"
        onClick={onUndo}
        disabled={disabled || !canUndo}
        title={t(lang, 'tools.undoTitle')}
      >
        <Icon name="undo" size={20} />
        <span className="tool-label">{t(lang, 'tools.undo')}</span>
        <kbd className="tool-key">U</kbd>
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
    <div className={`slip slip--${hint.kind}`} role="status" aria-live="polite">
      <span className="slip-icon">
        <Icon name={hint.kind === 'stuck' ? 'alert' : 'hint'} size={20} />
      </span>
      <div className="slip-text">
        <strong>{hint.title}</strong>
        <p className="slip-body">{hint.body}</p>
        <span className="slip-sub">
          {t(lang, hintsUsed === 1 ? 'hint.usedOne' : 'hint.used', { n: hintsUsed })}
        </span>
      </div>
      <button
        type="button"
        className="icon-btn icon-btn--bare"
        onClick={onDismiss}
        aria-label={t(lang, 'hint.close')}
      >
        <Icon name="close" size={16} />
      </button>
    </div>
  )
}
