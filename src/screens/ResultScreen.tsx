import { useEffect, useRef, useState } from 'react'
import { Button } from '../components/Button'
import { Sheet } from '../components/Sheet'
import { findParticipant, net, rankedByNet } from '../domain/game'
import { formatSignedTenge, formatTenge } from '../domain/money'
import { buildSummary } from '../share/summary'
import { useGame } from '../state/GameContext'

/**
 * navigator.clipboard exists only in a secure context, so it is missing when the app
 * is opened over plain http on a LAN address. Fall back to the old selection trick,
 * which still works there.
 */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // fall through to the legacy path
  }
  try {
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    area.setSelectionRange(0, text.length)
    const ok = document.execCommand('copy')
    document.body.removeChild(area)
    return ok
  } catch {
    return false
  }
}

export function ResultScreen() {
  const { game, dispatch } = useGame()
  const [confirming, setConfirming] = useState(false)
  const [copied, setCopied] = useState(false)
  const resetTimer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(resetTimer.current), [])

  if (!game || !game.settlement) return null
  const { transfers, exact } = game.settlement
  const summary = buildSummary(game)

  const ranked = rankedByNet(game)

  async function share() {
    // The native sheet already offers "copy", so prefer it. Where it does not exist
    // (any non-secure context, and most desktop browsers) fall back to copying.
    if (navigator.share) {
      try {
        await navigator.share({ text: summary })
        return
      } catch {
        return // the user dismissed the sheet
      }
    }
    if (await copyToClipboard(summary)) {
      setCopied(true)
      window.clearTimeout(resetTimer.current)
      resetTimer.current = window.setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-6">
      <h1 className="mb-1 text-2xl font-semibold">Расчёт</h1>
      <p className="mb-6 text-sm text-slate-400">
        {transfers.length === 0
          ? 'Все при своих, переводов нет'
          : `Переводов: ${transfers.length}`}
        {!exact && ' · приблизительно'}
      </p>

      <ul className="mb-8 flex flex-col gap-2">
        {transfers.map((t, index) => (
          <li
            key={`${t.fromId}-${t.toId}-${index}`}
            data-testid={`transfer-${index}`}
            className="flex items-center gap-3 rounded-2xl bg-slate-900 px-4 py-4"
          >
            <span className="flex min-w-0 flex-1 items-center gap-2">
              <span className="truncate">{findParticipant(game, t.fromId)?.name}</span>
              <span className="shrink-0 text-slate-500">→</span>
              <span className="truncate">{findParticipant(game, t.toId)?.name}</span>
            </span>
            <span className="shrink-0 font-semibold tabular-nums">
              {formatTenge(t.amount)}
            </span>
          </li>
        ))}
      </ul>

      <h2 className="mb-2 text-sm font-medium text-slate-400">Итоги</h2>
      <ul className="mb-8 flex flex-col gap-1">
        {ranked.map((p) => (
          <li
            key={p.id}
            data-testid={`result-${p.name}`}
            className="flex items-center gap-3 px-1 py-2"
          >
            <span className="min-w-0 flex-1 truncate">{p.name}</span>
            <span
              className={`tabular-nums ${net(p) > 0 ? 'text-emerald-400' : net(p) < 0 ? 'text-rose-400' : 'text-slate-400'}`}
            >
              {formatSignedTenge(net(p))}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-auto flex flex-col gap-2">
        <Button onClick={share}>{copied ? 'Скопировано' : 'Поделиться'}</Button>
        <Button variant="primary" onClick={() => setConfirming(true)}>
          Новая игра
        </Button>
      </div>

      <Sheet open={confirming} onClose={() => setConfirming(false)}>
        <p className="mb-2 text-base font-medium text-slate-100">Стереть эту игру?</p>
        <p className="mb-6 text-sm text-slate-400">
          Расчёт больше не откроется. Отменить это нельзя.
        </p>
        <div className="flex gap-3">
          <Button className="flex-1" variant="ghost" onClick={() => setConfirming(false)}>
            Отмена
          </Button>
          <Button
            className="flex-1"
            variant="danger"
            onClick={() => dispatch({ type: 'discardGame' })}
          >
            Да, стереть
          </Button>
        </div>
      </Sheet>
    </div>
  )
}
