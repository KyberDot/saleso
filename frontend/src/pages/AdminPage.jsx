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
        {tab === 'appearance' && <AppearanceTab toast={toast} loadSettings={loadSettings} />}
        {tab === 'email' && <EmailTab toast={toast} />}
      </div>
    </div>
  )
}

// ── USERS TAB ────────────────────────────────────────────────────────────────

function UsersTab({ toast, currentUserId }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [newPw, setNewPw] = useState('')

  const load = async () => {
    setLoading(true)
    try { const r = await api.get('/api/admin/users'); setUsers(r.data.users) }
    catch { toast('Failed to load users', 'error') }
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
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{u.username}</div>
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
                        <div className="form-group" style={{ minWidth: 180 }}>
                          <label>New Password (optional)</label>
                          <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Leave blank to keep" />
                        </div>
                        <button className="btn btn-primary btn-sm" onClick={() => updateUser(u.id, { role: editing.role, status: editing.status, password: newPw || undefined })}>Save</button>
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
  const [email, setEmail] = useState('')
  const [sendEmail, setSendEmail] = useState(true)
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [lastInvite, setLastInvite] = useState(null)

  const load = async () => {
    setLoading(true)
    try { const r = await api.get('/api/admin/invitations'); setInvites(r.data.invites) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const createInvite = async (e) => {
    e.preventDefault()
    if (!email) return toast('Email required', 'error')
    setCreating(true)
    try {
      const r = await api.post('/api/admin/invitations', { email, send_email: sendEmail })
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
        <form onSubmit={createInvite} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: 1, minWidth: 220 }}>
            <label>Email Address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="user@example.com" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 2 }}>
            <input type="checkbox" id="sendEmail" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)} style={{ width: 'auto' }} />
            <label htmlFor="sendEmail" style={{ fontSize: 12, color: 'var(--text-dim)', textTransform: 'none', letterSpacing: 0, margin: 0 }}>Send email invite</label>
          </div>
          <button type="submit" className="btn btn-primary" disabled={creating} style={{ paddingBottom: 2 }}>
            {creating ? <><span className="spinner" style={{ width: 14, height: 14 }} />Creating…</> : '+ Create Invite'}
          </button>
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
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const logoRef = useRef()

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

  const uploadLogo = async (e) => {
    const file = e.target.files?.[0]; if (!file) return
    setUploadingLogo(true)
    const form = new FormData(); form.append('logo', file)
    try {
      const r = await api.post('/api/admin/settings/logo', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      setSettings(x => ({ ...x, site_logo: r.data.logo_url }))
      await loadSettings()
      toast('Logo uploaded', 'success')
    } catch { toast('Upload failed', 'error') }
    finally { setUploadingLogo(false) }
  }

  const removeLogo = async () => {
    await api.delete('/api/admin/settings/logo')
    setSettings(x => ({ ...x, site_logo: '' }))
    await loadSettings()
    toast('Logo removed', 'success')
  }

  const colorFields = [
    { key: 'primary_color', label: 'Primary / Accent Color', hint: 'Main brand color, buttons, highlights' },
    { key: 'background_color', label: 'Background Color', hint: 'Main page background' },
    { key: 'card_color', label: 'Card / Panel Color', hint: 'Cards and sidebar background' },
    { key: 'text_color', label: 'Text Color', hint: 'Primary text color' },
    { key: 'accent_color', label: 'Success / Green Color', hint: 'Positive metrics and badges' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>BRANDING</h3>

        {/* Site name */}
        <div className="form-group">
          <label>Site Name</label>
          <input value={settings.site_name || ''} onChange={e => setSettings(x => ({ ...x, site_name: e.target.value }))} placeholder="SalesO" />
        </div>

        {/* Logo */}
        <div>
          <label>Logo</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8 }}>
            <div style={{ width: 160, height: 60, background: 'var(--bg-card2)', borderRadius: 8, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {settings.site_logo ? (
                <img src={`${API_BASE}${settings.site_logo}`} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              ) : <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>No logo</span>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input type="file" ref={logoRef} onChange={uploadLogo} accept="image/*" style={{ display: 'none' }} />
              <button className="btn btn-secondary btn-sm" onClick={() => logoRef.current?.click()} disabled={uploadingLogo}>
                {uploadingLogo ? 'Uploading…' : 'Upload Logo'}
              </button>
              {settings.site_logo && <button className="btn btn-danger btn-sm" onClick={removeLogo}>Remove</button>}
              <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>Recommended: transparent PNG, max 200px height</p>
            </div>
          </div>
        </div>
      </div>

      {/* Colors */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>THEME COLORS</h3>
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Changes apply globally for all users instantly.</p>
        {colorFields.map(f => (
          <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <input type="color" value={settings[f.key] || '#000000'} onChange={e => setSettings(x => ({ ...x, [f.key]: e.target.value }))} style={{ width: 48, height: 40, padding: 2, flexShrink: 0 }} />
            <div>
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
          <button className="btn btn-ghost btn-sm" onClick={() => setSettings(x => ({ ...x, primary_color: '#e6a817', background_color: '#0a0a0f', card_color: '#111118', text_color: '#e8e8f0', accent_color: '#22c55e' }))}>Reset Defaults</button>
        </div>
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
