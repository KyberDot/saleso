import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../utils/api'

const SiteContext = createContext(null)

export function SiteProvider({ children }) {
  const [settings, setSettings] = useState({})
  const [loaded, setLoaded] = useState(false)
  const [darkMode, setDarkMode] = useState(true)

  const loadSettings = useCallback(async () => {
    try {
      const res = await api.get('/api/site')
      const s = res.data.settings || {}
      setSettings(s)
      applyTheme(s, darkMode)
    } catch {}
    setLoaded(true)
  }, [darkMode])

  useEffect(() => { loadSettings() }, [])

  // Persist dark mode preference
  useEffect(() => {
    const saved = localStorage.getItem('saleso_dark_mode')
    if (saved !== null) setDarkMode(saved === 'true')
  }, [])

  const applyTheme = (s, isDark) => {
    const root = document.documentElement

    if (isDark) {
      // Dark theme
      root.style.setProperty('--bg', s.background_color || '#0a0a0f')
      root.style.setProperty('--bg-card', s.card_color || '#111118')
      root.style.setProperty('--bg-card2', (s.card_color || '#111118') + 'dd')
      root.style.setProperty('--border', '#1e1e2e')
      root.style.setProperty('--border-light', '#2a2a3a')
      root.style.setProperty('--text', s.text_color || '#e8e8f0')
      root.style.setProperty('--text-muted', '#6b6b80')
      root.style.setProperty('--text-dim', '#9595a8')
    } else {
      // Light theme
      root.style.setProperty('--bg', '#f4f4f8')
      root.style.setProperty('--bg-card', '#ffffff')
      root.style.setProperty('--bg-card2', '#f0f0f5')
      root.style.setProperty('--border', '#dddde8')
      root.style.setProperty('--border-light', '#c8c8d8')
      root.style.setProperty('--text', '#1a1a2e')
      root.style.setProperty('--text-muted', '#7070888')
      root.style.setProperty('--text-dim', '#555568')
    }

    // Always apply accent/brand colours
    if (s.primary_color) {
      root.style.setProperty('--accent', s.primary_color)
      root.style.setProperty('--accent-dim', s.primary_color + 'cc')
      const hex = s.primary_color.replace('#', '')
      const r = parseInt(hex.slice(0,2),16), g = parseInt(hex.slice(2,4),16), b = parseInt(hex.slice(4,6),16)
      root.style.setProperty('--accent-glow', `rgba(${r},${g},${b},0.15)`)
    }
    if (s.accent_color) root.style.setProperty('--green', s.accent_color)
    if (s.username_color) root.style.setProperty('--username-color', s.username_color)
    if (s.site_name) document.title = s.site_name
  }

  const toggleDarkMode = () => {
    const next = !darkMode
    setDarkMode(next)
    localStorage.setItem('saleso_dark_mode', String(next))
    applyTheme(settings, next)
  }

  // Re-apply when settings change
  useEffect(() => {
    if (Object.keys(settings).length > 0) applyTheme(settings, darkMode)
  }, [settings, darkMode])

  return (
    <SiteContext.Provider value={{ settings, loaded, loadSettings, applyTheme, darkMode, toggleDarkMode }}>
      {children}
    </SiteContext.Provider>
  )
}

export const useSite = () => useContext(SiteContext)
