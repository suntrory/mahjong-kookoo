import { DIFFICULTIES, DIFFICULTY_META } from '../lib/mahjong'
import type { Difficulty } from '../lib/mahjong'
import type { Theme } from '../lib/theme'
import { t } from '../lib/i18n'
import type { Lang } from '../lib/i18n'
import { Icon } from './Icons'

interface TopBarProps {
  difficulty: Difficulty
  paused: boolean
  status: 'playing' | 'won'
  theme: Theme
  lang: Lang
  onNewGame: (difficulty: Difficulty) => void
  onTogglePause: () => void
  onToggleTheme: () => void
  onToggleLang: () => void
}

const NUMERALS: Record<Difficulty, string> = { easy: '一', medium: '二', hard: '三' }

export function TopBar({
  difficulty,
  paused,
  status,
  theme,
  lang,
  onNewGame,
  onTogglePause,
  onToggleTheme,
  onToggleLang,
}: TopBarProps) {
  const nextThemeLabel = t(lang, theme === 'dark' ? 'topbar.themeToLight' : 'topbar.themeToDark')
  const nextLangLabel = t(lang, lang === 'en' ? 'topbar.langToThai' : 'topbar.langToEnglish')
  const pauseLabel = t(lang, paused ? 'topbar.resume' : 'topbar.pause')

  return (
    <header className="masthead">
      <div className="brand">
        <span className="seal" aria-hidden="true">
          中
        </span>
        <div className="brand-text">
          <h1>Mahjong</h1>
          <p>{t(lang, 'app.subtitle')}</p>
        </div>
      </div>

      <nav className="levels" role="tablist" aria-label={t(lang, 'topbar.difficultyLabel')}>
        {DIFFICULTIES.map((d) => {
          const meta = DIFFICULTY_META[d]
          const active = d === difficulty
          return (
            <button
              key={d}
              type="button"
              role="tab"
              aria-selected={active}
              data-difficulty={d}
              className={`level${active ? ' level--active' : ''}`}
              title={t(lang, `blurb.${d}`, { tiles: meta.tiles, layers: meta.layers })}
              onClick={() => onNewGame(d)}
            >
              <span className="level-numeral" aria-hidden="true">
                {NUMERALS[d]}
              </span>
              <span className="level-text">
                <span className="level-name">{lang === 'th' ? meta.labelTh : meta.labelEn}</span>
                <span className="level-meta">{t(lang, 'side.tilesValue', { n: meta.tiles })}</span>
              </span>
            </button>
          )
        })}
      </nav>

      <div className="controls">
        <button
          type="button"
          className="icon-btn theme-toggle"
          onClick={onToggleTheme}
          aria-label={nextThemeLabel}
          title={nextThemeLabel}
        >
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
        </button>
        <button
          type="button"
          className="icon-btn lang-toggle"
          onClick={onToggleLang}
          aria-label={nextLangLabel}
          title={nextLangLabel}
        >
          {lang === 'en' ? 'EN' : 'TH'}
        </button>
        <button
          type="button"
          className="icon-btn"
          onClick={onTogglePause}
          disabled={status === 'won'}
          aria-label={pauseLabel}
          title={`${pauseLabel} (P)`}
        >
          <Icon name={paused ? 'play' : 'pause'} />
        </button>
        <button type="button" className="btn btn--primary" onClick={() => onNewGame(difficulty)}>
          {t(lang, 'topbar.newGame')}
        </button>
      </div>
    </header>
  )
}
