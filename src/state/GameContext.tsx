import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react'
import type { Dispatch, ReactNode } from 'react'
import type { Game } from '../domain/types'
import { makeReducer } from './reducer'
import type { Action, AppState } from './reducer'
import { clearGame, loadGame, saveGame } from './storage'

interface GameContextValue {
  game: Game | null
  corrupted: boolean
  dispatch: Dispatch<Action>
  dismissCorruption: () => void
}

const GameContext = createContext<GameContextValue | null>(null)

// crypto.randomUUID exists only in a secure context, so it is missing when the app
// is opened over plain http on a LAN address (phone testing). Fall back rather than
// throwing, which would blank the screen mid-game.
function newId(): string {
  const c = globalThis.crypto
  if (c && typeof c.randomUUID === 'function') return c.randomUUID()
  if (c && typeof c.getRandomValues === 'function') {
    const bytes = new Uint8Array(16)
    c.getRandomValues(bytes)
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

const reducer = makeReducer({
  now: () => Date.now(),
  newId,
})

const initialState: AppState = { game: null }

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const [corrupted, setCorrupted] = useState(false)
  // True once the loaded state has actually been committed and rendered, not
  // merely once the load effect below has run. `dispatch` here only queues a
  // re-render; the save effect fires in this same commit, before that
  // re-render happens, so it must not treat hydration as done yet.
  const hydrated = useRef(false)
  // Consumed by exactly one save-effect run: the one caused by the initial
  // mount commit, before the loaded state has propagated. Skipping that run
  // prevents it from persisting/clearing against the still-stale initial
  // state (which would wipe a corrupted payload before the user ever sees
  // the recovery banner, or delete a just-loaded game).
  const skipNextSave = useRef(false)

  useEffect(() => {
    const result = loadGame()
    if (result.corrupted) setCorrupted(true)
    skipNextSave.current = true
    dispatch({ type: 'loaded', game: result.game })
  }, [])

  useEffect(() => {
    if (skipNextSave.current) {
      skipNextSave.current = false
      hydrated.current = true
      return
    }
    if (!hydrated.current) return
    if (state.game) saveGame(state.game)
    else clearGame()
  }, [state.game])

  const value = useMemo<GameContextValue>(
    () => ({
      game: state.game,
      corrupted,
      dispatch,
      dismissCorruption: () => setCorrupted(false),
    }),
    [state.game, corrupted],
  )

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

export function useGame(): GameContextValue {
  const value = useContext(GameContext)
  if (!value) throw new Error('useGame must be used inside a GameProvider')
  return value
}
