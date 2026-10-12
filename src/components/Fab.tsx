import { createPortal } from 'react-dom'
import { Pressable } from './Pressable'

// The round + button. It is drawn at the top of the page, so it stays in the corner of the window.
export function Fab({ label, onClick }: { label: string; onClick: () => void }) {
  return createPortal(
    <Pressable className="fab" label={label} onClick={onClick}>
      <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    </Pressable>,
    document.body,
  )
}
