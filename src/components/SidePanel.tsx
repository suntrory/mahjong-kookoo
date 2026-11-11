import { useState } from 'react'
import { DIFFICULTIES, formatTime } from '../lib/mahjong'
import type { Difficulty } from '../lib/mahjong'
import { storageUsage } from '../lib/storage'
import { t } from '../lib/i18n'
import type { Lang } from '../lib/i18n'
import type { Settings, StatsStore } from '../lib/storage'
import { Icon } from './Icons'

interface SidePanelProps {
  difficulty: Difficulty
  tiles: number
  layers: number
  stats: StatsStore
  settings: Settings
  lang: Lang
  onChangeSettings: (patch: Partial<Settings>) => void
  onClearStats: () => void
  onRestart: () => void
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
  onChangeSettings,
  onClearStats,
  onRestart,
}: SidePanelProps) {
  const [confirmClear, setConfirmClear] = useState(false)
  const usage = storageUsage()
  const recent = stats.recent.slice(0, 4)

  return (
    <aside className="ledger">
      <section className="ledger-section">
        <h2 className="ledger-title">{t(lang, 'side.board')}</h2>
        <dl className="facts">
          <div className="fact">
            <dt>{t(lang, 'side.difficulty')}</dt>
            <dd>{t(lang, `diff.${difficulty}`)}</dd>
          </div>
          <div className="fact">
            <dt>{t(lang, 'side.tiles')}</dt>
            <dd>{t(lang, 'side.tilesValue', { n: tiles })}</dd>
          </div>
          <div className="fact">
            <dt>{t(lang, 'side.layers')}</dt>
            <dd>{t(lang, 'side.layersValue', { n: layers })}</dd>
          </div>
          <div className="fact">
            <dt>{t(lang, 'side.verified')}</dt>
            <dd className="fact-ok">{t(lang, 'side.solvable')}</dd>
          </div>
        </dl>
        <button type="button" className="btn btn--ghost btn--block" onClick={onRestart}>
          <Icon name="restart" size={16} />
          {t(lang, 'side.restart')}
        </button>
      </section>

      <section className="ledger-section">
        <h2 className="ledger-title">{t(lang, 'side.stats')}</h2>
        <table className="stats">
          <tbody>
            {DIFFICULTIES.map((d) => {
              const s = stats.byDifficulty[d]
              return (
                <tr key={d} className={d === difficulty ? 'stats-row--current' : undefined}>
                  <th scope="row">{t(lang, `diff.${d}`)}</th>
                  <td className="stats-best">{s.bestTime !== null ? formatTime(s.bestTime) : '—'}</td>
                  <td className="stats-count">
                    {s.completed}/{s.played}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <p className="ledger-note">{t(lang, 'side.statsNote')}</p>

        {recent.length > 0 && (
          <ul className="recent">
            {recent.map((r) => (
              <li key={r.at} className="recent-item">
                <span className="recent-diff">{t(lang, `diff.${r.difficulty}`)}</span>
                <span className="recent-hint">
                  <Icon name="hint" size={12} />
                  {r.hints}
                </span>
                <span className="recent-time">{formatTime(r.time)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="ledger-section">
        <h2 className="ledger-title">{t(lang, 'side.settings')}</h2>
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

        <div className="setting-row">
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

      <section className="ledger-section">
        <h2 className="ledger-title">{t(lang, 'side.storage')}</h2>
        <p className="ledger-note">
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
