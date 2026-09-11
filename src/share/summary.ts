import { formatDuration } from '../domain/duration'
import { findParticipant, net, rankedByNet } from '../domain/game'
import { formatSignedTenge, formatTenge } from '../domain/money'
import type { Game } from '../domain/types'

export function buildSummary(game: Game): string {
  const settlement = game.settlement
  if (!settlement) return ''

  const nameOf = (id: string) => findParticipant(game, id)?.name ?? '?'

  const payments = settlement.transfers.map(
    (t) => `${nameOf(t.fromId)} → ${nameOf(t.toId)}: ${formatTenge(t.amount)}`,
  )

  const results = rankedByNet(game).map((p) => `${p.name}: ${formatSignedTenge(net(p))}`)

  return [
    'Nettle — расчёт',
    `Игра: ${formatDuration(settlement.computedAt - game.createdAt)}`,
    '',
    'Платежи:',
    ...payments,
    '',
    'Итоги:',
    ...results,
  ].join('\n')
}
