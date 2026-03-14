import { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import api from '../utils/api'
import { useToast } from '../context/ToastContext'
import { useSite } from '../context/SiteContext'
import { API_BASE } from '../utils/api'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const { settings } = useSite()
  const logoUrl = settings.site_logo ? `${API_BASE}${settings.site_logo}` : null

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
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="fade-in" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '48px 40px', width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          {logoUrl ? <img src={logoUrl} alt="" style={{ maxHeight: 48, marginBottom: 16 }} /> : <div style={{ fontSize: 40, marginBottom: 16 }}>🔑</div>}
          <h1 style={{ fontFamily: 'var(--font-mono)', fontSize: 20, marginBottom: 6 }}>Reset Password</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Enter your email to receive a reset link</p>
        </div>
        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📧</div>
            <p style={{ color: 'var(--text-dim)', marginBottom: 20, fontSize: 13 }}>If an account exists for <strong>{email}</strong>, a reset link has been sent.</p>
            <Link to="/login" className="btn btn-secondary" style={{ justifyContent: 'center', width: '100%' }}>Back to Login</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label>Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoFocus />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
              {loading ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Sending…</> : 'Send Reset Link'}
            </button>
            <Link to="/login" style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none' }}>Back to Login</Link>
          </form>
        )}
      </div>
    </div>
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
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="fade-in" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '48px 40px', width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🔒</div>
          <h1 style={{ fontFamily: 'var(--font-mono)', fontSize: 20, marginBottom: 6 }}>New Password</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Choose a strong password</p>
        </div>
        {!token ? (
          <div style={{ textAlign: 'center', color: 'var(--red)' }}>Invalid reset link. <Link to="/forgot-password">Try again</Link></div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
      </div>
    </div>
  )
}
