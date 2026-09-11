import type { Balance, Game, Participant } from './types'

export const DEFAULT_QUICK_PICKS = [1000, 2000, 5000, 10000]

export function totalIn(p: Participant): number {
  return p.buyIns.reduce((sum, b) => sum + b.amount, 0)
}

/** Money this participant has already taken off the table and kept. */
export function totalOut(p: Participant): number {
  return p.takeOuts.reduce((sum, b) => sum + b.amount, 0)
}

export function net(p: Participant): number {
  return (p.cashOut ?? 0) + totalOut(p) - totalIn(p)
}

/** Money currently sitting on the table: everything bought in, less what was pocketed. */
export function potInPlay(g: Game): number {
  return g.participants.reduce((sum, p) => sum + totalIn(p) - totalOut(p), 0)
}

export function gap(g: Game): number {
  return g.participants.reduce((sum, p) => sum + net(p), 0)
}

export function allCountsEntered(g: Game): boolean {
  return g.participants.every((p) => p.cashOut !== null)
}

export function canSettle(g: Game): boolean {
  return allCountsEntered(g) && gap(g) === 0
}

export function balances(g: Game): Balance[] {
  return g.participants.map((p) => ({ id: p.id, net: net(p) }))
}

export function findParticipant(g: Game, id: string): Participant | undefined {
  return g.participants.find((p) => p.id === id)
}

export function dealer(g: Game): Participant | undefined {
  return g.participants.find((p) => p.role === 'dealer')
}

export function rankedByNet(g: Game): Participant[] {
  return [...g.participants].sort((a, b) => net(b) - net(a))
}

