interface Props {
  className?: string
}

const COINS = [
  { cx: 9.5, cy: 22 },
  { cx: 22.5, cy: 22 },
  { cx: 16, cy: 11 },
]

/** A static pile of gold coins, in the flat rimmed style of a game HUD. */
export function CoinsIcon({ className }: Props) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      {COINS.map(({ cx, cy }) => (
        <g key={`${cx}-${cy}`}>
          <circle cx={cx} cy={cy} r="7.6" fill="#8a5f12" />
          <circle cx={cx} cy={cy - 0.8} r="6.6" fill="#e0a92c" />
          <circle cx={cx} cy={cy - 0.8} r="3.8" fill="#f8d572" />
        </g>
      ))}
    </svg>
  )
}
