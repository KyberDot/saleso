import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSite } from '../context/SiteContext'
import { API_BASE } from '../utils/api'

const navItems = [
  { to: '/', label: 'Dashboard', icon: '🏠', end: true },
  { to: '/sales', label: 'Sales', icon: '💰' },
  { to: '/orders', label: 'Orders', icon: '🗂️' },
  { to: '/inventory', label: 'Inventory', icon: '📦' },
  { to: '/stats', label: 'Analytics', icon: '📊' },
]

export function Avatar({ user, size = 30 }) {
  const initial = (user?.full_name || user?.username || 'U')[0].toUpperCase()
  if (user?.avatar_url) {
    return (
      <img
        src={`${API_BASE}${user.avatar_url}?t=${Math.floor(Date.now() / 60000)}`}
        alt="" className="avatar"
        style={{ width: size, height: size, fontSize: size * 0.38 }}
      />
    )
  }
  return (
    <div className="avatar" style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {initial}
    </div>
  )
}

export default function Sidebar() {
  const { user, logout } = useAuth()
  const { settings, darkMode } = useSite()
  const navigate = useNavigate()
  const isAdmin = user?.role === 'admin'
  const [menuOpen, setMenuOpen] = useState(false)

  const logoUrl = darkMode
    ? (settings.site_logo_dark ? `${API_BASE}${settings.site_logo_dark}` : settings.site_logo ? `${API_BASE}${settings.site_logo}` : null)
    : (settings.site_logo_light ? `${API_BASE}${settings.site_logo_light}` : settings.site_logo ? `${API_BASE}${settings.site_logo}` : null)

  const siteName = settings.site_name || 'SalesO'
  const siteUrl = settings.site_url || null
  const showSidebarText = settings.sidebar_show_text !== 'false'
  const logoW = Math.min(parseInt(settings.logo_width || 160), 160)
  const logoH = Math.min(parseInt(settings.logo_height || 44), 44)

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div
        onClick={() => siteUrl && window.open(siteUrl, '_blank')}
        style={{
          padding: '0 16px', height: 60,
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 10,
          cursor: siteUrl ? 'pointer' : 'default',
          flexShrink: 0,
        }}
      >
        {logoUrl ? (
          <>
            <img src={logoUrl} alt={siteName} style={{ maxWidth: logoW, maxHeight: logoH, objectFit: 'contain', flexShrink: 0 }} />
            {showSidebarText && (
              <span style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text)' }}>
                {siteName}
              </span>
            )}
          </>
        ) : (
          <>
            <div style={{ width: 28, height: 28, background: 'var(--accent)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>📦</div>
            {showSidebarText && (
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>{siteName}</span>
            )}
          </>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 1, overflowY: 'auto' }}>
        {navItems.map(item => (
          <NavLink key={item.to} to={item.to} end={item.end}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 9,
              padding: '8px 10px', borderRadius: 7,
              textDecoration: 'none', fontSize: 13, fontWeight: isActive ? 600 : 400,
              color: isActive ? '#000' : 'var(--text-dim)',
              background: isActive ? 'var(--accent)' : 'transparent',
              transition: 'all 0.12s',
            })}
            onMouseEnter={e => { if (!e.currentTarget.classList.contains('active')) e.currentTarget.style.background = 'var(--bg-card2)' }}
            onMouseLeave={e => { if (!e.currentTarget.classList.contains('active')) e.currentTarget.style.background = 'transparent' }}
          >
            <span style={{ fontSize: 14, width: 18, textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}

        {isAdmin && (
          <>
            <div style={{ height: 1, background: 'var(--border)', margin: '8px 2px' }} />
            <NavLink to="/admin"
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '8px 10px', borderRadius: 7,
                textDecoration: 'none', fontSize: 13, fontWeight: isActive ? 600 : 400,
                color: isActive ? '#000' : 'var(--text-dim)',
                background: isActive ? 'var(--accent)' : 'transparent',
                transition: 'all 0.12s',
              })}>
              <span style={{ fontSize: 14, width: 18, textAlign: 'center', flexShrink: 0 }}>🛠</span>
              Admin Panel
            </NavLink>
          </>
        )}
      </nav>

      {/* User footer with popup menu */}
      <div style={{ padding: '8px 10px', borderTop: '1px solid var(--border)', position: 'relative' }}>
        {menuOpen && (
          <>
            <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 99 }} />
            <div style={{
              position: 'absolute', bottom: 'calc(100% + 6px)', left: 8, right: 8,
              background: 'var(--bg-card2)', border: '1px solid var(--border-light)',
              borderRadius: 10, overflow: 'hidden', zIndex: 100,
              boxShadow: '0 -8px 32px rgba(0,0,0,0.4)',
            }}>
              {[
                { icon: '⚙', label: 'Settings', action: () => { setMenuOpen(false); navigate('/settings') } },
                { icon: darkMode ? '☀️' : '🌙', label: darkMode ? 'Light Mode' : 'Dark Mode', action: () => { setMenuOpen(false); document.querySelector('[data-dark-toggle]')?.click() } },
              ].map(item => (
                <button key={item.label} onClick={item.action}
                  style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--border)', textAlign: 'left' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card3)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                  <span>{item.icon}</span>{item.label}
                </button>
              ))}
              <button onClick={() => { setMenuOpen(false); logout() }}
                style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--red)', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card3)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                <span>↩</span>Sign Out
              </button>
            </div>
          </>
        )}

        <div onClick={() => setMenuOpen(v => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', padding: '7px 8px', borderRadius: 8, transition: 'background 0.12s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card2)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <Avatar user={user} size={30} />
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: user?.plan?.color || 'var(--username-color, var(--text))', display: 'flex', alignItems: 'center', gap: 5 }}>
              {user?.full_name || user?.username}
              {user?.plan && (
                <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 8, background: user.plan.color + '22', color: user.plan.color, fontFamily: 'var(--font-mono)', fontWeight: 700, flexShrink: 0 }}>
                  {user.plan.name}
                </span>
              )}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {user?.role === 'admin' ? '👑 admin' : '● active'}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2.5, padding: 3, flexShrink: 0, opacity: 0.5 }}>
            {[0,1,2].map(i => <div key={i} style={{ width: 13, height: 1.5, background: 'var(--text-muted)', borderRadius: 1 }} />)}
          </div>
        </div>
      </div>
    </aside>
  )
}
