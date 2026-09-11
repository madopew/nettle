import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const styles: Record<Variant, string> = {
  primary: 'bg-emerald-500 text-slate-950 active:bg-emerald-600 disabled:bg-slate-700 disabled:text-slate-500',
  secondary: 'bg-slate-800 text-slate-100 active:bg-slate-700 disabled:text-slate-500',
  ghost: 'bg-transparent text-slate-300 active:bg-slate-800',
  danger: 'bg-transparent text-rose-400 active:bg-rose-500/10',
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  children: ReactNode
}

export function Button({ variant = 'secondary', className = '', ...rest }: Props) {
  return (
    <button
      {...rest}
      className={`min-h-12 rounded-xl px-4 text-base font-medium transition-colors ${styles[variant]} ${className}`}
    />
  )
}
