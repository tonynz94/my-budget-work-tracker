import { animate } from 'motion'
import { useLayoutEffect, useRef } from 'react'
import { formatMoney } from '../lib/format'

// A money amount that counts up or down to the new value when it changes.
export function AnimatedMoney({ cents, className }: { cents: number; className?: string }) {
  const element = useRef<HTMLSpanElement>(null)
  const shown = useRef(cents)

  useLayoutEffect(() => {
    const span = element.current
    if (!span) return
    const from = shown.current
    shown.current = cents
    // No counting when the device asks for less motion.
    if (from === cents || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      span.textContent = formatMoney(cents)
      return
    }
    span.textContent = formatMoney(from)
    const controls = animate(from, cents, {
      duration: 0.5,
      ease: 'easeOut',
      onUpdate: (value) => {
        span.textContent = formatMoney(Math.round(value))
      },
    })
    return () => controls.stop()
  }, [cents])

  return <span ref={element} className={className} aria-label={formatMoney(cents)} />
}
