import { motion } from 'motion/react'
import type { ReactNode } from 'react'

type Props = {
  children: ReactNode
  className?: string
  onClick?: () => void
  disabled?: boolean
  label?: string
}

// A button that gets a little smaller when I press it and springs back.
export function Pressable({ children, className, onClick, disabled, label }: Props) {
  return (
    <motion.button
      type="button"
      className={className}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      whileTap={disabled ? undefined : { scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 500, damping: 18 }}
    >
      {children}
    </motion.button>
  )
}
