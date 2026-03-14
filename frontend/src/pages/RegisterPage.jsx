import { useState, useEffect, useRef } from 'react'
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
  const fileRef = useRef()

  const [inviteInfo, setInviteInfo] = useState(null)
  const [inviteError, setInviteError] = useState('')
  const [checking, setChecking] = useState(true)

  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!token) { setInviteError('No invitation token provided.'); setChecking(false); return }
    api.get(`/api/auth/invite/${token}`)
      .then(res => { setInviteInfo(res.data); setChecking(false) })
      .catch(err => { setInviteError(err.response?.data?.error || 'Invalid invitation'); setChecking(false) })
  }, [token])

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setAvatarPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  // Auto-generate username from full name
  const handleFullNameChange = (e) => {
    const name = e.target.value
    setFullName(name)
    if (!username || username === fullName.toLowerCase().replace(/\s+/g, '_')) {
      setUsername(name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!fullName || !username || !password || !confirm) return toast('All fields required', 'error')
    if (password !== confirm) return toast('Passwords do not match', 'error')
    if (password.length < 8) return toast('Password must be at least 8 characters', 'error')
    setLoading(true)
    try {
      const res = await api.post('/api/auth/register', { token, username, password, full_name: fullName })
      
      // Upload avatar if selected
      if (avatarFile) {
        const form = new FormData()
        form.append('avatar', avatarFile)
        try {
          await api.post('/api/users/me/avatar', form, { headers: { 'Content-Type': 'multipart/form-data' } })
        } catch (e) { /* avatar upload failing shouldn't block registration */ }
      }

      await checkAuth()
      toast('Welcome to ' + (settings.site_name || 'SalesO') + '!', 'success')
      navigate('/', { replace: true })
    } catch (err) {
      toast(err.response?.data?.error || 'Registration failed', 'error')
    } finally { setLoading(false) }
  }

  const siteName = settings.site_name || 'SalesO'
  const logoUrl = settings.site_logo_dark ? `${API_BASE}${settings.site_logo_dark}` :
                  settings.site_logo ? `${API_BASE}${settings.site_logo}` : null
  const logoWidth = settings.logo_width || '200'
  const logoHeight = settings.logo_height || '60'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="fade-in" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '48px 40px', width: '100%', maxWidth: 460 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          {logoUrl ? (
            <img src={logoUrl} alt={siteName} style={{ maxWidth: logoWidth + 'px', maxHeight: logoHeight + 'px', objectFit: 'contain', marginBottom: 16 }} />
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

            {/* Avatar picker */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
              <div
                onClick={() => fileRef.current?.click()}
                style={{
                  width: 72, height: 72, borderRadius: '50%',
                  background: avatarPreview ? 'transparent' : 'var(--bg-card2)',
                  border: '2px dashed var(--border-light)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', overflow: 'hidden', flexShrink: 0,
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-light)'}
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: 28 }}>📷</span>
                )}
              </div>
              <input type="file" ref={fileRef} onChange={handleAvatarChange} accept="image/*" style={{ display: 'none' }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Profile Photo</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Optional — click to upload</div>
              </div>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label>Full Name</label>
                <input type="text" value={fullName} onChange={handleFullNameChange} placeholder="John Smith" autoFocus />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Username</label>
                  <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="john_smith" />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="text" value={inviteInfo?.email || ''} disabled style={{ opacity: 0.6 }} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Password</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 8 characters" />
                </div>
                <div className="form-group">
                  <label>Confirm Password</label>
                  <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat password" />
                </div>
              </div>
              <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>
                {loading ? <><span className="spinner" style={{ width: 16, height: 16 }} />Creating account…</> : 'Create Account'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
