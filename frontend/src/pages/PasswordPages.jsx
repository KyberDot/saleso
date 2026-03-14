import { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import api from '../utils/api'
import { useToast } from '../context/ToastContext'
import { useSite } from '../context/SiteContext'
import { API_BASE } from '../utils/api'
import DarkModeToggle from '../components/DarkModeToggle'

function AuthPageShell({ children }) {
  const { settings, darkMode } = useSite()

  const siteName = settings.site_name || 'SalesO'
  const showText = settings.login_show_text !== 'false'
  const logoWidth = settings.login_logo_width || settings.logo_width || '160'
  const logoHeight = settings.login_logo_height || settings.logo_height || '48'

  const logoUrl = darkMode
    ? (settings.site_logo_dark ? `${API_BASE}${settings.site_logo_dark}` : settings.site_logo ? `${API_BASE}${settings.site_logo}` : null)
    : (settings.site_logo_light ? `${API_BASE}${settings.site_logo_light}` : settings.site_logo ? `${API_BASE}${settings.site_logo}` : null)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)', backgroundSize: '60px 60px', opacity: 0.3 }} />
      <div className="fade-in" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '32px 32px', width: '100%', maxWidth: 380, position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          {logoUrl ? (
            <img src={logoUrl} alt={siteName} style={{ maxWidth: logoWidth + 'px', maxHeight: logoHeight + 'px', objectFit: 'contain', marginBottom: showText ? 10 : 0 }} />
          ) : (
            <div style={{ fontSize: 40, marginBottom: showText ? 10 : 0 }}>🔑</div>
          )}
          {showText && <h1 style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{siteName}</h1>}
        </div>
        {children}
      </div>
      <DarkModeToggle />
    </div>
  )
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const { settings } = useSite()
  const supportEmail = settings.support_email || 'support@saleso.app'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/api/auth/forgot-password', { email })
      setSent(true)
    } catch { toast('Request failed', 'error') }
    finally { setLoading(false) }
  }

  return (
    <AuthPageShell>
      <h2 style={{ fontFamily: 'var(--font-mono)', fontSize: 14, marginBottom: 4, textAlign: 'center' }}>Reset Password</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', marginBottom: 24 }}>Enter your email to receive a reset link</p>
      {sent ? (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📧</div>
          <p style={{ color: 'var(--text-dim)', marginBottom: 20, fontSize: 13 }}>If an account exists for <strong>{email}</strong>, a reset link has been sent.</p>
          <Link to="/login" className="btn btn-secondary" style={{ justifyContent: 'center', width: '100%' }}>Back to Login</Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label>Email Address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoFocus />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
            {loading ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Sending…</> : 'Send Reset Link'}
          </button>
          <Link to="/login" style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none' }}>Back to Login</Link>
          <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            Need help? <a href={`mailto:${supportEmail}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>{supportEmail}</a>
          </p>
        </form>
      )}
    </AuthPageShell>
  )
}

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const token = searchParams.get('token')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password !== confirm) return toast('Passwords do not match', 'error')
    if (password.length < 8) return toast('Min 8 characters', 'error')
    setLoading(true)
    try {
      await api.post('/api/auth/reset-password', { token, password })
      toast('Password reset! Please sign in.', 'success')
      navigate('/login', { replace: true })
    } catch (err) { toast(err.response?.data?.error || 'Reset failed', 'error') }
    finally { setLoading(false) }
  }

  return (
    <AuthPageShell>
      <h2 style={{ fontFamily: 'var(--font-mono)', fontSize: 14, marginBottom: 4, textAlign: 'center' }}>New Password</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', marginBottom: 24 }}>Choose a strong password</p>
      {!token ? (
        <div style={{ textAlign: 'center', color: 'var(--red)' }}>Invalid reset link. <Link to="/forgot-password">Try again</Link></div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label>New Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 8 characters" autoFocus />
          </div>
          <div className="form-group">
            <label>Confirm Password</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat password" />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
            {loading ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Resetting…</> : 'Reset Password'}
          </button>
        </form>
      )}
    </AuthPageShell>
  )
}
