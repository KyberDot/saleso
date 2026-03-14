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
    // Apply light/dark body class
    document.body.classList.toggle('light-mode', !isDark)

    if (isDark) {
      // Apply custom dark theme colors if set
      if (s.background_color) root.style.setProperty('--bg', s.background_color)
      if (s.card_color) root.style.setProperty('--bg-card', s.card_color)
      if (s.text_color) root.style.setProperty('--text', s.text_color)
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
    // Update favicon
    if (s.site_favicon) {
      let link = document.querySelector("link[rel~='icon']")
      if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link) }
      link.href = s.site_favicon.startsWith('http') ? s.site_favicon : (window.location.origin + s.site_favicon)
    }
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
