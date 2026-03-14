import { useState, useEffect, useRef } from 'react'
import api from '../utils/api'
import { useToast } from '../context/ToastContext'
import { useSite } from '../context/SiteContext'
import { useAuth } from '../context/AuthContext'
import { formatDateTime } from '../utils/format'
import { API_BASE } from '../utils/api'

export default function AdminPage() {
  const { toast } = useToast()
  const { loadSettings } = useSite()
  const { user } = useAuth()
  const [tab, setTab] = useState('users')
  const [stats, setStats] = useState({})

  useEffect(() => {
    api.get('/api/admin/stats').then(r => setStats(r.data)).catch(() => {})
  }, [])

  const tabs = [
    { id: 'users', label: '👥 Users' },
    { id: 'invites', label: '✉ Invitations' },
    { id: 'plans', label: '📋 Plans' },
    { id: 'appearance', label: '🎨 Appearance' },
    { id: 'email', label: '📧 Email' },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 style={{ fontSize: 18, marginBottom: 2 }}>Admin Panel</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>
            {stats.totalUsers} users · {stats.pendingInvites} pending invites · {stats.totalSales} total sales
          </p>
        </div>
      </div>
      <div className="page-body">
        <div className="tab-bar" style={{ marginBottom: 24 }}>
          {tabs.map(t => <button key={t.id} className={`tab-btn ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>)}
        </div>

        {tab === 'users' && <UsersTab toast={toast} currentUserId={user?.id} />}
        {tab === 'invites' && <InvitesTab toast={toast} />}
        {tab === 'plans' && <PlansTab toast={toast} />}
        {tab === 'appearance' && <AppearanceTab toast={toast} loadSettings={loadSettings} />}
        {tab === 'email' && <EmailTab toast={toast} />}
      </div>
    </div>
  )
}

// ── USERS TAB ────────────────────────────────────────────────────────────────

function UsersTab({ toast, currentUserId }) {
  const [users, setUsers] = useState([])
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [newPw, setNewPw] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const [userRes, planRes] = await Promise.all([api.get('/api/admin/users'), api.get('/api/plans')])
      setUsers(userRes.data.users)
      setPlans(planRes.data.plans || [])
    } catch { toast('Failed to load users', 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const updateUser = async (id, data) => {
    try {
      await api.patch(`/api/admin/users/${id}`, data)
      toast('User updated', 'success')
      setEditing(null); setNewPw(''); load()
    } catch (err) { toast(err.response?.data?.error || 'Failed', 'error') }
  }

  const deleteUser = async (id, username) => {
    if (!confirm(`Deactivate ${username}?`)) return
    await api.delete(`/api/admin/users/${id}`)
    toast('User deactivated', 'success'); load()
  }

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      {loading ? <div style={{ padding: 40, textAlign: 'center' }}><span className="spinner" style={{ width: 24, height: 24 }} /></div> : (
        <table className="data-table">
          <thead><tr><th>User</th><th>Role</th><th>Status</th><th>eBay</th><th>Last Login</th><th>Joined</th><th>Actions</th></tr></thead>
          <tbody>
            {users.map(u => (
              <>
                <tr key={u.id} style={{ cursor: 'default' }}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{u.username}</div>
                      {u.plan && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 10, background: u.plan.color + '22', color: u.plan.color, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{u.plan.name}</span>}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.email}</div>
                  </td>
                  <td><span className={`badge ${u.role === 'admin' ? 'badge-yellow' : 'badge-blue'}`}>{u.role}</span></td>
                  <td><span className={`badge ${u.status === 'active' ? 'badge-green' : 'badge-red'}`}>{u.status}</span></td>
                  <td style={{ fontSize: 12 }}>{u.ebay_username ? <span style={{ color: 'var(--green)' }}>✓ {u.ebay_username}</span> : <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                  <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.last_login ? formatDateTime(u.last_login * 1000) : 'Never'}</td>
                  <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDateTime(u.created_at * 1000)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditing(editing?.id === u.id ? null : u)}>✏</button>
                      {u.id !== currentUserId && (
                        <button className="btn btn-danger btn-sm" onClick={() => deleteUser(u.id, u.username)}>✕</button>
                      )}
                    </div>
                  </td>
                </tr>
                {editing?.id === u.id && (
                  <tr key={`edit-${u.id}`} style={{ cursor: 'default' }}>
                    <td colSpan={7} style={{ background: 'var(--bg-card2)', padding: '16px' }}>
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                        <div className="form-group" style={{ minWidth: 140 }}>
                          <label>Role</label>
                          <select value={editing.role} onChange={e => setEditing(x => ({ ...x, role: e.target.value }))}>
                            <option value="user">user</option>
                            <option value="admin">admin</option>
                          </select>
                        </div>
                        <div className="form-group" style={{ minWidth: 140 }}>
                          <label>Status</label>
                          <select value={editing.status} onChange={e => setEditing(x => ({ ...x, status: e.target.value }))}>
                            <option value="active">active</option>
                            <option value="inactive">inactive</option>
                          </select>
                        </div>
                        <div className="form-group" style={{ minWidth: 160 }}>
                          <label>Plan</label>
                          <select value={editing.plan_id || ''} onChange={e => setEditing(x => ({ ...x, plan_id: e.target.value }))}>
                            <option value="">No plan</option>
                            {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </div>
                        <div className="form-group" style={{ minWidth: 180 }}>
                          <label>New Password (optional)</label>
                          <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Leave blank to keep" />
                        </div>
                        <button className="btn btn-primary btn-sm" onClick={() => updateUser(u.id, { role: editing.role, status: editing.status, password: newPw || undefined, plan_id: editing.plan_id })}>Save</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(null); setNewPw('') }}>Cancel</button>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ── INVITES TAB ──────────────────────────────────────────────────────────────

function InvitesTab({ toast }) {
  const [invites, setInvites] = useState([])
  const [plans, setPlans] = useState([])
  const [email, setEmail] = useState('')
  const [selectedPlan, setSelectedPlan] = useState('')
  const [sendEmail, setSendEmail] = useState(true)
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [lastInvite, setLastInvite] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const [invRes, planRes] = await Promise.all([api.get('/api/admin/invitations'), api.get('/api/plans')])
      setInvites(invRes.data.invites)
      setPlans(planRes.data.plans || [])
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const createInvite = async (e) => {
    e.preventDefault()
    if (!email) return toast('Email required', 'error')
    setCreating(true)
    try {
      const r = await api.post('/api/admin/invitations', { email, send_email: sendEmail, plan_id: selectedPlan || undefined })
      setLastInvite(r.data)
      setEmail('')
      toast(r.data.email_sent ? 'Invite sent by email!' : 'Invite created (no email sent)', r.data.email_sent ? 'success' : 'info')
      load()
    } catch (err) { toast(err.response?.data?.error || 'Failed', 'error') }
    finally { setCreating(false) }
  }

  const revokeInvite = async (id) => {
    await api.delete(`/api/admin/invitations/${id}`)
    toast('Revoked', 'success'); load()
  }

  const statusColor = (s) => s === 'pending' ? 'badge-yellow' : s === 'used' ? 'badge-green' : 'badge-gray'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Create */}
      <div className="card">
        <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: 12, marginBottom: 16 }}>INVITE NEW USER</h3>
        <form onSubmit={createInvite}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 12 }}>
            <div className="form-group" style={{ flex: 1, minWidth: 220, marginBottom: 0 }}>
              <label>Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="user@example.com" />
            </div>
            {plans.length > 0 && (
              <div className="form-group" style={{ minWidth: 160, marginBottom: 0 }}>
                <label>Plan (optional)</label>
                <select value={selectedPlan} onChange={e => setSelectedPlan(e.target.value)}>
                  <option value="">No plan</option>
                  {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            )}
            <button type="submit" className="btn btn-primary" disabled={creating} style={{ height: 36, whiteSpace: 'nowrap', flexShrink: 0 }}>
              {creating ? <><span className="spinner" style={{ width: 14, height: 14 }} />Creating…</> : '+ Create Invite'}
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" id="sendEmail" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)} style={{ width: 'auto', margin: 0 }} />
            <label htmlFor="sendEmail" style={{ fontSize: 12, color: 'var(--text-dim)', textTransform: 'none', letterSpacing: 0, margin: 0, cursor: 'pointer' }}>Send email invite automatically</label>
          </div>
        </form>

        {lastInvite && (
          <div style={{ marginTop: 16, background: 'var(--bg-card2)', borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>INVITE LINK — share this with the user:</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input value={lastInvite.invite_url} readOnly style={{ fontSize: 11, fontFamily: 'var(--font-mono)' }} onClick={e => e.target.select()} />
              <button className="btn btn-secondary btn-sm" onClick={() => { navigator.clipboard.writeText(lastInvite.invite_url); toast('Copied!', 'success') }}>Copy</button>
            </div>
          </div>
        )}
      </div>

      {/* List */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>INVITATION HISTORY</h3>
        </div>
        {loading ? <div style={{ padding: 40, textAlign: 'center' }}><span className="spinner" /></div> :
        invites.length === 0 ? <div className="empty-state"><p>No invitations yet</p></div> : (
          <table className="data-table">
            <thead><tr><th>Email</th><th>Invited By</th><th>Status</th><th>Expires</th><th>Created</th><th></th></tr></thead>
            <tbody>
              {invites.map(inv => (
                <tr key={inv.id} style={{ cursor: 'default' }}>
                  <td style={{ fontSize: 13 }}>{inv.email}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-dim)' }}>{inv.invited_by_username}</td>
                  <td><span className={`badge ${statusColor(inv.status)}`}>{inv.status}</span></td>
                  <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDateTime(inv.expires_at)}</td>
                  <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDateTime(inv.created_at * 1000)}</td>
                  <td>{inv.status === 'pending' && <button className="btn btn-danger btn-sm" onClick={() => revokeInvite(inv.id)}>Revoke</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ── APPEARANCE TAB ────────────────────────────────────────────────────────────

function AppearanceTab({ toast, loadSettings }) {
  const [settings, setSettings] = useState({})
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState({ dark: false, light: false, ebay: false })
  const darkLogoRef = useRef()
  const lightLogoRef = useRef()
  const ebayLogoRef = useRef()
  const faviconRef = useRef()

  useEffect(() => {
    api.get('/api/admin/settings').then(r => setSettings(r.data.settings || {})).catch(() => {})
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      await api.patch('/api/admin/settings', { settings })
      await loadSettings()
      toast('Appearance saved', 'success')
    } catch { toast('Save failed', 'error') }
    finally { setSaving(false) }
  }

  const uploadLogo = async (e, variant) => {
    const file = e.target.files?.[0]; if (!file) return
    setUploadingLogo(x => ({ ...x, [variant]: true }))
    const form = new FormData(); form.append('logo', file)
    try {
      if (variant === 'favicon') {
        const r = await api.post('/api/admin/settings/favicon', form, { headers: { 'Content-Type': 'multipart/form-data' } })
        setSettings(x => ({ ...x, site_favicon: r.data.favicon_url }))
        await loadSettings()
        toast('Favicon uploaded', 'success')
      } else if (variant === 'ebay') {
        const r = await api.post('/api/admin/settings/ebay-logo', form, { headers: { 'Content-Type': 'multipart/form-data' } })
        setSettings(x => ({ ...x, ebay_sync_logo: r.data.logo_url }))
        await loadSettings()
        toast('eBay sync logo uploaded', 'success')
      } else {
        const r = await api.post(`/api/admin/settings/logo/${variant}`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
        const key = variant === 'light' ? 'site_logo_light' : 'site_logo_dark'
        setSettings(x => ({ ...x, [key]: r.data.logo_url, site_logo: variant === 'dark' ? r.data.logo_url : x.site_logo }))
        await loadSettings()
        toast(`${variant === 'dark' ? 'Dark' : 'Light'} logo uploaded`, 'success')
      }
    } catch { toast('Upload failed', 'error') }
    finally { setUploadingLogo(x => ({ ...x, [variant]: false })) }
  }

  const removeLogo = async (variant) => {
    if (variant === 'favicon') {
      await api.delete('/api/admin/settings/favicon')
      setSettings(x => ({ ...x, site_favicon: '' }))
    } else if (variant === 'ebay') {
      await api.delete('/api/admin/settings/ebay-logo')
      setSettings(x => ({ ...x, ebay_sync_logo: '' }))
    } else {
      await api.delete(`/api/admin/settings/logo/${variant}`)
      const key = variant === 'light' ? 'site_logo_light' : 'site_logo_dark'
      setSettings(x => ({ ...x, [key]: '' }))
    }
    await loadSettings()
    toast('Logo removed', 'success')
  }

  const colorFields = [
    { key: 'primary_color', label: 'Primary / Accent Color', hint: 'Main brand color, buttons, highlights' },
    { key: 'background_color', label: 'Background Color', hint: 'Main page background (dark mode)' },
    { key: 'card_color', label: 'Card / Panel Color', hint: 'Cards and sidebar background (dark mode)' },
    { key: 'text_color', label: 'Text Color', hint: 'Primary text color (dark mode)' },
    { key: 'accent_color', label: 'Success / Green Color', hint: 'Positive metrics and badges' },
    { key: 'username_color', label: 'Username Color', hint: 'Color of usernames in sidebar and UI' },
  ]

  const LogoSlot = ({ variant, label, hint, bgColor, logoRef }) => {
    const key = variant === 'light' ? 'site_logo_light' : variant === 'ebay' ? 'ebay_sync_logo' : variant === 'favicon' ? 'site_favicon' : 'site_logo_dark'
    const logoUrl = settings[key] ? `${API_BASE}${settings[key]}?t=${Date.now()}` : null
    const uploading = uploadingLogo[variant]

    return (
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontWeight: 700, marginBottom: 8 }}>
          {label.toUpperCase()}
        </div>
        <div style={{ height: variant === 'ebay' ? 40 : 80, background: bgColor, borderRadius: 10, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 10, padding: 8 }}>
          {logoUrl ? (
            <img src={logoUrl} alt={label} style={{
              maxWidth: variant === 'ebay' ? '120px' : (settings.logo_width || '200') + 'px',
              maxHeight: variant === 'ebay' ? '28px' : (settings.logo_height || '60') + 'px',
              objectFit: 'contain'
            }} />
          ) : (
            <span style={{ fontSize: 11, color: variant === 'light' ? '#999' : 'var(--text-muted)' }}>No logo</span>
          )}
        </div>
        <input type="file" ref={logoRef} onChange={e => uploadLogo(e, variant)} accept="image/*" style={{ display: 'none' }} />
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => logoRef.current?.click()} disabled={uploading} style={{ flex: 1 }}>
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
          {logoUrl && <button className="btn btn-danger btn-sm" onClick={() => removeLogo(variant)}>✕</button>}
        </div>
        <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>{hint}</p>
      </div>
    )
  }

  const Toggle = ({ settingKey, label, hint }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{hint}</div>
      </div>
      <button
        onClick={() => setSettings(x => ({ ...x, [settingKey]: x[settingKey] === 'false' ? 'true' : 'false' }))}
        style={{
          width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', position: 'relative', flexShrink: 0,
          background: settings[settingKey] !== 'false' ? 'var(--accent)' : 'var(--border-light)',
          transition: 'background 0.2s'
        }}
      >
        <div style={{
          width: 18, height: 18, borderRadius: '50%', background: '#fff',
          position: 'absolute', top: 3,
          left: settings[settingKey] !== 'false' ? 23 : 3,
          transition: 'left 0.2s'
        }} />
      </button>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Branding */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>BRANDING</h3>

        <div className="form-group">
          <label>Site Name</label>
          <input value={settings.site_name || ''} onChange={e => setSettings(x => ({ ...x, site_name: e.target.value }))} placeholder="SalesO" />
        </div>

        <div className="form-group">
          <label>Site URL</label>
          <input value={settings.site_url || ''} onChange={e => setSettings(x => ({ ...x, site_url: e.target.value }))} placeholder="https://saleso.app" />
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Clicking the logo in the sidebar opens this URL</p>
        </div>

        <div className="form-group">
          <label>Support Email</label>
          <input value={settings.support_email || ''} onChange={e => setSettings(x => ({ ...x, support_email: e.target.value }))} placeholder="support@saleso.app" />
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Shown on login, register, and password reset pages</p>
        </div>

        {/* Favicon */}
        <div>
          <label>Favicon</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8 }}>
            <div style={{ width: 48, height: 48, background: 'var(--bg-card2)', borderRadius: 8, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {settings.site_favicon ? <img src={`${API_BASE}${settings.site_favicon}`} alt="favicon" style={{ width: 32, height: 32, objectFit: 'contain' }} /> : <span style={{ fontSize: 20 }}>📦</span>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <input type="file" ref={faviconRef} onChange={e => uploadLogo(e, 'favicon')} accept="image/png,image/ico,image/svg+xml,image/x-icon" style={{ display: 'none' }} />
              <button className="btn btn-secondary btn-sm" onClick={() => faviconRef.current?.click()} disabled={uploadingLogo.favicon}>{uploadingLogo.favicon ? 'Uploading…' : 'Upload Favicon'}</button>
              {settings.site_favicon && <button className="btn btn-danger btn-sm" onClick={() => removeLogo('favicon')}>Remove</button>}
              <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>PNG, ICO or SVG — 32×32px recommended</p>
            </div>
          </div>
        </div>

        {/* Site logos */}
        <div>
          <label>Site Logos</label>
          <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
            <LogoSlot variant="dark" label="Dark Mode Logo" hint="Shown on dark backgrounds" bgColor="var(--bg-card2)" logoRef={darkLogoRef} />
            <LogoSlot variant="light" label="Light Mode Logo" hint="Shown on light backgrounds" bgColor="#f0f0f0" logoRef={lightLogoRef} />
          </div>
        </div>

        {/* Logo size */}
        <div className="form-row">
          <div className="form-group">
            <label>Logo Max Width (px)</label>
            <input type="number" value={settings.logo_width || '200'} onChange={e => setSettings(x => ({ ...x, logo_width: e.target.value }))} min="50" max="400" />
          </div>
          <div className="form-group">
            <label>Logo Max Height (px)</label>
            <input type="number" value={settings.logo_height || '60'} onChange={e => setSettings(x => ({ ...x, logo_height: e.target.value }))} min="20" max="200" />
          </div>
        </div>

        {/* Login page logo size */}
        <div className="form-row">
          <div className="form-group">
            <label>Login Logo Max Width (px)</label>
            <input type="number" value={settings.login_logo_width || '160'} onChange={e => setSettings(x => ({ ...x, login_logo_width: e.target.value }))} min="40" max="300" />
          </div>
          <div className="form-group">
            <label>Login Logo Max Height (px)</label>
            <input type="number" value={settings.login_logo_height || '48'} onChange={e => setSettings(x => ({ ...x, login_logo_height: e.target.value }))} min="16" max="120" />
          </div>
        </div>

        {/* eBay sync button logo */}
        <div>
          <label>eBay Sync Button Logo</label>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>Replaces the "Sync eBay" text with your logo on the sync button. Recommended: eBay logo, transparent PNG, ~28px height.</p>
          <div style={{ maxWidth: 200 }}>
            <LogoSlot variant="ebay" label="Sync Button Logo" hint="Shows inside the Sync button" bgColor="var(--bg-card2)" logoRef={ebayLogoRef} />
          </div>
        </div>

        <button className="btn btn-secondary btn-sm" onClick={save} disabled={saving} style={{ alignSelf: 'flex-start' }}>
          {saving ? 'Saving…' : 'Save Branding'}
        </button>
      </div>

      {/* Display options */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: 12, marginBottom: 8 }}>DISPLAY OPTIONS</h3>
        <Toggle settingKey="sidebar_show_text" label="Show site name in sidebar" hint="Show text name next to logo in the left sidebar" />
        <Toggle settingKey="login_show_text" label="Show site name on login page" hint="Show site name and tagline on the login screen" />
        <div style={{ marginTop: 12 }}>
          <button className="btn btn-primary btn-sm" onClick={save} disabled={saving} style={{ alignSelf: 'flex-start' }}>
            {saving ? 'Saving…' : 'Save Display Options'}
          </button>
        </div>
      </div>

      {/* Theme colors */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>THEME COLORS</h3>
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Changes apply globally for all users instantly. Background and card colors apply to dark mode.</p>
        {colorFields.map(f => (
          <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <input type="color" value={settings[f.key] || '#000000'} onChange={e => setSettings(x => ({ ...x, [f.key]: e.target.value }))} style={{ width: 48, height: 40, padding: 2, flexShrink: 0, cursor: 'pointer' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{f.label}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{f.hint}</div>
            </div>
            <input value={settings[f.key] || ''} onChange={e => setSettings(x => ({ ...x, [f.key]: e.target.value }))} style={{ width: 110, fontFamily: 'var(--font-mono)', fontSize: 12 }} placeholder="#000000" />
          </div>
        ))}

        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? <><span className="spinner" style={{ width: 14, height: 14 }} />Saving…</> : 'Save & Apply'}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setSettings(x => ({ ...x, primary_color: '#e6a817', background_color: '#0a0a0f', card_color: '#111118', text_color: '#e8e8f0', accent_color: '#22c55e', username_color: '#e6a817' }))}>
            Reset Defaults
          </button>
        </div>
      </div>
    </div>
  )
}

// ── PLANS TAB ──────────────────────────────────────────────────────────────

function PlansTab({ toast }) {
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ name: '', color: '#e6a817', max_users: 0, max_sales: 0, max_inventory: 0, description: '' })

  const load = async () => {
    setLoading(true)
    try { const r = await api.get('/api/plans'); setPlans(r.data.plans) }
    catch { toast('Failed to load plans', 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const save = async () => {
    try {
      if (editing) {
        await api.patch(`/api/plans/${editing.id}`, form)
        toast('Plan updated', 'success')
      } else {
        await api.post('/api/plans', form)
        toast('Plan created', 'success')
      }
      setEditing(null); setCreating(false)
      setForm({ name: '', color: '#e6a817', max_users: 0, max_sales: 0, max_inventory: 0, description: '' })
      load()
    } catch (err) { toast(err.response?.data?.error || 'Failed', 'error') }
  }

  const deletePlan = async (id, name) => {
    if (!confirm(`Delete plan "${name}"? Users on this plan will be unassigned.`)) return
    await api.delete(`/api/plans/${id}`)
    toast('Plan deleted', 'success'); load()
  }

  const startEdit = (plan) => {
    setEditing(plan)
    setCreating(true)
    setForm({ name: plan.name, color: plan.color, max_users: plan.max_users, max_sales: plan.max_sales, max_inventory: plan.max_inventory, description: plan.description || '' })
  }

  const FormField = ({ label, field, type = 'text', hint }) => (
    <div className="form-group">
      <label>{label}</label>
      <input type={type} value={form[field] || ''} onChange={e => setForm(x => ({ ...x, [field]: type === 'number' ? parseInt(e.target.value) || 0 : e.target.value }))} />
      {hint && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{hint}</p>}
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Create/Edit form */}
      {creating ? (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{editing ? 'EDIT PLAN' : 'CREATE PLAN'}</h3>
          <div className="form-row">
            <FormField label="Plan Name" field="name" />
            <div className="form-group">
              <label>Color</label>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input type="color" value={form.color} onChange={e => setForm(x => ({ ...x, color: e.target.value }))} style={{ width: 48, height: 36, padding: 2, flexShrink: 0 }} />
                <input value={form.color} onChange={e => setForm(x => ({ ...x, color: e.target.value }))} style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }} />
              </div>
            </div>
          </div>
          <FormField label="Description" field="description" hint="Short description shown to users" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <FormField label="Max Users (0 = unlimited)" field="max_users" type="number" />
            <FormField label="Max Sales (0 = unlimited)" field="max_sales" type="number" />
            <FormField label="Max Inventory (0 = unlimited)" field="max_inventory" type="number" />
          </div>

          {/* Preview */}
          <div style={{ background: 'var(--bg-card2)', borderRadius: 8, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Preview:</span>
            <span style={{ fontSize: 12, padding: '2px 10px', borderRadius: 12, background: form.color + '22', color: form.color, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
              {form.name || 'Plan Name'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" onClick={save}>{editing ? 'Save Changes' : 'Create Plan'}</button>
            <button className="btn btn-ghost" onClick={() => { setCreating(false); setEditing(null); setForm({ name: '', color: '#e6a817', max_users: 0, max_sales: 0, max_inventory: 0, description: '' }) }}>Cancel</button>
          </div>
        </div>
      ) : (
        <button className="btn btn-primary" onClick={() => setCreating(true)} style={{ alignSelf: 'flex-start' }}>+ Create Plan</button>
      )}

      {/* Plans list */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>ALL PLANS</h3>
        </div>
        {loading ? <div style={{ padding: 30, textAlign: 'center' }}><span className="spinner" /></div>
        : plans.length === 0 ? <div className="empty-state" style={{ padding: '30px 0' }}><p>No plans yet — create one above</p></div>
        : (
          <table className="data-table">
            <thead><tr><th>Plan</th><th>Description</th><th>Limits</th><th>Users</th><th>Actions</th></tr></thead>
            <tbody>
              {plans.map(plan => (
                <tr key={plan.id} style={{ cursor: 'default' }}>
                  <td>
                    <span style={{ fontSize: 13, padding: '3px 10px', borderRadius: 12, background: plan.color + '22', color: plan.color, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                      {plan.name}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{plan.description || '—'}</td>
                  <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {[plan.max_users, plan.max_sales, plan.max_inventory].some(v => v > 0) ? (
                      <div>
                        {plan.max_users > 0 && <div>👥 {plan.max_users} users</div>}
                        {plan.max_sales > 0 && <div>💰 {plan.max_sales} sales</div>}
                        {plan.max_inventory > 0 && <div>📦 {plan.max_inventory} items</div>}
                      </div>
                    ) : 'Unlimited'}
                  </td>
                  <td className="mono">{plan.user_count || 0}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => startEdit(plan)}>✏</button>
                      <button className="btn btn-danger btn-sm" onClick={() => deletePlan(plan.id, plan.name)}>✕</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ── EMAIL TAB ─────────────────────────────────────────────────────────────────

function EmailTab({ toast }) {
  const [settings, setSettings] = useState({})
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [showPass, setShowPass] = useState(false)

  useEffect(() => {
    api.get('/api/admin/settings').then(r => setSettings(r.data.settings || {})).catch(() => {})
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      await api.patch('/api/admin/settings', { settings: { smtp_host: settings.smtp_host, smtp_port: settings.smtp_port, smtp_user: settings.smtp_user, smtp_pass: settings.smtp_pass, smtp_from: settings.smtp_from, smtp_secure: settings.smtp_secure } })
      toast('Email settings saved', 'success')
    } catch { toast('Save failed', 'error') }
    finally { setSaving(false) }
  }

  const testSmtp = async () => {
    setTesting(true)
    try {
      const r = await api.post('/api/admin/settings/test-smtp')
      toast(r.data.success ? 'Test email sent!' : 'Failed: ' + r.data.error, r.data.success ? 'success' : 'error')
    } catch { toast('SMTP test failed', 'error') }
    finally { setTesting(false) }
  }

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>SMTP CONFIGURATION</h3>
      <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Used for invite emails and password resets. Works with any SMTP provider — Gmail, Mailgun, Postmark, etc.</p>

      <div className="form-row">
        <div className="form-group">
          <label>SMTP Host</label>
          <input value={settings.smtp_host || ''} onChange={e => setSettings(x => ({ ...x, smtp_host: e.target.value }))} placeholder="smtp.gmail.com" />
        </div>
        <div className="form-group">
          <label>Port</label>
          <input value={settings.smtp_port || ''} onChange={e => setSettings(x => ({ ...x, smtp_port: e.target.value }))} placeholder="587" />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Username</label>
          <input value={settings.smtp_user || ''} onChange={e => setSettings(x => ({ ...x, smtp_user: e.target.value }))} placeholder="you@gmail.com" />
        </div>
        <div className="form-group">
          <label>Password</label>
          <div style={{ position: 'relative' }}>
            <input type={showPass ? 'text' : 'password'} value={settings.smtp_pass || ''} onChange={e => setSettings(x => ({ ...x, smtp_pass: e.target.value }))} placeholder="App password" style={{ paddingRight: 40 }} />
            <button type="button" onClick={() => setShowPass(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14 }}>{showPass ? '🙈' : '👁'}</button>
          </div>
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>From Address</label>
          <input value={settings.smtp_from || ''} onChange={e => setSettings(x => ({ ...x, smtp_from: e.target.value }))} placeholder="noreply@yourdomain.com" />
        </div>
        <div className="form-group" style={{ justifyContent: 'flex-end' }}>
          <label>TLS / SSL</label>
          <select value={settings.smtp_secure || 'false'} onChange={e => setSettings(x => ({ ...x, smtp_secure: e.target.value }))}>
            <option value="false">STARTTLS (port 587)</option>
            <option value="true">SSL/TLS (port 465)</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? <><span className="spinner" style={{ width: 14, height: 14 }} />Saving…</> : 'Save Settings'}
        </button>
        <button className="btn btn-secondary" onClick={testSmtp} disabled={testing}>
          {testing ? <><span className="spinner" style={{ width: 14, height: 14 }} />Sending…</> : '📧 Send Test Email'}
        </button>
      </div>

      <div style={{ background: 'var(--bg-card2)', borderRadius: 8, padding: '12px 14px', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.8 }}>
        <strong style={{ color: 'var(--text-dim)' }}>Gmail tip:</strong> Use an App Password (not your regular password). Go to Google Account → Security → App Passwords.
      </div>
    </div>
  )
}
