import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../utils/api'

const SiteContext = createContext(null)

export function SiteProvider({ children }) {
  const [settings, setSettings] = useState({})
  const [loaded, setLoaded] = useState(false)

  const loadSettings = useCallback(async () => {
    try {
      const res = await api.get('/api/site')
      const s = res.data.settings || {}
      setSettings(s)
      applyTheme(s)
    } catch {}
    setLoaded(true)
  }, [])

  useEffect(() => { loadSettings() }, [loadSettings])

  const applyTheme = (s) => {
    const root = document.documentElement
    if (s.primary_color) root.style.setProperty('--accent', s.primary_color)
    if (s.background_color) root.style.setProperty('--bg', s.background_color)
    if (s.card_color) { root.style.setProperty('--bg-card', s.card_color); root.style.setProperty('--bg-card2', s.card_color + 'dd') }
    if (s.text_color) root.style.setProperty('--text', s.text_color)
    if (s.accent_color) root.style.setProperty('--green', s.accent_color)
    if (s.primary_color) {
      // Derive glow from primary
      const hex = s.primary_color.replace('#', '')
      const r = parseInt(hex.slice(0,2),16), g = parseInt(hex.slice(2,4),16), b = parseInt(hex.slice(4,6),16)
      root.style.setProperty('--accent-glow', `rgba(${r},${g},${b},0.15)`)
      root.style.setProperty('--accent-dim', s.primary_color + 'cc')
    }
    if (s.site_name) document.title = s.site_name
  }

  return (
    <SiteContext.Provider value={{ settings, loaded, loadSettings, applyTheme }}>
      {children}
    </SiteContext.Provider>
  )
}

export const useSite = () => useContext(SiteContext)
