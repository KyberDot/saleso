import { useState } from 'react'
import api from '../utils/api'
import { useToast } from '../context/ToastContext'

export default function SyncButton({ onSync }) {
  const [syncing, setSyncing] = useState(false)
  const { toast } = useToast()

  const handleSync = async () => {
    setSyncing(true)
    try {
      const [salesRes, invRes] = await Promise.all([
        api.post('/api/sales/sync'),
        api.post('/api/inventory/sync'),
      ])
      toast(`Synced ${salesRes.data.synced || 0} sales & ${invRes.data.synced || 0} items`, 'success')
      onSync?.()
    } catch (err) {
      const msg = err.response?.data?.error || 'Sync failed'
      const code = err.response?.data?.code
      if (code === 'EBAY_NOT_CONNECTED') {
        toast('Connect your eBay account in Settings first', 'error')
      } else {
        toast(msg, 'error')
      }
    } finally { setSyncing(false) }
  }

  return (
    <button className="btn btn-secondary" onClick={handleSync} disabled={syncing}>
      {syncing ? <><span className="spinner" style={{ width: 14, height: 14 }} />Syncing…</> : <><span>🔄</span>Sync eBay</>}
    </button>
  )
}
