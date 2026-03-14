import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSite } from '../context/SiteContext'
import { API_BASE } from '../utils/api'

const navItems = [
  { to: '/', label: 'Dashboard', icon: '▦', end: true },
  { to: '/sales', label: 'Sales', icon: '↗' },
  { to: '/orders', label: 'Orders', icon: '📋' },
  { to: '/inventory', label: 'Inventory', icon: '📦' },
  { to: '/stats', label: 'Analytics', icon: '📈' },
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
  const isAdmin = user?.role === 'admin'

  // Pick correct logo based on dark/light mode
  const logoUrl = darkMode
    ? (settings.site_logo_dark ? `${API_BASE}${settings.site_logo_dark}` : settings.site_logo ? `${API_BASE}${settings.site_logo}` : null)
    : (settings.site_logo_light ? `${API_BASE}${settings.site_logo_light}` : settings.site_logo ? `${API_BASE}${settings.site_logo}` : null)

  const siteName = settings.site_name || 'SalesO'
  const showSidebarText = settings.sidebar_show_text !== 'false'
  const logoWidth = settings.logo_width || '200'
  const logoHeight = settings.logo_height || '60'

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, minHeight: 68 }}>
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={siteName}
            style={{ maxWidth: parseInt(logoWidth) > 180 ? '180px' : logoWidth + 'px', maxHeight: parseInt(logoHeight) > 48 ? '48px' : logoHeight + 'px', objectFit: 'contain' }}
          />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, background: 'var(--accent)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>📦</div>
            {showSidebarText && (
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14, lineHeight: 1 }}>{siteName}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--accent)', lineHeight: 1.4, letterSpacing: '0.1em' }}>SALES TRACKER</div>
              </div>
            )}
          </div>
        )}
        {/* If has logo but sidebar_show_text enabled, show name next to it */}
        {logoUrl && showSidebarText && (
          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, lineHeight: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {siteName}
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {navItems.map(item => (
          <NavLink key={item.to} to={item.to} end={item.end}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 10px', borderRadius: 'var(--radius)',
              textDecoration: 'none', fontSize: 13, fontWeight: 500,
              color: isActive ? '#000' : 'var(--text-dim)',
              background: isActive ? 'var(--accent)' : 'transparent',
              transition: 'all 0.15s',
            })}>
            <span style={{ fontSize: 15, width: 20, textAlign: 'center' }}>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}

        {isAdmin && (
          <>
            <div style={{ height: 1, background: 'var(--border)', margin: '8px 4px' }} />
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', padding: '4px 10px', letterSpacing: '0.08em' }}>ADMIN</div>
            <NavLink to="/admin" style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 10px', borderRadius: 'var(--radius)',
              textDecoration: 'none', fontSize: 13, fontWeight: 500,
              color: isActive ? '#000' : 'var(--text-dim)',
              background: isActive ? 'var(--accent)' : 'transparent',
              transition: 'all 0.15s',
            })}>
              <span style={{ fontSize: 15, width: 20, textAlign: 'center' }}>⚙</span>
              Admin Panel
            </NavLink>
          </>
        )}
      </nav>

      {/* Dark/Light toggle */}
      <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border)' }}>
        <button
          onClick={toggleDarkMode}
          className="btn btn-ghost btn-sm"
          style={{ width: '100%', justifyContent: 'center', gap: 8, marginBottom: 6 }}
        >
          <span>{darkMode ? '☀️' : '🌙'}</span>
          {darkMode ? 'Light Mode' : 'Dark Mode'}
        </button>
      </div>

      {/* User footer */}
      <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border)' }}>
        <NavLink to="/settings" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', padding: '8px 4px', borderRadius: 8, transition: 'background 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card2)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <Avatar user={user} size={32} />
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--username-color, var(--text))' }}>
              {user?.full_name || user?.username}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {user?.role === 'admin' ? '👑 Admin' : '● Active'}
            </div>
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>⚙</span>
        </NavLink>
        <button className="btn btn-ghost btn-sm" onClick={logout} style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>
          Sign Out
        </button>
      </div>
    </aside>
  )
}
