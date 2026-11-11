'use client'

import { useSyncExternalStore } from 'react'
import Game from './Game'

const subscribe = () => () => {}

/**
 * The game reads localStorage and deals a random board on first render, so it
 * only mounts in the browser. The server sends a quiet placeholder table.
 */
export function GameClient() {
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  )

  if (!mounted) {
    return (
      <div className="app app--loading" aria-busy="true">
        <div className="app-inner">
          <header className="masthead">
            <div className="brand">
              <span className="seal" aria-hidden="true">
                中
              </span>
              <div className="brand-text">
                <h1>Mahjong</h1>
                <p>Solitaire</p>
              </div>
            </div>
          </header>
          <div className="table table--placeholder">
            <div className="felt">
              <span className="felt-loading" aria-hidden="true">
                麻雀
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return <Game />
}
