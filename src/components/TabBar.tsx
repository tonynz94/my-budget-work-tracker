import { motion } from 'motion/react'
import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/', label: 'Home', icon: 'M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z' },
  { to: '/budget', label: 'Budget', icon: 'M4 7a2 2 0 0 1 2-2h11v3h2a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H6a2 2 0 0 1-2-2zm12 5.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z' },
  { to: '/work', label: 'Work', icon: 'M7 3v2H5a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-2V3h-2v2H9V3zm-1 7h12v8H6z' },
  { to: '/settings', label: 'Settings', icon: 'M4 6h9v2H4zM17 6h3v2h-3zM13 5h4v4h-4zM4 16h3v2H4zM11 16h9v2h-9zM7 15h4v4H7z' },
]

export function TabBar() {
  return (
    <nav className="tabbar" aria-label="Main">
      {tabs.map((tab) => (
        <NavLink key={tab.to} to={tab.to} end={tab.to === '/'} className="tab">
          <motion.span
            className="tab-inner"
            whileTap={{ scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 500, damping: 18 }}
          >
            <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
              <path d={tab.icon} fill="currentColor" fillRule="evenodd" />
            </svg>
            <span>{tab.label}</span>
          </motion.span>
        </NavLink>
      ))}
    </nav>
  )
}
