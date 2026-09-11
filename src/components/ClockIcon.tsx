interface Props {
  className?: string
}

/** Elapsed-time icon, built the same way as the coins: dark rim, lighter face. */
export function ClockIcon({ className }: Props) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="16.8" r="12" fill="#334155" />
      <circle cx="16" cy="16" r="11" fill="#64748b" />
      <circle cx="16" cy="16" r="8.4" fill="#cbd5e1" />
      <path
        d="M16 9.8v6.6l4.4 3"
        stroke="#334155"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
