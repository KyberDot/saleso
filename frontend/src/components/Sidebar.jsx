import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSite } from '../context/SiteContext'
import { API_BASE } from '../utils/api'

const navItems = [
  { to: '/', label: 'Dashboard', icon: '◼', end: true },
  { to: '/sales', label: 'Sales', icon: '⬆', end: false },
  { to: '/orders', label: 'Orders', icon: '🗂', end: false },
  { to: '/inventory', label: 'Inventory', icon: '📦', end: false },
  { to: '/stats', label: 'Analytics', icon: '📊', end: false },
]

function Avatar({ user, size = 30 }) {
  const initial = user?.username?.[0]?.toUpperCase() || 'U'
  if (user?.avatar_url) {
    return <img src={`${API_BASE}${user.avatar_url}`} alt="" className="avatar" style={{ width: size, height: size }} />
  }
  return (
    <div className="avatar" style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {initial}
    </div>
  )
}

export { Avatar }

export default function Sidebar() {
  const { user, logout } = useAuth()
  const { settings, darkMode, toggleDarkMode } = useSite()
  const navigate = useNavigate()
  const isAdmin = user?.role === 'admin'
  const [menuOpen, setMenuOpen] = useState(false)

  const logoUrl = darkMode
    ? (settings.site_logo_dark ? `${API_BASE}${settings.site_logo_dark}` : settings.site_logo ? `${API_BASE}${settings.site_logo}` : null)
    : (settings.site_logo_light ? `${API_BASE}${settings.site_logo_light}` : settings.site_logo ? `${API_BASE}${settings.site_logo}` : null)

  const siteName = settings.site_name || 'SalesO'
  const siteUrl = settings.site_url || null
  const showSidebarText = settings.sidebar_show_text !== 'false'
  const logoWidth = settings.logo_width || '200'
  const logoHeight = settings.logo_height || '60'

  const handleLogoClick = () => {
    if (siteUrl) window.open(siteUrl, '_blank')
  }

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div
        onClick={handleLogoClick}
        style={{
          padding: '14px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 10,
          minHeight: 64,
          cursor: siteUrl ? 'pointer' : 'default',
          transition: 'opacity 0.15s',
        }}
        onMouseEnter={e => { if (siteUrl) e.currentTarget.style.opacity = '0.8' }}
        onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
      >
        {logoUrl ? (
          <>
            <img
              src={logoUrl}
              alt={siteName}
              style={{
                maxWidth: parseInt(logoWidth) > 160 ? '160px' : logoWidth + 'px',
                maxHeight: parseInt(logoHeight) > 44 ? '44px' : logoHeight + 'px',
                objectFit: 'contain',
              }}
            />
            {showSidebarText && (
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {siteName}
              </span>
            )}
          </>
        ) : (
          <>
            <div style={{ width: 30, height: 30, background: 'var(--accent)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>📦</div>
            {showSidebarText && (
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, lineHeight: 1 }}>{siteName}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--accent)', lineHeight: 1.4, letterSpacing: '0.1em' }}>SALES TRACKER</div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '10px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {navItems.map(item => (
          <NavLink key={item.to} to={item.to} end={item.end}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 10px', borderRadius: 'var(--radius)',
              textDecoration: 'none', fontSize: 13, fontWeight: 500,
              color: isActive ? '#000' : 'var(--text-dim)',
              background: isActive ? 'var(--accent)' : 'transparent',
              transition: 'all 0.15s',
            })}>
            <span style={{ fontSize: 14, width: 20, textAlign: 'center' }}>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}

        {isAdmin && (
          <>
            <div style={{ height: 1, background: 'var(--border)', margin: '8px 4px' }} />
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', padding: '4px 10px', letterSpacing: '0.08em' }}>ADMIN</div>
            <NavLink to="/admin" style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 10px', borderRadius: 'var(--radius)',
              textDecoration: 'none', fontSize: 13, fontWeight: 500,
              color: isActive ? '#000' : 'var(--text-dim)',
              background: isActive ? 'var(--accent)' : 'transparent',
              transition: 'all 0.15s',
            })}>
              <span style={{ fontSize: 14, width: 20, textAlign: 'center' }}>🛠</span>
              Admin Panel
            </NavLink>
          </>
        )}
      </nav>

      {/* User footer */}
      <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', position: 'relative' }}>

        {/* Popup menu */}
        {menuOpen && (
          <>
            <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 99 }} />
            <div style={{
              position: 'absolute', bottom: '100%', left: 12, right: 12,
              background: 'var(--bg-card)', border: '1px solid var(--border-light)',
              borderRadius: 10, overflow: 'hidden', zIndex: 100,
              boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
              marginBottom: 6,
            }}>
              <button
                onClick={() => { setMenuOpen(false); navigate('/settings') }}
                style={{ width: '100%', padding: '11px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--border)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <span>⚙</span> Settings
              </button>
              <button
                onClick={() => { setMenuOpen(false); toggleDarkMode() }}
                style={{ width: '100%', padding: '11px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--border)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <span>{darkMode ? '☀️' : '🌙'}</span> {darkMode ? 'Light Mode' : 'Dark Mode'}
              </button>
              <button
                onClick={() => { setMenuOpen(false); logout() }}
                style={{ width: '100%', padding: '11px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--red)', display: 'flex', alignItems: 'center', gap: 10 }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <span>↩</span> Sign Out
              </button>
            </div>
          </>
        )}

        {/* User row — click opens menu */}
        <div
          onClick={() => setMenuOpen(v => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '6px 4px', borderRadius: 8, transition: 'background 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card2)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <Avatar user={user} size={32} />
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--username-color, var(--text))' }}>
              {user?.full_name || user?.username}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {user?.role === 'admin' ? '👑 Admin' : '● Active'}
            </div>
          </div>
          {/* Hamburger */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: 4, flexShrink: 0 }}>
            {[0,1,2].map(i => <div key={i} style={{ width: 14, height: 1.5, background: 'var(--text-muted)', borderRadius: 1 }} />)}
          </div>
        </div>
      </div>
    </aside>
  )
}
