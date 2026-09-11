import { canSettle, balances } from '../domain/game'
import { settle } from '../domain/settle'
import { SCHEMA_VERSION } from '../domain/types'
import type { BuyIn, Game, Participant, Role } from '../domain/types'

export const MIN_PLAYERS = 2

export interface Deps {
  now: () => number
  newId: () => string
}

export interface AppState {
  game: Game | null
}

export type Action =
  | { type: 'loaded'; game: Game | null }
  | { type: 'startGame'; players: { name: string; buyIn: number }[]; dealerName?: string }
  | { type: 'addParticipant'; name: string; role: Role; buyIn: number }
  | { type: 'addBuyIn'; participantId: string; amount: number }
  | { type: 'deleteBuyIn'; participantId: string; buyInId: string }
  | { type: 'addTakeOut'; participantId: string; amount: number }
  | { type: 'deleteTakeOut'; participantId: string; takeOutId: string }
  | { type: 'removeParticipant'; participantId: string }
  | { type: 'cashOutEarly'; participantId: string; amount: number }
  | { type: 'undoEarlyExit'; participantId: string }
  | { type: 'setCashOut'; participantId: string; amount: number | null }
  | { type: 'beginCounting' }
  | { type: 'backToGame' }
  | { type: 'settleGame' }
  | { type: 'discardGame' }

export function makeReducer(deps: Deps) {
  return function reducer(state: AppState, action: Action): AppState {
    if (action.type === 'loaded') return { game: action.game }
    if (action.type === 'discardGame') return { game: null }

    if (action.type === 'startGame') {
      const names = action.players.map((p) => p.name.trim())
      const dealerName = action.dealerName?.trim()
      const allNames = dealerName ? [...names, dealerName] : names
      if (names.length < MIN_PLAYERS) return state
      if (allNames.some((n) => n === '')) return state
      if (new Set(allNames).size !== allNames.length) return state
      if (action.players.some((p) => p.buyIn <= 0)) return state

      const participants: Participant[] = action.players.map((p, i) => ({
        id: deps.newId(),
        name: names[i],
        role: 'player',
        buyIns: [{ id: deps.newId(), amount: p.buyIn, at: deps.now() }],
        takeOuts: [],
        cashOut: null,
        leftAt: null,
      }))
      if (dealerName) {
        participants.push({
          id: deps.newId(),
          name: dealerName,
          role: 'dealer',
          buyIns: [],
          takeOuts: [],
          cashOut: null,
          leftAt: null,
        })
      }
      return {
        game: {
          id: deps.newId(),
          createdAt: deps.now(),
          schemaVersion: SCHEMA_VERSION,
          status: 'active',
          participants,
          settlement: null,
        },
      }
    }

    const game = state.game
    if (!game) return state
    if (game.status === 'settled') return state

    switch (action.type) {
      case 'addParticipant': {
        const name = action.name.trim()
        if (name === '') return state
        if (game.participants.some((p) => p.name === name)) return state
        if (action.role === 'dealer') {
          if (game.participants.some((p) => p.role === 'dealer')) return state
          return withParticipants(game, [
            ...game.participants,
            {
              id: deps.newId(),
              name,
              role: 'dealer',
              buyIns: [],
              takeOuts: [],
              cashOut: null,
              leftAt: null,
            },
          ])
        }
        if (action.buyIn <= 0) return state
        return withParticipants(game, [
          ...game.participants,
          {
            id: deps.newId(),
            name,
            role: 'player',
            buyIns: [{ id: deps.newId(), amount: action.buyIn, at: deps.now() }],
            takeOuts: [],
            cashOut: null,
            leftAt: null,
          },
        ])
      }

      case 'addBuyIn': {
        if (action.amount <= 0) return state
        return mapParticipant(game, action.participantId, (p) => {
          if (p.role === 'dealer' || p.leftAt !== null) return p
          const entry: BuyIn = { id: deps.newId(), amount: action.amount, at: deps.now() }
          return { ...p, buyIns: [...p.buyIns, entry] }
        })
      }


      case 'addTakeOut': {
        if (action.amount <= 0) return state
        return mapParticipant(game, action.participantId, (p) => {
          // A dealer has nothing on the table, and someone who has left already
          // took everything with them.
          if (p.role === 'dealer' || p.leftAt !== null) return p
          const entry: BuyIn = { id: deps.newId(), amount: action.amount, at: deps.now() }
          return { ...p, takeOuts: [...p.takeOuts, entry] }
        })
      }

      case 'deleteTakeOut':
        return mapParticipant(game, action.participantId, (p) => ({
          ...p,
          takeOuts: p.takeOuts.filter((b) => b.id !== action.takeOutId),
        }))

      case 'deleteBuyIn':
        return mapParticipant(game, action.participantId, (p) => ({
          ...p,
          buyIns: p.buyIns.filter((b) => b.id !== action.buyInId),
        }))

      case 'removeParticipant': {
        const target = game.participants.find((p) => p.id === action.participantId)
        if (!target) return state
        if (target.buyIns.length > 0 || target.takeOuts.length > 0) return state
        if (target.role === 'player') {
          const players = game.participants.filter((p) => p.role === 'player').length
          if (players - 1 < MIN_PLAYERS) return state
        }
        return withParticipants(
          game,
          game.participants.filter((p) => p.id !== action.participantId),
        )
      }

      case 'cashOutEarly': {
        if (action.amount < 0) return state
        return mapParticipant(game, action.participantId, (p) =>
          p.role === 'dealer' ? p : { ...p, cashOut: action.amount, leftAt: deps.now() },
        )
      }

      case 'undoEarlyExit':
        return mapParticipant(game, action.participantId, (p) => ({
          ...p,
          cashOut: null,
          leftAt: null,
        }))

      case 'setCashOut': {
        if (action.amount !== null && action.amount < 0) return state
        return mapParticipant(game, action.participantId, (p) => ({
          ...p,
          cashOut: action.amount,
        }))
      }

      case 'beginCounting':
        if (game.status !== 'active') return state
        return { game: { ...game, status: 'counting' } }

      case 'backToGame':
        if (game.status !== 'counting') return state
        return { game: { ...game, status: 'active' } }

      case 'settleGame': {
        if (!canSettle(game)) return state
        const result = settle(balances(game))
        return {
          game: {
            ...game,
            status: 'settled',
            settlement: {
              transfers: result.transfers,
              exact: result.exact,
              computedAt: deps.now(),
            },
          },
        }
      }

      default:
        return state
    }
  }
}

function withParticipants(game: Game, participants: Participant[]): AppState {
  return { game: { ...game, participants } }
}

function mapParticipant(
  game: Game,
  id: string,
  fn: (p: Participant) => Participant,
): AppState {
  return {
    game: {
      ...game,
      participants: game.participants.map((p) => (p.id === id ? fn(p) : p)),
    },
  }
}
