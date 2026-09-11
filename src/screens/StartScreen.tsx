import { useState } from 'react'
import { Button } from '../components/Button'
import { AmountPad } from '../components/AmountPad'
import { Sheet } from '../components/Sheet'
import { TrashIcon } from '../components/TrashIcon'
import { DEFAULT_QUICK_PICKS } from '../domain/game'
import { formatTenge } from '../domain/money'
import { MIN_PLAYERS } from '../state/reducer'
import { useGame } from '../state/GameContext'

interface Draft {
  name: string
  role: 'player' | 'dealer'
  buyIn: number
}

export function StartScreen() {
  const { dispatch, corrupted, dismissCorruption } = useGame()
  const [roster, setRoster] = useState<Draft[]>([])
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [role, setRole] = useState<'player' | 'dealer'>('player')

  const players = roster.filter((d) => d.role === 'player')
  const hasDealer = roster.some((d) => d.role === 'dealer')
  const effectiveRole = hasDealer ? 'player' : role

  const trimmedName = name.trim()
  // An empty field shows no message: the disabled button already says it is not ready.
  // A clash does need explaining, and it shows as you type.
  const nameError =
    trimmedName !== '' && roster.some((d) => d.name === trimmedName)
      ? 'Такое имя уже есть'
      : null
  const nameReady = trimmedName !== '' && nameError === null

  function closePad() {
    setAdding(false)
    setName('')
    setRole('player')
  }

  function addDraft(draft: Draft) {
    setRoster([...roster, draft])
    closePad()
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-8">
      <h1 className="mb-1 text-3xl font-bold uppercase tracking-wide text-emerald-400">Nettle</h1>
      <p className="mb-6 text-sm text-slate-400">Кто кому сколько должен</p>

      {corrupted && (
        <div className="mb-4 rounded-xl bg-amber-500/10 p-3 text-sm text-amber-300">
          Сохранённая игра повреждена и не открылась.
          <button className="ml-2 underline" onClick={dismissCorruption} type="button">
            Понятно
          </button>
        </div>
      )}

      <ul
        className={`mb-3 flex flex-col gap-2 ${roster.length === 0 ? 'flex-1' : ''}`}
      >
        {roster.map((draft, index) => (
          <li key={draft.name} className="flex items-center gap-1">
            <div className="flex min-w-0 flex-1 items-center gap-3 rounded-xl bg-slate-900 px-4 py-3">
              <span className="flex-1 truncate">{draft.name}</span>
              {draft.role === 'dealer' && (
                <span className="shrink-0 rounded-md bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                  дилер
                </span>
              )}
              {draft.role === 'player' && (
                <span className="shrink-0 tabular-nums text-slate-300">
                  {formatTenge(draft.buyIn)}
                </span>
              )}
            </div>
            <button
              type="button"
              aria-label={`Убрать ${draft.name}`}
              className="shrink-0 py-3 pl-4 pr-2 text-rose-500 active:text-rose-400"
              onClick={() => setRoster(roster.filter((_, i) => i !== index))}
            >
              <TrashIcon className="size-6" />
            </button>
          </li>
        ))}
        {roster.length === 0 && (
          <li className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-slate-800 px-4 text-center text-sm text-slate-500">
            Пока никого нет
          </li>
        )}
      </ul>

      <div className="mt-auto flex flex-col gap-2 pt-8">
        {players.length >= MIN_PLAYERS && (
          <Button
            className="w-full"
            variant="primary"
            onClick={() =>
              dispatch({
                type: 'startGame',
                players: players.map((d) => ({ name: d.name, buyIn: d.buyIn })),
                dealerName: roster.find((d) => d.role === 'dealer')?.name,
              })
            }
          >
            Начать игру
          </Button>
        )}
        <Button className="w-full" onClick={() => setAdding(true)}>
          Добавить за стол
        </Button>
      </div>

      <Sheet open={adding} onClose={closePad}>
        {adding && (
          <div>
            {!hasDealer && (
              <div className="mb-4 flex gap-2">
                <Button
                  className="flex-1"
                  variant={role === 'player' ? 'primary' : 'secondary'}
                  onClick={() => setRole('player')}
                >
                  Игрок
                </Button>
                <Button
                  className="flex-1"
                  variant={role === 'dealer' ? 'primary' : 'secondary'}
                  onClick={() => setRole('dealer')}
                >
                  Дилер
                </Button>
              </div>
            )}

            <label className="mb-1 block text-sm text-slate-400" htmlFor="player-name">
              Имя
            </label>
            <input
              id="player-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Мади"
              className="min-h-12 w-full rounded-xl bg-slate-800 px-4 text-base outline-none placeholder:text-slate-600 focus:ring-2 focus:ring-emerald-500"
            />
            <div className={nameError ? 'mb-3' : 'mb-4'}>
              {nameError && <p className="mt-1 text-sm text-rose-400">{nameError}</p>}
            </div>

            {effectiveRole === 'dealer' ? (
              <div className="flex gap-3">
                <Button className="flex-1" variant="ghost" onClick={closePad}>
                  Отмена
                </Button>
                <Button
                  className="flex-1"
                  variant="primary"
                  disabled={!nameReady}
                  onClick={() =>
                    addDraft({ name: trimmedName, role: 'dealer', buyIn: 0 })
                  }
                >
                  Добавить
                </Button>
              </div>
            ) : (
              <AmountPad
                label="Сколько заходит"
                quickPicks={DEFAULT_QUICK_PICKS}
                confirmLabel="Добавить"
                confirmDisabled={!nameReady}
                onCancel={closePad}
                onConfirm={(amount) =>
                  addDraft({ name: trimmedName, role: 'player', buyIn: amount })
                }
              />
            )}
          </div>
        )}

      </Sheet>
    </div>
  )
}
