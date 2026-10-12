import { useOnline } from '../lib/useOnline'

export function OfflineBanner() {
  const online = useOnline()
  if (online) return null
  return (
    <div className="offline" role="status">
      No internet. Changes can not be saved right now.
    </div>
  )
}
