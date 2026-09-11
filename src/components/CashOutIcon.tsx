import type { CSSProperties } from 'react'

interface Props {
  className?: string
  style?: CSSProperties
}

/** Arrow leaving a bracket: money coming off the table. */
export function CashOutIcon({ className, style }: Props) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
      <path d="M10 16l4-4-4-4" />
      <path d="M14 12H3" />
    </svg>
  )
}
