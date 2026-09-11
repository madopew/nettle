import type { Balance, Transfer } from './types'

export function settleGroup(group: Balance[]): Transfer[] {
  const debtors = group
    .filter((b) => b.net < 0)
    .map((b) => ({ id: b.id, amount: -b.net }))
    .sort((a, b) => b.amount - a.amount || (a.id < b.id ? -1 : 1))

  const creditors = group
    .filter((b) => b.net > 0)
    .map((b) => ({ id: b.id, amount: b.net }))
    .sort((a, b) => b.amount - a.amount || (a.id < b.id ? -1 : 1))

  const transfers: Transfer[] = []
  let d = 0
  let c = 0

  while (d < debtors.length && c < creditors.length) {
    const amount = Math.min(debtors[d].amount, creditors[c].amount)
    transfers.push({ fromId: debtors[d].id, toId: creditors[c].id, amount })
    debtors[d].amount -= amount
    creditors[c].amount -= amount
    if (debtors[d].amount === 0) d += 1
    if (creditors[c].amount === 0) c += 1
  }

  return transfers
}

export const EXACT_LIMIT = 16

export interface SettleResult {
  transfers: Transfer[]
  exact: boolean
}

export function settle(input: Balance[]): SettleResult {
  const active = input.filter((b) => b.net !== 0)
  const total = active.reduce((sum, b) => sum + b.net, 0)
  if (total !== 0) {
    throw new Error(`settle: nets must sum to zero, got ${total}`)
  }
  if (active.length === 0) return { transfers: [], exact: true }
  if (active.length > EXACT_LIMIT) {
    return { transfers: settleGroup(active), exact: false }
  }
  const groups = partitionIntoZeroSumGroups(active)
  return { transfers: groups.flatMap(settleGroup), exact: true }
}

function partitionIntoZeroSumGroups(active: Balance[]): Balance[][] {
  const n = active.length
  const size = 1 << n

  const sums = new Float64Array(size)
  for (let mask = 1; mask < size; mask += 1) {
    const low = mask & -mask
    const index = 31 - Math.clz32(low)
    sums[mask] = sums[mask ^ low] + active[index].net
  }

  const best = new Int32Array(size).fill(-1)
  const choice = new Int32Array(size)
  best[0] = 0

  for (let mask = 1; mask < size; mask += 1) {
    const low = mask & -mask
    for (let sub = mask; sub > 0; sub = (sub - 1) & mask) {
      if ((sub & low) === 0) continue
      if (sums[sub] !== 0) continue
      const rest = best[mask ^ sub]
      if (rest < 0) continue
      if (rest + 1 > best[mask]) {
        best[mask] = rest + 1
        choice[mask] = sub
      }
    }
  }

  const groups: Balance[][] = []
  let mask = size - 1
  while (mask > 0) {
    const sub = choice[mask]
    const group: Balance[] = []
    for (let i = 0; i < n; i += 1) {
      if (sub & (1 << i)) group.push(active[i])
    }
    groups.push(group)
    mask ^= sub
  }
  return groups
}
