import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  children: ReactNode
}

export function Sheet({ open, onClose, children }: Props) {
  const panel = useRef<HTMLDivElement>(null)

  // Without this the page behind keeps scrolling under the sheet, which on a phone
  // reads as the sheet itself sliding around. iOS ignores a plain `overflow: hidden`,
  // so the body has to be pinned in place and the offset put back afterwards. It only
  // holds the document still: with the keyboard up iOS pans the visual viewport, and
  // nothing here stops that.
  useEffect(() => {
    if (!open) return
    const { body } = document
    const offset = window.scrollY
    const previous = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      overflow: body.style.overflow,
    }

    body.style.position = 'fixed'
    body.style.top = `-${offset}px`
    body.style.left = '0'
    body.style.right = '0'
    body.style.overflow = 'hidden'

    return () => {
      body.style.position = previous.position
      body.style.top = previous.top
      body.style.left = previous.left
      body.style.right = previous.right
      body.style.overflow = previous.overflow
      window.scrollTo(0, offset)
    }
  }, [open])

  // iOS 26 does not put the visual viewport back after the keyboard is dismissed, so a
  // fixed overlay keeps answering taps where it used to be and the sheet reacts a row
  // off from where it is drawn. WebKit bug 297779, fixed in 26.1. The documented way
  // out is to nudge a scroller by a pixel, which makes Safari recompute the viewport.
  // The page cannot move while the body is pinned above, so the panel does the work.
  useEffect(() => {
    if (!open) return
    const viewport = window.visualViewport
    if (!viewport) return

    const timers: number[] = []

    function nudge() {
      const scroller = panel.current
      if (scroller) {
        const offset = scroller.scrollTop
        scroller.scrollTop = offset + 1
        scroller.scrollTop = offset
      }
      window.scrollBy(0, -1)
      window.scrollBy(0, 1)
    }

    function schedule() {
      // The keyboard animates for a few hundred milliseconds and the viewport settles
      // late, so correct once the animation should be over and again to be sure.
      timers.push(window.setTimeout(nudge, 150), window.setTimeout(nudge, 450))
    }

    viewport.addEventListener('resize', schedule)
    // Losing focus is the clearest sign the keyboard is on its way out, and it arrives
    // even where the resize does not.
    document.addEventListener('focusout', schedule, true)
    return () => {
      viewport.removeEventListener('resize', schedule)
      document.removeEventListener('focusout', schedule, true)
      for (const id of timers) window.clearTimeout(id)
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex touch-none flex-col justify-end bg-black/60">
      <button aria-label="Закрыть" className="flex-1" onClick={onClose} type="button" />
      <div
        ref={panel}
        className="max-h-[92dvh] touch-pan-y overflow-y-auto overscroll-contain rounded-t-3xl bg-slate-900 p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
      >
        {children}
      </div>
    </div>
  )
}
