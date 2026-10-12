import { useEffect } from 'react'
import type { ThemeMode } from './config'

const darkQuery = window.matchMedia('(prefers-color-scheme: dark)')

function applyTheme(mode: ThemeMode) {
  const dark = mode === 'dark' || (mode === 'system' && darkQuery.matches)
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#17171c' : '#f2f4f6')
}

// Sets the colors of the page. 'system' follows the device setting.
export function useApplyTheme(mode: ThemeMode) {
  useEffect(() => {
    applyTheme(mode)
    if (mode !== 'system') return
    const onChange = () => applyTheme('system')
    darkQuery.addEventListener('change', onChange)
    return () => darkQuery.removeEventListener('change', onChange)
  }, [mode])
}
