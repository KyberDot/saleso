import { useState } from 'react'
import api from '../utils/api'
import { useToast } from '../context/ToastContext'
import { useSite } from '../context/SiteContext'
import { API_BASE } from '../utils/api'

export default function SyncButton({ onSync }) {
  const [syncing, setSyncing] = useState(false)
  const { toast } = useToast()
  const { settings } = useSite()
  const ebayLogoUrl = settings.ebay_sync_logo ? `${API_BASE}${settings.ebay_sync_logo}` : null

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
      const code = err.response?.data?.code
      if (code === 'EBAY_NOT_CONNECTED') {
        toast('Connect your eBay account in Settings first', 'error')
      } else {
        toast(err.response?.data?.error || 'Sync failed', 'error')
      }
    } finally { setSyncing(false) }
  }

  return (
    <button className="btn btn-secondary" onClick={handleSync} disabled={syncing} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {syncing ? (
        <><span className="spinner" style={{ width: 14, height: 14 }} />Syncing…</>
      ) : (
        <>
          <span>🔄</span>
          Sync
          {ebayLogoUrl && (
            <img src={ebayLogoUrl} alt="eBay" style={{ height: 16, width: 'auto', objectFit: 'contain', marginLeft: 2 }} />
          )}
          {!ebayLogoUrl && <span style={{ fontSize: 11, opacity: 0.7 }}>eBay</span>}
        </>
      )}
    </button>
  )
}
