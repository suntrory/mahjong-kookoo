import { useState } from 'react'
import { DIFFICULTIES, DIFFICULTY_META, formatTime } from '../lib/mahjong'
import type { Difficulty } from '../lib/mahjong'
import { storageUsage } from '../lib/storage'
import { accentInk } from '../lib/theme'
import { t } from '../lib/i18n'
import type { Lang } from '../lib/i18n'
import type { Settings, StatsStore } from '../lib/storage'

interface SidePanelProps {
  difficulty: Difficulty
  tiles: number
  layers: number
  stats: StatsStore
  settings: Settings
  lang: Lang
  shufflesUsed: number
  onChangeSettings: (patch: Partial<Settings>) => void
  onClearStats: () => void
  onRestart: () => void
  onShuffle: () => void
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label className="setting-row">
      <span className="setting-text">
        <span className="setting-label">{label}</span>
        <span className="setting-hint">{description}</span>
      </span>
      <span className={`switch${checked ? ' switch--on' : ''}`}>
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="switch-knob" aria-hidden="true" />
      </span>
    </label>
  )
}

const LANGS: Array<{ key: Lang; label: string }> = [
  { key: 'en', label: 'English' },
  { key: 'th', label: 'ไทย' },
]

export function SidePanel({
  difficulty,
  tiles,
  layers,
  stats,
  settings,
  lang,
  shufflesUsed,
  onChangeSettings,
  onClearStats,
  onRestart,
  onShuffle,
}: SidePanelProps) {
  const [confirmClear, setConfirmClear] = useState(false)
  const meta = DIFFICULTY_META[difficulty]
  const usage = storageUsage()
  const recent = stats.recent.slice(0, 4)

  return (
    <aside className="panel">
      <section className="panel-card">
        <h2 className="panel-title">{t(lang, 'side.board')}</h2>
        <div className="fact-row">
          <span className="fact-key">{t(lang, 'side.difficulty')}</span>
          <span className="fact-value accent-ink" style={accentInk(meta.accent)}>
            {lang === 'th' ? meta.labelTh : meta.labelEn}
          </span>
        </div>
        <div className="fact-row">
          <span className="fact-key">{t(lang, 'side.tiles')}</span>
          <span className="fact-value">{t(lang, 'side.tilesValue', { n: tiles })}</span>
        </div>
        <div className="fact-row">
          <span className="fact-key">{t(lang, 'side.layers')}</span>
          <span className="fact-value">{t(lang, 'side.layersValue', { n: layers })}</span>
        </div>
        <div className="fact-row">
          <span className="fact-key">{t(lang, 'side.verified')}</span>
          <span className="fact-value fact-value--ok">{t(lang, 'side.solvable')}</span>
        </div>
      </section>

      <section className="panel-card">
        <h2 className="panel-title">{t(lang, 'side.stats')}</h2>
        <div className="stat-table">
          {DIFFICULTIES.map((d) => {
            const s = stats.byDifficulty[d]
            return (
              <div className="stat-row" key={d}>
                <span className="stat-name accent-ink" style={accentInk(DIFFICULTY_META[d].accent)}>
                  {t(lang, `diff.${d}`)}
                </span>
                <span className="stat-best">{s.bestTime !== null ? formatTime(s.bestTime) : '—'}</span>
                <span className="stat-count">
                  {s.completed}/{s.played}
                </span>
              </div>
            )
          })}
        </div>
        <p className="panel-note">{t(lang, 'side.statsNote')}</p>

        {recent.length > 0 && (
          <ul className="recent">
            {recent.map((r) => (
              <li key={r.at} className="recent-item">
                <span
                  className="recent-dot"
                  style={{ background: DIFFICULTY_META[r.difficulty].accent }}
                  aria-hidden="true"
                />
                <span className="recent-diff">{t(lang, `diff.${r.difficulty}`)}</span>
                <span className="recent-time">{formatTime(r.time)}</span>
                <span className="recent-hint">💡{r.hints}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel-card">
        <h2 className="panel-title">{t(lang, 'side.help')}</h2>
        <button
          type="button"
          className="btn btn--soft btn--block"
          onClick={onShuffle}
        >
          {t(lang, 'side.shuffle')}
        </button>
        <button type="button" className="btn btn--ghost btn--block" onClick={onRestart}>
          {t(lang, 'side.restart')}
        </button>
        <p className="panel-note">{t(lang, 'side.shuffleNote', { n: shufflesUsed })}</p>
      </section>

      <section className="panel-card">
        <h2 className="panel-title">{t(lang, 'side.settings')}</h2>
        <Toggle
          label={t(lang, 'settings.dimCovered')}
          description={t(lang, 'settings.dimCoveredDesc')}
          checked={settings.dimCovered}
          onChange={(v) => onChangeSettings({ dimCovered: v })}
        />
        <Toggle
          label={t(lang, 'settings.highlightMatch')}
          description={t(lang, 'settings.highlightMatchDesc')}
          checked={settings.highlightMatch}
          onChange={(v) => onChangeSettings({ highlightMatch: v })}
        />

        <div className="setting-row setting-row--lang">
          <span className="setting-text">
            <span className="setting-label">{t(lang, 'settings.language')}</span>
            <span className="setting-hint">{t(lang, 'settings.languageDesc')}</span>
          </span>
          <span className="lang-choices" role="group" aria-label={t(lang, 'settings.language')}>
            {LANGS.map((item) => (
              <button
                key={item.key}
                type="button"
                data-lang={item.key}
                className={`lang-choice${settings.lang === item.key ? ' lang-choice--active' : ''}`}
                aria-pressed={settings.lang === item.key}
                onClick={() => onChangeSettings({ lang: item.key })}
              >
                {item.label}
              </button>
            ))}
          </span>
        </div>
      </section>

      <section className="panel-card panel-card--muted">
        <h2 className="panel-title">{t(lang, 'side.storage')}</h2>
        <p className="panel-note">
          {t(lang, 'side.storageNote', {
            n: usage.entries,
            kb: (usage.bytes / 1024).toFixed(1),
          })}
        </p>
        {confirmClear ? (
          <div className="confirm-row">
            <button
              type="button"
              className="btn btn--danger btn--sm"
              onClick={() => {
                onClearStats()
                setConfirmClear(false)
              }}
            >
              {t(lang, 'side.confirmClear')}
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirmClear(false)}>
              {t(lang, 'side.cancel')}
            </button>
          </div>
        ) : (
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirmClear(true)}>
            {t(lang, 'side.clearStats')}
          </button>
        )}
      </section>
    </aside>
  )
}
