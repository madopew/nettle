import { SCHEMA_VERSION } from '../domain/types'
import type { Game } from '../domain/types'

export const STORAGE_KEY = 'nettle.game.v1'

export interface LoadResult {
  game: Game | null
  corrupted: boolean
}

export function loadGame(): LoadResult {
  let raw: string | null
  try {
    raw = localStorage.getItem(STORAGE_KEY)
  } catch {
    return { game: null, corrupted: true }
  }
  if (raw === null) return { game: null, corrupted: false }

  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isGame(parsed)) return { game: null, corrupted: true }
    if (parsed.schemaVersion > SCHEMA_VERSION) return { game: null, corrupted: true }
    const game: Game = {
      ...parsed,
      participants: parsed.participants.map((p) => ({ ...p, takeOuts: p.takeOuts ?? [] })),
    }
    return { game, corrupted: false }
  } catch {
    return { game: null, corrupted: true }
  }
}

export function saveGame(game: Game): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(game))
  } catch {
    // Storage is full or blocked. The in-memory game is still correct,
    // so losing durability is preferable to crashing mid-game.
  }
}

export function clearGame(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing useful to do; treated as already cleared.
  }
}

function isGame(value: unknown): value is Game {
  if (typeof value !== 'object' || value === null) return false
  const g = value as Record<string, unknown>
  if (
    typeof g.id !== 'string' ||
    typeof g.createdAt !== 'number' ||
    typeof g.schemaVersion !== 'number' ||
    (g.status !== 'active' && g.status !== 'counting' && g.status !== 'settled') ||
    !Array.isArray(g.participants) ||
    !g.participants.every(isParticipant)
  ) {
    return false
  }

  if (g.status === 'settled') return isSettlement(g.settlement)
  // Unfinished games must not carry a settlement; null or absent is fine.
  return g.settlement === null || g.settlement === undefined
}

function isParticipant(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false
  const p = value as Record<string, unknown>
  return (
    typeof p.id === 'string' &&
    typeof p.name === 'string' &&
    (p.role === 'player' || p.role === 'dealer') &&
    Array.isArray(p.buyIns) &&
    p.buyIns.every(isBuyIn) &&
    // Absent in games saved before take-outs existed; normalised on load.
    (p.takeOuts === undefined ||
      (Array.isArray(p.takeOuts) && p.takeOuts.every(isBuyIn))) &&
    (p.cashOut === null || isNonNegativeSafeInteger(p.cashOut)) &&
    (p.leftAt === null || typeof p.leftAt === 'number')
  )
}

function isBuyIn(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false
  const b = value as Record<string, unknown>
  return typeof b.id === 'string' && isPositiveSafeInteger(b.amount) && typeof b.at === 'number'
}

function isSettlement(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false
  const s = value as Record<string, unknown>
  return (
    Array.isArray(s.transfers) &&
    s.transfers.every(isTransfer) &&
    typeof s.computedAt === 'number' &&
    typeof s.exact === 'boolean'
  )
}

function isTransfer(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false
  const t = value as Record<string, unknown>
  return (
    typeof t.fromId === 'string' && typeof t.toId === 'string' && isPositiveSafeInteger(t.amount)
  )
}

function isPositiveSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}
