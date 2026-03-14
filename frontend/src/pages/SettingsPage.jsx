import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../utils/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { CURRENCIES } from '../utils/format'
import { API_BASE } from '../utils/api'
import { Avatar } from '../components/Sidebar'

export default function SettingsPage() {
  const { user, updateUser, checkAuth } = useAuth()
  const { toast } = useToast()
  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState('profile')
  const [saving, setSaving] = useState(false)
  const fileRef = useRef()

  // Profile form
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [currency, setCurrency] = useState('GBP')
  const [markup, setMarkup] = useState('')
  const [shipping, setShipping] = useState('')

  // Password form
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')

  // eBay
  const [ebayConnecting, setEbayConnecting] = useState(false)

  useEffect(() => {
    if (user) {
      setUsername(user.username || '')
      setEmail(user.email || '')
      setCurrency(user.default_currency || 'GBP')
      setMarkup(user.rate_markup != null ? String(user.rate_markup) : '')
      setShipping(user.default_shipping != null ? String(user.default_shipping) : '')
    }
  }, [user])

  useEffect(() => {
    if (searchParams.get('ebay_success')) { toast('eBay connected!', 'success'); checkAuth() }
    if (searchParams.get('ebay_error')) { toast('eBay error: ' + searchParams.get('ebay_error'), 'error') }
  }, [searchParams])

  const saveProfile = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await api.patch('/api/users/me', {
        username: username !== user.username ? username : undefined,
        email: email !== user.email ? email : undefined,
        default_currency: currency,
        rate_markup: markup !== '' ? parseFloat(markup) : 0,
        default_shipping: shipping !== '' ? parseFloat(shipping) : 0,
      })
      updateUser(res.data.user)
      toast('Profile saved', 'success')
    } catch (err) { toast(err.response?.data?.error || 'Save failed', 'error') }
    finally { setSaving(false) }
  }

  const changePassword = async (e) => {
    e.preventDefault()
    if (newPw !== confirmPw) return toast('Passwords do not match', 'error')
    setSaving(true)
    try {
      await api.post('/api/users/me/password', { current_password: currentPw, new_password: newPw })
      toast('Password changed', 'success')
      setCurrentPw(''); setNewPw(''); setConfirmPw('')
    } catch (err) { toast(err.response?.data?.error || 'Failed', 'error') }
    finally { setSaving(false) }
  }

  const uploadAvatar = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const form = new FormData()
    form.append('avatar', file)
    try {
      const res = await api.post('/api/users/me/avatar', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      updateUser({ avatar_url: res.data.avatar_url })
      toast('Avatar updated', 'success')
    } catch { toast('Upload failed', 'error') }
  }

  const removeAvatar = async () => {
    await api.delete('/api/users/me/avatar')
    updateUser({ avatar_url: null })
    toast('Avatar removed', 'success')
  }

  const connectEbay = async () => {
    setEbayConnecting(true)
    try {
      const res = await api.get('/api/auth/ebay/connect')
      window.location.href = res.data.authUrl
    } catch (err) { toast(err.response?.data?.error || 'Failed', 'error'); setEbayConnecting(false) }
  }

  const disconnectEbay = async () => {
    if (!confirm('Disconnect eBay? You will need to re-authorise to sync data.')) return
    await api.post('/api/auth/ebay/disconnect')
    updateUser({ ebay_username: null, ebay_user_id: null })
    toast('eBay disconnected', 'success')
  }

  const tabs = [
    { id: 'profile', label: '👤 Profile' },
    { id: 'preferences', label: '⚙ Preferences' },
    { id: 'ebay', label: '🔗 eBay' },
    { id: 'password', label: '🔒 Password' },
  ]

  return (
    <div>
      <div className="page-header">
        <div><h2 style={{ fontSize: 18, marginBottom: 2 }}>Settings</h2><p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Manage your account</p></div>
      </div>
      <div className="page-body" style={{ maxWidth: 620 }}>
        <div className="tab-bar" style={{ marginBottom: 24 }}>
          {tabs.map(t => <button key={t.id} className={`tab-btn ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>)}
        </div>

        {/* PROFILE */}
        {tab === 'profile' && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <h3 style={{ fontSize: 13, fontFamily: 'var(--font-mono)' }}>PROFILE</h3>

            {/* Avatar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <Avatar user={user} size={72} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input type="file" ref={fileRef} onChange={uploadAvatar} accept="image/*" style={{ display: 'none' }} />
                <button className="btn btn-secondary btn-sm" onClick={() => fileRef.current?.click()}>Upload Photo</button>
                {user?.avatar_url && <button className="btn btn-danger btn-sm" onClick={removeAvatar}>Remove</button>}
                <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>JPG, PNG, GIF up to 5MB</p>
              </div>
            </div>

            <form onSubmit={saveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-row">
                <div className="form-group">
                  <label>Username</label>
                  <input value={username} onChange={e => setUsername(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
              </div>
              <button type="submit" className="btn btn-primary" disabled={saving} style={{ alignSelf: 'flex-start' }}>
                {saving ? <><span className="spinner" style={{ width: 14, height: 14 }} />Saving…</> : 'Save Profile'}
              </button>
            </form>
          </div>
        )}

        {/* PREFERENCES */}
        {tab === 'preferences' && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <h3 style={{ fontSize: 13, fontFamily: 'var(--font-mono)' }}>PREFERENCES</h3>
            <form onSubmit={saveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label>Default Currency</label>
                <select value={currency} onChange={e => setCurrency(e.target.value)}>
                  {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                </select>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Updates all prices and revenue figures across the platform</p>
              </div>

              <div className="form-group">
                <label>Rate Markup %</label>
                <input type="number" min="0" max="500" step="0.1" value={markup} onChange={e => setMarkup(e.target.value)} placeholder="0" />
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Add a percentage on top of all sale prices in your view (e.g. 10 = +10%). Does not affect eBay data.</p>
              </div>

              <div className="form-group">
                <label>Default Shipping Cost ({currency})</label>
                <input type="number" min="0" step="0.01" value={shipping} onChange={e => setShipping(e.target.value)} placeholder="0.00" />
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Override postage cost used in net profit calculations</p>
              </div>

              <div style={{ background: 'var(--bg-card2)', borderRadius: 8, padding: '12px 14px', fontSize: 12, color: 'var(--text-dim)' }}>
                <strong style={{ color: 'var(--accent)' }}>Preview:</strong> A £100 sale
                {parseFloat(markup) > 0 ? ` with ${markup}% markup = ${(100 * (1 + parseFloat(markup)/100)).toFixed(2)} ${currency}` : ' (no markup active)'}
                {parseFloat(shipping) > 0 ? `, shipping override: ${parseFloat(shipping).toFixed(2)} ${currency}` : ''}
              </div>

              <button type="submit" className="btn btn-primary" disabled={saving} style={{ alignSelf: 'flex-start' }}>
                {saving ? <><span className="spinner" style={{ width: 14, height: 14 }} />Saving…</> : 'Save Preferences'}
              </button>
            </form>
          </div>
        )}

        {/* EBAY */}
        {tab === 'ebay' && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <h3 style={{ fontSize: 13, fontFamily: 'var(--font-mono)' }}>EBAY ACCOUNT</h3>

            {user?.ebay_username ? (
              <div>
                <div style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 10, padding: '16px 18px', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 24 }}>✓</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>Connected</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Signed in as <strong style={{ color: 'var(--green)' }}>@{user.ebay_username}</strong></div>
                    </div>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                    Your eBay account is connected. Use the Sync button in the dashboard to pull your latest sales and inventory.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-secondary" onClick={connectEbay} disabled={ebayConnecting}>Re-authorise</button>
                  <button className="btn btn-danger" onClick={disconnectEbay}>Disconnect eBay</button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ background: 'var(--bg-card2)', borderRadius: 10, padding: '20px', marginBottom: 20, textAlign: 'center' }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🔗</div>
                  <h4 style={{ fontFamily: 'var(--font-mono)', fontSize: 14, marginBottom: 8 }}>Connect Your eBay Account</h4>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 16 }}>
                    Connect to sync your sales, orders, and inventory data automatically.
                  </p>
                  <button className="btn btn-primary btn-lg" onClick={connectEbay} disabled={ebayConnecting} style={{ justifyContent: 'center' }}>
                    {ebayConnecting ? <><span className="spinner" style={{ width: 16, height: 16 }} />Connecting…</> : '🔑 Connect eBay Account'}
                  </button>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.8 }}>
                  <div>✓ View your sales history and revenue</div>
                  <div>✓ Track inventory and stock levels</div>
                  <div>✓ Monitor orders and fulfillment status</div>
                  <div>✓ We only request read-only access to your data</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PASSWORD */}
        {tab === 'password' && (
          <div className="card">
            <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: 13, marginBottom: 20 }}>CHANGE PASSWORD</h3>
            <form onSubmit={changePassword} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label>Current Password</label>
                <input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} placeholder="••••••••" />
              </div>
              <div className="form-group">
                <label>New Password</label>
                <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Min 8 characters" />
              </div>
              <div className="form-group">
                <label>Confirm New Password</label>
                <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Repeat new password" />
              </div>
              <button type="submit" className="btn btn-primary" disabled={saving} style={{ alignSelf: 'flex-start' }}>
                {saving ? <><span className="spinner" style={{ width: 14, height: 14 }} />Updating…</> : 'Change Password'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
