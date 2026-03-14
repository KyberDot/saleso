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

  // Profile
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [currency, setCurrency] = useState('GBP')

  // Password
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')

  // eBay state - read directly from user, no local state needed
  const [ebayConnecting, setEbayConnecting] = useState(false)

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '')
      setUsername(user.username || '')
      setEmail(user.email || '')
      setCurrency(user.default_currency || 'GBP')

    }
  }, [user])



  useEffect(() => {
    if (searchParams.get('ebay_success')) {
      setTab('ebay')
      window.history.replaceState({}, '', '/settings?tab=ebay')
      // Small delay then fetch fresh user - bypasses any browser cache
      setTimeout(async () => {
        await checkAuth()
        toast('eBay connected successfully!', 'success')
      }, 500)
    }
    if (searchParams.get('ebay_error')) {
      toast('eBay error: ' + searchParams.get('ebay_error'), 'error')
      setTab('ebay')
    }
    if (searchParams.get('tab')) {
      setTab(searchParams.get('tab'))
    }
  }, [searchParams])

  const saveProfile = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await api.patch('/api/users/me', {
        username: username !== user.username ? username : undefined,
        email: email !== user.email ? email : undefined,
        full_name: fullName !== user.full_name ? fullName : undefined,
        default_currency: currency,
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
    const file = e.target.files?.[0]; if (!file) return
    const form = new FormData(); form.append('avatar', file)
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
    updateUser({ ebay_username: null, ebay_user_id: null, ebay_access_token: null })
    toast('eBay disconnected', 'success')
  }

  const tabs = [
    { id: 'profile', label: '👤 Profile' },
    { id: 'account', label: '⚙ Account' },
    { id: 'ebay', label: '🔗 eBay' },
    { id: 'password', label: '🔒 Password' },
  ]

  // Connected if has username OR has access token stored
  const isConnected = !!(user?.ebay_username) || !!(user?.ebay_user_id)

  return (
    <div>
      <div className="page-header">
        <div><h2 style={{ fontSize: 18, marginBottom: 2 }}>Settings</h2><p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Manage your account</p></div>
      </div>
      <div className="page-body" style={{ maxWidth: 640 }}>
        <div className="tab-bar" style={{ marginBottom: 24 }}>
          {tabs.map(t => <button key={t.id} className={`tab-btn ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>)}
        </div>

        {/* PROFILE */}
        {tab === 'profile' && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <h3 style={{ fontSize: 13, fontFamily: 'var(--font-mono)' }}>PROFILE</h3>

            {/* Avatar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <Avatar user={user} size={80} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input type="file" ref={fileRef} onChange={uploadAvatar} accept="image/*" style={{ display: 'none' }} />
                <button className="btn btn-secondary btn-sm" onClick={() => fileRef.current?.click()}>Upload Photo</button>
                {user?.avatar_url && <button className="btn btn-danger btn-sm" onClick={removeAvatar}>Remove</button>}
                <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>JPG, PNG up to 5MB</p>
              </div>
            </div>

            <form onSubmit={saveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label>Full Name</label>
                <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="John Smith" />
              </div>
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

        {/* ACCOUNT PREFERENCES */}
        {tab === 'account' && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <h3 style={{ fontSize: 13, fontFamily: 'var(--font-mono)' }}>ACCOUNT PREFERENCES</h3>
            <form onSubmit={saveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label>Default Currency</label>
                <select value={currency} onChange={e => setCurrency(e.target.value)}>
                  {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                </select>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Updates all prices and revenue figures across the platform</p>
              </div>

              <div style={{ background: 'var(--bg-card2)', borderRadius: 8, padding: '12px 14px', fontSize: 12, color: 'var(--text-dim)' }}>
                <strong style={{ color: 'var(--accent)' }}>Note:</strong> Rate markup % and shipping costs are now set per item in the Inventory page — giving you more precise control over each product.
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

            {isConnected ? (
              <div>
                {/* Connected state */}
                <div style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 12, padding: '20px', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(34,197,94,0.1)', border: '2px solid var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>✓</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--green)' }}>Connected</div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                        Signed in as <strong style={{ color: 'var(--text)' }}>@{user?.ebay_username}</strong>
                      </div>
                    </div>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7 }}>
                    Your eBay account is connected and authorised. Click <strong>Sync eBay</strong> on the dashboard to pull your latest sales, orders and inventory.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-secondary" onClick={connectEbay} disabled={ebayConnecting}>
                    {ebayConnecting ? <><span className="spinner" style={{ width: 14, height: 14 }} />Connecting…</> : '🔄 Re-authorise'}
                  </button>
                  <button className="btn btn-danger" onClick={disconnectEbay}>Disconnect eBay</button>
                </div>
              </div>
            ) : (
              <div>
                {/* Not connected state */}
                <div style={{ background: 'var(--bg-card2)', borderRadius: 12, padding: '28px 20px', marginBottom: 20, textAlign: 'center' }}>
                  <div style={{ fontSize: 52, marginBottom: 14 }}>🔗</div>
                  <h4 style={{ fontFamily: 'var(--font-mono)', fontSize: 14, marginBottom: 8 }}>Connect Your eBay Account</h4>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 20, maxWidth: 340, margin: '0 auto 20px' }}>
                    Connect your eBay seller account to sync sales, orders and inventory automatically.
                  </p>
                  <button className="btn btn-primary btn-lg" onClick={connectEbay} disabled={ebayConnecting} style={{ justifyContent: 'center' }}>
                    {ebayConnecting ? <><span className="spinner" style={{ width: 16, height: 16 }} />Connecting…</> : '🔑 Connect eBay Account'}
                  </button>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 2 }}>
                  <div>✓ View your full sales history and revenue</div>
                  <div>✓ Track inventory and stock levels</div>
                  <div>✓ Monitor orders and fulfilment status</div>
                  <div>✓ Read-only access — we never modify your listings</div>
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
