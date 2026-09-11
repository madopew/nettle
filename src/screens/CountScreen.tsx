import { useState } from 'react'
import { BalanceBar } from '../components/BalanceBar'
import { Button } from '../components/Button'
import { Sheet } from '../components/Sheet'
import { allCountsEntered, canSettle, gap, totalIn, totalOut } from '../domain/game'
import { formatTenge, parseAmount } from '../domain/money'
import { useGame } from '../state/GameContext'

export function CountScreen() {
  const { game, dispatch } = useGame()
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set())
  const [quitting, setQuitting] = useState(false)
  const [settling, setSettling] = useState(false)
  if (!game) return null

  const gapValue = gap(game)
  const ready = allCountsEntered(game)

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-6">
      <h1 className="mb-1 text-2xl font-semibold">Подсчёт</h1>
      <p className="mb-6 text-sm text-slate-400">Сколько у кого на руках</p>

      <ul className="flex flex-col gap-2">
        {game.participants.map((p) => {
          const locked = p.leftAt !== null && !unlocked.has(p.id)
          return (
            <li key={p.id} className="rounded-2xl bg-slate-900 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="truncate text-base font-medium">{p.name}</p>
                  <p className="text-sm text-slate-500">
                    {p.role === 'dealer'
                      ? 'чаевые'
                      : totalOut(p) > 0
                        ? `закуп ${formatTenge(totalIn(p))} · забрал ${formatTenge(totalOut(p))}`
                        : `закуп ${formatTenge(totalIn(p))}`}
                  </p>
                </div>
                <input
                  aria-label={`Сумма: ${p.name}`}
                  inputMode="numeric"
                  disabled={locked}
                  value={p.cashOut === null ? '' : String(p.cashOut)}
                  placeholder="0"
                  onChange={(e) => {
                    const raw = e.target.value
                    const amount =
                      raw.trim() === ''
                        ? null
                        : /^0+$/.test(raw.replace(/[\s ]/g, ''))
                          ? 0
                          : parseAmount(raw)
                    if (raw.trim() !== '' && amount === null) return
                    dispatch({ type: 'setCashOut', participantId: p.id, amount })
                  }}
                  className="min-h-12 w-32 rounded-xl bg-slate-800 px-3 text-right text-base tabular-nums outline-none focus:ring-2 focus:ring-emerald-500 disabled:text-slate-500"
                />
              </div>
              {locked && (
                <button
                  type="button"
                  className="mt-2 text-sm text-slate-400 underline"
                  onClick={() =>
                    setUnlocked((prev) => {
                      const next = new Set(prev)
                      next.add(p.id)
                      return next
                    })
                  }
                >
                  Пересчитать
                </button>
              )}
            </li>
          )
        })}
      </ul>

      <Button className="mt-4" variant="ghost" onClick={() => dispatch({ type: 'backToGame' })}>
        Назад к игре
      </Button>

      <Button className="mt-1" variant="danger" onClick={() => setQuitting(true)}>
        Завершить без расчёта
      </Button>

      <div className="mt-auto flex flex-col gap-2 pt-8">
        <BalanceBar gapValue={gapValue} ready={ready} />
        <Button
          className="w-full"
          variant="primary"
          disabled={!canSettle(game)}
          onClick={() => setSettling(true)}
        >
          Рассчитать
        </Button>
      </div>

      <Sheet open={settling} onClose={() => setSettling(false)}>
        <p className="mb-2 text-base font-medium text-slate-100">Рассчитать игру?</p>
        <p className="mb-6 text-sm text-slate-400">
          Вернуться к вводу сумм после этого будет нельзя.
        </p>
        <div className="flex gap-3">
          <Button className="flex-1" variant="ghost" onClick={() => setSettling(false)}>
            Отмена
          </Button>
          <Button
            className="flex-1"
            variant="primary"
            onClick={() => {
              dispatch({ type: 'settleGame' })
              setSettling(false)
            }}
          >
            Рассчитать
          </Button>
        </div>
      </Sheet>

      <Sheet open={quitting} onClose={() => setQuitting(false)}>
        <p className="mb-2 text-base font-medium text-slate-100">Завершить без расчёта?</p>
        <p className="mb-6 text-sm text-slate-400">
          Игра будет стёрта, и приложение не посчитает, кто кому должен. Отменить это
          нельзя.
        </p>
        <div className="flex gap-3">
          <Button className="flex-1" variant="ghost" onClick={() => setQuitting(false)}>
            Отмена
          </Button>
          <Button
            className="flex-1"
            variant="danger"
            onClick={() => dispatch({ type: 'discardGame' })}
          >
            Да, завершить
          </Button>
        </div>
      </Sheet>
    </div>
  )
}
