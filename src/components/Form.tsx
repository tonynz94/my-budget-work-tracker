import { motion } from 'motion/react'
import { useId } from 'react'
import type { ReactNode } from 'react'

// A label above an input.
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
    </label>
  )
}

type SegmentProps<T extends string> = {
  label: string
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}

// A row of choices. A white pill slides to the one I pick.
export function Segment<T extends string>({ label, options, value, onChange }: SegmentProps<T>) {
  const id = useId()
  return (
    <div className="segment" role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          className="segment-item"
          onClick={() => onChange(option.value)}
        >
          {value === option.value && (
            <motion.span
              layoutId={id}
              className="segment-pill"
              transition={{ type: 'spring', stiffness: 500, damping: 36 }}
            />
          )}
          <span className="segment-label">{option.label}</span>
        </button>
      ))}
    </div>
  )
}
