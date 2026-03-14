import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import api from '../utils/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useSite } from '../context/SiteContext'
import { API_BASE } from '../utils/api'

export default function RegisterPage() {
  const [searchParams] = useSearchParams()
  const { checkAuth } = useAuth()
  const { toast } = useToast()
  const { settings } = useSite()
  const navigate = useNavigate()
  const token = searchParams.get('token')

  const [inviteInfo, setInviteInfo] = useState(null)
  const [inviteError, setInviteError] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (!token) { setInviteError('No invitation token provided.'); setChecking(false); return }
    api.get(`/api/auth/invite/${token}`)
      .then(res => { setInviteInfo(res.data); setChecking(false) })
      .catch(err => { setInviteError(err.response?.data?.error || 'Invalid invitation'); setChecking(false) })
  }, [token])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!username || !password || !confirm) return toast('All fields required', 'error')
    if (password !== confirm) return toast('Passwords do not match', 'error')
    if (password.length < 8) return toast('Password must be at least 8 characters', 'error')
    setLoading(true)
    try {
      await api.post('/api/auth/register', { token, username, password })
      await checkAuth()
      toast('Account created! Welcome to ' + (settings.site_name || 'SalesO'), 'success')
      navigate('/', { replace: true })
    } catch (err) {
      toast(err.response?.data?.error || 'Registration failed', 'error')
    } finally { setLoading(false) }
  }

  const siteName = settings.site_name || 'SalesO'
  const logoUrl = settings.site_logo ? `${API_BASE}${settings.site_logo}` : null

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="fade-in" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '48px 40px', width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          {logoUrl ? (
            <img src={logoUrl} alt={siteName} style={{ maxHeight: 56, maxWidth: 180, objectFit: 'contain', marginBottom: 16 }} />
          ) : (
            <div style={{ width: 56, height: 56, background: 'linear-gradient(135deg, var(--accent), var(--accent-dim))', borderRadius: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, marginBottom: 16 }}>📦</div>
          )}
          <h1 style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, marginBottom: 6 }}>{siteName}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Create your account</p>
        </div>

        {checking ? (
          <div style={{ textAlign: 'center', padding: 20 }}><span className="spinner" /></div>
        ) : inviteError ? (
          <div>
            <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '16px', textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🚫</div>
              <p style={{ color: 'var(--red)', fontSize: 13 }}>{inviteError}</p>
            </div>
            <Link to="/login" className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>Back to Login</Link>
          </div>
        ) : (
          <>
            <div style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, padding: '12px 14px', marginBottom: 24, fontSize: 12, color: 'var(--green)' }}>
              ✓ Valid invitation for <strong>{inviteInfo?.email}</strong>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label>Email</label>
                <input type="text" value={inviteInfo?.email || ''} disabled style={{ opacity: 0.6 }} />
              </div>
              <div className="form-group">
                <label>Username</label>
                <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Choose a username" autoFocus />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 8 characters" />
              </div>
              <div className="form-group">
                <label>Confirm Password</label>
                <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat password" />
              </div>
              <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>
                {loading ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Creating…</> : 'Create Account'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
