import { useEffect, useState } from 'react'
import { AmountPad } from '../components/AmountPad'
import { Button } from '../components/Button'
import { ClockIcon } from '../components/ClockIcon'
import { CashOutIcon } from '../components/CashOutIcon'
import { CoinsIcon } from '../components/CoinsIcon'
import { TrashIcon } from '../components/TrashIcon'
import { Sheet } from '../components/Sheet'
import { DEFAULT_QUICK_PICKS, dealer, potInPlay, totalIn, totalOut } from '../domain/game'
import { formatClock } from '../domain/duration'
import { formatTenge } from '../domain/money'
import { useGame } from '../state/GameContext'

type Pad =
  | { kind: 'actions'; participantId: string; name: string; left: boolean }
  | { kind: 'rebuy'; participantId: string; name: string }
  | { kind: 'take'; participantId: string; name: string }
  | { kind: 'leave'; participantId: string; name: string }
  | { kind: 'join' }

const CLOCK_TICK_MS = 1_000

export function GameScreen({ onOpenParticipant }: { onOpenParticipant: (id: string) => void }) {
  const { game, dispatch } = useGame()
  const [pad, setPad] = useState<Pad | null>(null)
  const [removing, setRemoving] = useState<{ id: string; name: string } | null>(null)
  const [joinName, setJoinName] = useState('')
  const [joinRole, setJoinRole] = useState<'player' | 'dealer'>('player')
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), CLOCK_TICK_MS)
    return () => clearInterval(id)
  }, [])

  if (!game) return null

  const participants = game.participants
  const hasDealer = dealer(game) !== undefined
  const effectiveJoinRole = hasDealer ? 'player' : joinRole

  const trimmedJoinName = joinName.trim()
  // An empty field shows no message: the disabled button already says it is not ready.
  // A clash does need explaining, and it shows as you type.
  const joinError =
    trimmedJoinName !== '' && participants.some((p) => p.name === trimmedJoinName)
      ? 'Такое имя уже есть'
      : null
  const joinReady = trimmedJoinName !== '' && joinError === null

  function closeJoin() {
    setPad(null)
    setJoinName('')
    setJoinRole('player')
  }


  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-6">
      <header className="mb-5 flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <ClockIcon className="size-6 shrink-0" />
          <span className="text-lg tabular-nums text-slate-300">
            {formatClock(now - game.createdAt)}
          </span>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <CoinsIcon className="size-6 shrink-0" />
          <span
            data-testid="pot-in-play"
            className="truncate text-lg font-semibold tabular-nums"
          >
            {formatTenge(potInPlay(game))}
          </span>
        </div>
      </header>

      <ul className="flex flex-col gap-2">
        {game.participants.map((p) => {
          const left = p.leftAt !== null
          return (
            <li
              key={p.id}
              data-testid={`row-${p.name}`}
              className="flex items-center gap-1"
            >
              <div
                className={`min-w-0 flex-1 rounded-2xl bg-slate-900 px-4 py-3 ${
                  left ? 'opacity-50' : 'cursor-pointer'
                }`}
                onClick={left ? undefined : () => onOpenParticipant(p.id)}
              >
              <div className="flex items-center gap-3">
                <span className="flex min-h-12 min-w-0 flex-1 items-center text-base font-medium">
                  {/* the ellipsis needs a block-level box: it does nothing on a flex container */}
                  <span className="truncate">{p.name}</span>
                </span>
                {p.role === 'dealer' && (
                <span className="shrink-0 rounded-md bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                  дилер
                </span>
                )}
                {p.role === 'player' && totalOut(p) > 0 && (
                  <span className="shrink-0 tabular-nums text-sm text-emerald-400">
                    (+{formatTenge(totalOut(p))})
                  </span>
                )}
                <span data-testid="total-in" className="tabular-nums text-slate-300">
                  {p.role === 'dealer'
                    ? p.cashOut === null
                      ? ''
                      : formatTenge(p.cashOut)
                    : formatTenge(totalIn(p))}
                </span>
                {p.role === 'player' && !left && (
                  <Button
                    aria-label={`Докупка: ${p.name}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      setPad({ kind: 'rebuy', participantId: p.id, name: p.name })
                    }}
                  >
                    +
                  </Button>
                )}
              </div>

              {p.role === 'player' && left && (
                <p className="mt-2 text-right text-sm text-slate-400">
                  вышел с {formatTenge(p.cashOut ?? 0)}
                </p>
              )}

              </div>

              {p.role === 'player' && (
                <button
                  type="button"
                  aria-label={`Действия: ${p.name}`}
                  className={`shrink-0 py-3 pl-4 pr-2 ${
                    left ? 'text-emerald-400' : 'text-slate-300 active:text-slate-100'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation()
                    setPad({ kind: 'actions', participantId: p.id, name: p.name, left })
                  }}
                >
                  <CashOutIcon
                    className="size-6"
                    style={left ? { transform: 'scaleX(-1)' } : undefined}
                  />
                </button>
              )}

              {/* Only the dealer can be taken off the table: a player always has a
                  buy-in recorded, and removing that would unbalance the books. */}
              {p.role === 'dealer' && (
                <button
                  type="button"
                  aria-label={`Убрать со стола: ${p.name}`}
                  className="shrink-0 py-3 pl-4 pr-2 text-rose-500 active:text-rose-400"
                  onClick={(e) => {
                    e.stopPropagation()
                    setRemoving({ id: p.id, name: p.name })
                  }}
                >
                  <TrashIcon className="size-6" />
                </button>
              )}
            </li>
          )
        })}
      </ul>

      <Button className="mt-4" onClick={() => setPad({ kind: 'join' })}>
        Добавить за стол
      </Button>

      <div className="mt-auto pt-8">
        <Button
          className="w-full"
          variant="primary"
          onClick={() => dispatch({ type: 'beginCounting' })}
        >
          Закончить игру
        </Button>
      </div>

      <Sheet open={removing !== null} onClose={() => setRemoving(null)}>
        <p className="mb-2 text-base font-medium text-slate-100">
          Убрать дилера со стола?
        </p>
        <p className="mb-6 text-sm text-slate-400">
          {removing?.name} исчезнет из игры вместе с чаевыми, которые за ним записаны.
        </p>
        <div className="flex gap-3">
          <Button className="flex-1" variant="ghost" onClick={() => setRemoving(null)}>
            Отмена
          </Button>
          <Button
            className="flex-1"
            variant="danger"
            onClick={() => {
              if (removing) {
                dispatch({ type: 'removeParticipant', participantId: removing.id })
              }
              setRemoving(null)
            }}
          >
            Убрать
          </Button>
        </div>
      </Sheet>

      <Sheet
        open={pad !== null}
        onClose={() => {
          if (pad?.kind === 'join') closeJoin()
          else setPad(null)
        }}
      >
        {pad?.kind === 'actions' && (
          <div className="flex flex-col gap-2">
            {pad.left ? (
              <Button
                onClick={() => {
                  dispatch({ type: 'undoEarlyExit', participantId: pad.participantId })
                  setPad(null)
                }}
              >
                Вернуть в игру
              </Button>
            ) : (
              <>
                <Button
                  onClick={() =>
                    setPad({ kind: 'take', participantId: pad.participantId, name: pad.name })
                  }
                >
                  Забрать часть
                </Button>
                <Button
                  onClick={() =>
                    setPad({ kind: 'leave', participantId: pad.participantId, name: pad.name })
                  }
                >
                  Выйти из игры
                </Button>
              </>
            )}
          </div>
        )}

        {pad?.kind === 'rebuy' && (
          <AmountPad
            label="Сколько докупает"
            quickPicks={DEFAULT_QUICK_PICKS}
            confirmLabel="Добавить"
            onCancel={() => setPad(null)}
            onConfirm={(amount) => {
              dispatch({ type: 'addBuyIn', participantId: pad.participantId, amount })
              setPad(null)
            }}
          />
        )}

        {pad?.kind === 'take' && (
          <AmountPad
            label="Сколько забирает"
            quickPicks={DEFAULT_QUICK_PICKS}
            confirmLabel="Забрать"
            cancelLabel="Назад"
            onCancel={() =>
              setPad({
                kind: 'actions',
                participantId: pad.participantId,
                name: pad.name,
                left: false,
              })
            }
            onConfirm={(amount) => {
              dispatch({ type: 'addTakeOut', participantId: pad.participantId, amount })
              setPad(null)
            }}
          />
        )}

        {pad?.kind === 'leave' && (
          <AmountPad
            label="Сколько на руках"
            quickPicks={[]}
            allowZero
            confirmLabel="Записать"
            cancelLabel="Назад"
            onCancel={() =>
              setPad({
                kind: 'actions',
                participantId: pad.participantId,
                name: pad.name,
                left: false,
              })
            }
            onConfirm={(amount) => {
              dispatch({ type: 'cashOutEarly', participantId: pad.participantId, amount })
              setPad(null)
            }}
          />
        )}

        {pad?.kind === 'join' && (
          <div>
            {!hasDealer && (
              <div className="mb-4 flex gap-2">
                <Button
                  className="flex-1"
                  variant={joinRole === 'player' ? 'primary' : 'secondary'}
                  onClick={() => setJoinRole('player')}
                >
                  Игрок
                </Button>
                <Button
                  className="flex-1"
                  variant={joinRole === 'dealer' ? 'primary' : 'secondary'}
                  onClick={() => setJoinRole('dealer')}
                >
                  Дилер
                </Button>
              </div>
            )}

            <label className="mb-1 block text-sm text-slate-400" htmlFor="join-name">
              Имя
            </label>
            <input
              id="join-name"
              autoFocus
              value={joinName}
              onChange={(e) => setJoinName(e.target.value)}
              className="min-h-12 w-full rounded-xl bg-slate-800 px-4 text-base outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <div className="mb-4">
              {joinError && <p className="mt-1 text-sm text-rose-400">{joinError}</p>}
            </div>

            {effectiveJoinRole === 'dealer' ? (
              <div className="mt-5 flex gap-3">
                <Button className="flex-1" variant="ghost" onClick={closeJoin}>
                  Отмена
                </Button>
                <Button
                  className="flex-1"
                  variant="primary"
                  disabled={!joinReady}
                  onClick={() => {
                    dispatch({
                      type: 'addParticipant',
                      name: trimmedJoinName,
                      role: 'dealer',
                      buyIn: 0,
                    })
                    closeJoin()
                  }}
                >
                  Посадить
                </Button>
              </div>
            ) : (
              <AmountPad
                label="Стартовый закуп"
                quickPicks={DEFAULT_QUICK_PICKS}
                confirmLabel="Посадить"
                confirmDisabled={!joinReady}
                onCancel={closeJoin}
                onConfirm={(amount) => {
                  dispatch({
                    type: 'addParticipant',
                    name: trimmedJoinName,
                    role: 'player',
                    buyIn: amount,
                  })
                  closeJoin()
                }}
              />
            )}
          </div>
        )}
      </Sheet>
    </div>
  )
}
