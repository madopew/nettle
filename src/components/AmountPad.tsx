import { useState } from 'react'
import { NBSP, formatGrouped, parseAmount } from '../domain/money'
import { Button } from './Button'

interface Props {
  cancelLabel?: string
  confirmDisabled?: boolean
  label: string
  quickPicks: number[]
  allowZero?: boolean
  initial?: number | null
  confirmLabel: string
  onConfirm: (amount: number) => void
  onCancel: () => void
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0']

export function AmountPad({
  cancelLabel = 'Отмена',
  confirmDisabled = false,
  label,
  quickPicks,
  allowZero = false,
  initial = null,
  confirmLabel,
  onConfirm,
  onCancel,
}: Props) {
  const [digits, setDigits] = useState(initial === null ? '' : String(initial))

  const parsed = parseAmount(digits)
  const empty = digits === ''
  // The keypad only ever produces digits, so parseAmount returns null exactly when the
  // field is empty or all zeros. An empty field means "not answered yet" and is never
  // accepted; a typed zero is a real answer, accepted only where zero makes sense.
  const value = parsed ?? (allowZero && !empty ? 0 : null)
  const display = empty ? '₸' : `${formatGrouped(Number(digits))}${NBSP}₸`

  function press(key: string) {
    setDigits((current) => {
      const next = current === '0' ? key : current + key
      return next.length > 12 ? current : next
    })
  }

  return (
    <div>
      <p className="mb-1 block text-sm text-slate-400">{label}</p>
      <div
        data-testid="amount-display"
        className={`mb-3 rounded-2xl bg-slate-800 px-4 py-3 text-right text-3xl font-semibold tabular-nums ${
          empty ? 'text-slate-600' : ''
        }`}
      >
        {display}
      </div>

      {quickPicks.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {quickPicks.map((amount) => (
            <Button key={amount} onClick={() => setDigits(String(amount))}>
              {formatGrouped(amount)}
            </Button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {KEYS.map((key) => (
          <Button key={key} className="h-12 text-xl" onClick={() => press(key)}>
            {key}
          </Button>
        ))}
        <Button
          className="h-12 text-xl"
          aria-label="Стереть"
          onClick={() => setDigits((c) => c.slice(0, -1))}
        >
          ⌫
        </Button>
      </div>

      <div className="mt-4 flex gap-3">
        <Button className="flex-1" variant="ghost" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button
          className="flex-1"
          variant="primary"
          disabled={value === null || confirmDisabled}
          onClick={() => value !== null && onConfirm(value)}
        >
          {confirmLabel}
        </Button>
      </div>
    </div>
  )
}
