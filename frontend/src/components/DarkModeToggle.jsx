import { useSite } from '../context/SiteContext'

export default function DarkModeToggle() {
  const { darkMode, toggleDarkMode } = useSite()

  return (
    <button
      onClick={toggleDarkMode}
      title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{
        position: 'fixed',
        bottom: 24,
        right: 20,
        width: 36,
        height: 36,
        borderRadius: '50%',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-light)',
        cursor: 'pointer',
        fontSize: 17,
        lineHeight: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
        boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
        transition: 'transform 0.15s, box-shadow 0.15s',
        padding: 0,
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.4)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.3)' }}
    >
      <span style={{ display: 'block', lineHeight: 1, marginTop: 0 }}>
        {darkMode ? '☀️' : '🌙'}
      </span>
    </button>
  )
}
