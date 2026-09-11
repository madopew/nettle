import { useEffect, useLayoutEffect, useRef, useState } from 'react'

interface Step {
  target: string
  text: string
}

/** The five things a first-time host cannot guess from the screen alone. */
const STEPS: Step[] = [
  { target: 'clock', text: 'Сколько времени идёт игра' },
  { target: 'pot', text: 'Сколько денег сейчас на столе' },
  { target: 'total', text: 'Сколько игрок занёс за всю игру' },
  { target: 'rebuy', text: 'Докупка: игрок заносит ещё' },
  { target: 'actions', text: 'Забрать часть со стола или выйти из игры' },
]

/** Nobody is reading it any more, so get out of the way. */
const IDLE_MS = 15_000

const PAD = 6

export function Tour({ onClose }: { onClose: () => void }) {
  const [index, setIndex] = useState(0)
  const [box, setBox] = useState<DOMRect | null>(null)
  // The host re-renders every second for its clock, so a callback passed inline gets a
  // new identity that often. Held in a ref, it cannot restart the timers below.
  const close = useRef(onClose)
  useEffect(() => {
    close.current = onClose
  })

  const step = STEPS[index]

  useLayoutEffect(() => {
    function measure() {
      // A step whose element is not on this table has nothing to point at.
      let at = index
      let found: Element | null = null
      while (at < STEPS.length && !found) {
        found = document.querySelector(`[data-tour="${STEPS[at].target}"]`)
        if (!found) at += 1
      }
      if (!found) {
        close.current()
        return
      }
      if (at !== index) setIndex(at)
      setBox(found.getBoundingClientRect())
    }
    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('orientationchange', measure)
    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('orientationchange', measure)
    }
  }, [index])

  useEffect(() => {
    const timer = window.setTimeout(() => close.current(), IDLE_MS)
    return () => window.clearTimeout(timer)
  }, [index])

  if (!step || !box) return null

  function next() {
    if (index + 1 >= STEPS.length) close.current()
    else setIndex(index + 1)
  }

  const hole = {
    top: box.top - PAD,
    left: box.left - PAD,
    width: box.width + PAD * 2,
    height: box.height + PAD * 2,
  }
  // Keep the caption clear of the hole: under it near the top, over it lower down.
  const below = box.top + box.height / 2 < window.innerHeight / 2
  const caption = below
    ? { top: hole.top + hole.height + 12 }
    : { bottom: window.innerHeight - hole.top + 12 }

  return (
    <div
      className="fixed inset-0 z-[60]"
      onClick={next}
      role="button"
      tabIndex={0}
      aria-label="Дальше"
    >
      {/* Four panels around the hole rather than one with a cut-out: a backdrop filter
          cannot be given a hole, and this keeps the spotlit element crisp. */}
      <div className="absolute inset-x-0 top-0 bg-black/70 backdrop-blur-sm" style={{ height: hole.top }} />
      <div
        className="absolute inset-x-0 bottom-0 bg-black/70 backdrop-blur-sm"
        style={{ top: hole.top + hole.height }}
      />
      <div
        className="absolute left-0 bg-black/70 backdrop-blur-sm"
        style={{ top: hole.top, height: hole.height, width: hole.left }}
      />
      <div
        className="absolute right-0 bg-black/70 backdrop-blur-sm"
        style={{ top: hole.top, height: hole.height, left: hole.left + hole.width }}
      />
      <div
        className="absolute rounded-xl"
        style={{ ...hole, boxShadow: '0 0 0 2px rgba(52,211,153,0.9)' }}
      />
      <p
        className="absolute right-6 left-6 text-center text-lg leading-snug text-slate-100"
        style={caption}
      >
        {step.text}
      </p>
    </div>
  )
}
