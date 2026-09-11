import { useEffect } from 'react'
import type { ReactNode } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  children: ReactNode
}

export function Sheet({ open, onClose, children }: Props) {
  // Without this the page behind keeps scrolling under the sheet, which on a phone
  // reads as the sheet itself sliding around.
  useEffect(() => {
    if (!open) return
    const { body } = document
    const previous = body.style.overflow
    body.style.overflow = 'hidden'
    return () => {
      body.style.overflow = previous
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex touch-none flex-col justify-end bg-black/60">
      <button
        aria-label="Закрыть"
        className="flex-1"
        onClick={onClose}
        type="button"
      />
      <div className="max-h-[92dvh] touch-pan-y overflow-y-auto overscroll-contain rounded-t-3xl bg-slate-900 p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        {children}
      </div>
    </div>
  )
}
