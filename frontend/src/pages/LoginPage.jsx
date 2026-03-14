import { useState, useEffect } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useSite } from '../context/SiteContext'
import { API_BASE } from '../utils/api'

export default function LoginPage() {
  const { login, user } = useAuth()
  const { toast } = useToast()
  const { settings } = useSite()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => { if (user) navigate('/', { replace: true }) }, [user])

  useEffect(() => {
    if (searchParams.get('auth_success')) { toast('eBay connected successfully!', 'success') }
    if (searchParams.get('auth_error')) { toast('eBay connection failed: ' + searchParams.get('auth_error'), 'error') }
  }, [searchParams])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) return toast('Email and password required', 'error')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/', { replace: true })
    } catch (err) {
      toast(err.response?.data?.error || 'Login failed', 'error')
    } finally { setLoading(false) }
  }

  const siteName = settings.site_name || 'SalesO'
  const logoUrl = settings.site_logo ? `${API_BASE}${settings.site_logo}` : null

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)', backgroundSize: '60px 60px', opacity: 0.3 }} />
      <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%,-50%)', width: 600, height: 400, background: 'radial-gradient(ellipse, var(--accent-glow) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div className="fade-in" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '48px 40px', width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>

        {/* Logo / Brand */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          {logoUrl ? (
            <img src={logoUrl} alt={siteName} style={{ maxHeight: 64, maxWidth: 200, objectFit: 'contain', marginBottom: 16 }} />
          ) : (
            <div style={{ width: 64, height: 64, background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-dim) 100%)', borderRadius: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, marginBottom: 16, boxShadow: '0 8px 32px var(--accent-glow)' }}>📦</div>
          )}
          <h1 style={{ fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 700, marginBottom: 6 }}>{siteName}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label>Email or Username</label>
            <input type="text" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoFocus />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
          </div>

          <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>
            {loading ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Signing in…</> : 'Sign In'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Link to="/forgot-password" style={{ fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none' }}>
            Forgot your password?
          </Link>
          <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Need access? Contact your administrator for an invitation.
          </p>
        </div>
      </div>
    </div>
  )
}
