import { formatTenge } from '../domain/money'

interface Props {
  gapValue: number
  ready: boolean
}

export function BalanceBar({ gapValue, ready }: Props) {
  // Nothing to say once the books balance: the enabled button already says it.
  if (gapValue === 0 && ready) return null

  let text: string
  if (gapValue < 0) text = `Не хватает ${formatTenge(-gapValue)}`
  else if (gapValue > 0) text = `Лишние ${formatTenge(gapValue)}`
  else text = 'Введите все суммы'

  return (
    <p data-testid="balance-bar" className="text-center text-sm text-amber-300">
      {text}
    </p>
  )
}
