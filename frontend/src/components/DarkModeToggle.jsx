import { useSite } from '../context/SiteContext'

export default function DarkModeToggle() {
  const { darkMode, toggleDarkMode } = useSite()

  return (
    <button
      data-dark-toggle
      onClick={toggleDarkMode}
      title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{
        position: 'fixed',
        bottom: 22,
        right: 18,
        width: 34,
        height: 34,
        borderRadius: '50%',
        background: 'var(--bg-card2)',
        border: '1px solid var(--border-light)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
        boxShadow: '0 2px 10px rgba(0,0,0,0.35)',
        transition: 'transform 0.15s, box-shadow 0.15s',
        padding: 0,
        lineHeight: 1,
        fontSize: 16,
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.45)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.35)' }}
    >
      {darkMode ? '☀️' : '🌙'}
    </button>
  )
}
