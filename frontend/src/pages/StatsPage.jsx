import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend, AreaChart, Area } from 'recharts'
import api from '../utils/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { formatCurrency, formatNumber } from '../utils/format'

const QUICK_RANGES = [
  { label: '7d', days: 7 },
  { label: '14d', days: 14 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
  { label: 'Custom', days: null },
]

function SectionDivider({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>{label}</div>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  )
}

function StatBox({ label, value, sub, accent, color, small }) {
  return (
    <div className="stat-card" style={{ borderColor: accent ? 'var(--accent)' : undefined }}>
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ color: color || (accent ? 'var(--accent)' : undefined), fontSize: small ? 16 : 20 }}>{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
}

const ChartTip = ({ active, payload, label, currency }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--bg-card2)', border: '1px solid var(--border-light)', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 6, fontFamily: 'var(--font-mono)' }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color, display: 'flex', gap: 12, justifyContent: 'space-between', marginBottom: 2 }}>
          <span>{p.name}</span>
          <span style={{ fontWeight: 700 }}>
            {['gross_revenue','net_profit','fees','revenue'].includes(p.dataKey) ? formatCurrency(p.value, currency) : formatNumber(p.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

function monthName(str) {
  if (!str) return '—'
  try {
    const [y, m] = str.split('-')
    return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  } catch { return str }
}

export default function StatsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [monthly, setMonthly] = useState([])
  const [syncLog, setSyncLog] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeRange, setActiveRange] = useState(30)
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [showCustom, setShowCustom] = useState(false)
  const [rangeSummary, setRangeSummary] = useState(null)
  const [rangeDaily, setRangeDaily] = useState([])
  const currency = user?.default_currency || 'GBP'

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [monthRes, logRes] = await Promise.all([
          api.get('/api/stats/monthly'),
          api.get('/api/stats/sync-log'),
        ])
        setMonthly([...(monthRes.data.monthly || [])].reverse())
        setSyncLog(logRes.data.logs || [])
      } catch { toast('Failed to load stats', 'error') }
      finally { setLoading(false) }
    }
    load()
  }, [])

  useEffect(() => { if (!showCustom) loadRange() }, [activeRange])

  const loadRange = async (from, to) => {
    try {
      const params = {}
      if (from && to) {
        params.from = new Date(from).getTime()
        params.to = new Date(to + 'T23:59:59').getTime()
      } else {
        params.days = activeRange
      }
      const res = await api.get('/api/sales/summary', { params })
      setRangeSummary(res.data.summary || {})
      setRangeDaily(res.data.dailySales || [])
    } catch {}
  }

  const handleRangeSelect = (days) => {
    if (days === null) { setShowCustom(true); return }
    setActiveRange(days); setShowCustom(false)
  }

  const handleCustomApply = () => {
    if (!customFrom || !customTo) return
    setShowCustom(false)
    loadRange(customFrom, customTo)
  }

  const totals = monthly.reduce((acc, m) => ({
    orders: acc.orders + (m.orders || 0),
    items_sold: acc.items_sold + (m.items_sold || 0),
    gross_revenue: acc.gross_revenue + (m.gross_revenue || 0),
    net_profit: acc.net_profit + (m.net_profit || 0),
    fees: acc.fees + (m.fees || 0),
  }), { orders: 0, items_sold: 0, gross_revenue: 0, net_profit: 0, fees: 0 })

  const bestMonth = monthly.length > 0
    ? monthly.reduce((best, m) => m.gross_revenue > best.gross_revenue ? m : best, monthly[0])
    : null

  const avgMonthlyRevenue = monthly.length > 0 ? totals.gross_revenue / monthly.length : 0
  const avgOrderValue = totals.orders > 0 ? totals.gross_revenue / totals.orders : 0
  const profitMargin = totals.gross_revenue > 0 ? ((totals.net_profit / totals.gross_revenue) * 100).toFixed(1) : '0.0'
  const avgItemsPerOrder = totals.orders > 0 ? (totals.items_sold / totals.orders).toFixed(1) : '0'

  const rs = rangeSummary || {}

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 style={{ fontSize: 18, marginBottom: 2 }}>📊 Analytics</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>All-time performance &amp; trends</p>
        </div>
      </div>

      <div className="page-body">
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}><span className="spinner" style={{ width: 32, height: 32 }} /></div>
        ) : (
          <>
            {/* ── OVERALL STATISTICS ── */}
            <SectionDivider label="OVERALL STATISTICS" />
            <div className="stats-grid" style={{ marginBottom: 28 }}>
              <StatBox label="All-Time Revenue" value={formatCurrency(totals.gross_revenue, currency)} accent />
              <StatBox label="All-Time Net Profit" value={formatCurrency(totals.net_profit, currency)} color={totals.net_profit > 0 ? 'var(--green)' : 'var(--red)'} />
              <StatBox label="Total Orders" value={formatNumber(totals.orders)} />
              <StatBox label="Total Items Sold" value={formatNumber(totals.items_sold)} />
              <StatBox label="Total eBay Fees" value={formatCurrency(totals.fees, currency)} />
              <StatBox label="Best Month" value={monthName(bestMonth?.month)} sub={bestMonth ? formatCurrency(bestMonth.gross_revenue, currency) : ''} small />
              <StatBox label="Avg Monthly Revenue" value={formatCurrency(avgMonthlyRevenue, currency)} />
              <StatBox label="Avg Order Value" value={formatCurrency(avgOrderValue, currency)} />
              <StatBox label="Profit Margin" value={profitMargin + '%'} color={parseFloat(profitMargin) > 0 ? 'var(--green)' : 'var(--red)'} />
              <StatBox label="Avg Items / Order" value={avgItemsPerOrder} />
            </div>

            {/* ── FILTERED STATISTICS ── */}
            <SectionDivider label="FILTERED STATISTICS" />

            {/* Range selector */}
            <div className="card" style={{ marginBottom: 20, padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>DATE RANGE:</span>
                <div style={{ display: 'flex', gap: 3, background: 'var(--bg-card2)', borderRadius: 8, padding: 3, border: '1px solid var(--border)' }}>
                  {QUICK_RANGES.map(r => (
                    <button key={r.label} className="btn btn-sm"
                      onClick={() => handleRangeSelect(r.days)}
                      style={{
                        background: (!showCustom && activeRange === r.days) || (showCustom && r.days === null) ? 'var(--accent)' : 'transparent',
                        color: (!showCustom && activeRange === r.days) || (showCustom && r.days === null) ? '#000' : 'var(--text-muted)',
                        border: 'none', fontFamily: 'var(--font-mono)'
                      }}>
                      {r.label}
                    </button>
                  ))}
                </div>
                {showCustom && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} style={{ width: 140, fontSize: 12, colorScheme: 'dark' }} />
                    <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>to</span>
                    <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} style={{ width: 140, fontSize: 12, colorScheme: 'dark' }} />
                    <button className="btn btn-primary btn-sm" onClick={handleCustomApply} disabled={!customFrom || !customTo}>Apply</button>
                  </div>
                )}
              </div>

              {/* 4 filtered stat boxes */}
              <div className="stats-grid" style={{ marginTop: 16, gridTemplateColumns: 'repeat(4, 1fr)' }}>
                <StatBox label={showCustom ? 'Period Revenue' : `${activeRange}d Revenue`} value={formatCurrency(rs.gross_revenue, currency)} accent />
                <StatBox label="Period Net Profit" value={formatCurrency(rs.net_profit, currency)} color={(rs.net_profit || 0) > 0 ? 'var(--green)' : 'var(--red)'} />
                <StatBox label="Orders" value={formatNumber(rs.total_orders)} />
                <StatBox label="Unique Buyers" value={formatNumber(rs.unique_buyers)} />
              </div>
            </div>

            {/* Filtered daily chart */}
            {rangeDaily.length > 0 && (
              <div className="card" style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: 12, fontFamily: 'var(--font-mono)', marginBottom: 20 }}>DAILY REVENUE — SELECTED RANGE</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={rangeDaily}>
                    <defs>
                      <linearGradient id="rg2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="day" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false}
                      tickFormatter={v => { try { const d = new Date(v); return d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }) } catch { return v } }} />
                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => formatCurrency(v, currency)} />
                    <Tooltip content={<ChartTip currency={currency} />} />
                    <Area type="monotone" dataKey="revenue" name="Revenue" stroke="var(--accent)" strokeWidth={2} fill="url(#rg2)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Monthly bar chart */}
            <div className="card" style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 12, fontFamily: 'var(--font-mono)', marginBottom: 20 }}>MONTHLY REVENUE & PROFIT</h3>
              {monthly.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={monthly} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false}
                      tickFormatter={v => { try { const [y,m] = v.split('-'); return new Date(parseInt(y), parseInt(m)-1).toLocaleDateString('en-GB',{month:'short'}) } catch { return v } }} />
                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => formatCurrency(v, currency)} />
                    <Tooltip content={<ChartTip currency={currency} />} />
                    <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-muted)' }} />
                    <Bar dataKey="gross_revenue" name="Revenue" fill="var(--accent)" radius={[4,4,0,0]} opacity={0.9} />
                    <Bar dataKey="net_profit" name="Net Profit" fill="var(--green)" radius={[4,4,0,0]} opacity={0.9} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="empty-state"><p>No data yet</p></div>}
            </div>

            {/* Monthly orders chart */}
            <div className="card" style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 12, fontFamily: 'var(--font-mono)', marginBottom: 20 }}>MONTHLY ORDERS & ITEMS SOLD</h3>
              {monthly.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={monthly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false}
                      tickFormatter={v => { try { const [y,m] = v.split('-'); return new Date(parseInt(y), parseInt(m)-1).toLocaleDateString('en-GB',{month:'short'}) } catch { return v } }} />
                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} />
                    <Tooltip content={<ChartTip currency={currency} />} />
                    <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-muted)' }} />
                    <Line type="monotone" dataKey="orders" name="Orders" stroke="var(--accent)" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="items_sold" name="Items Sold" stroke="var(--green)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : <div className="empty-state"><p>No data yet</p></div>}
            </div>

            {/* Monthly table */}
            <div className="card" style={{ marginBottom: 20, padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}>MONTHLY BREAKDOWN</h3>
              </div>
              {monthly.length > 0 ? (
                <table className="data-table">
                  <thead><tr><th>Month</th><th>Orders</th><th>Items</th><th>Revenue</th><th>Net Profit</th><th>Fees</th><th>Margin</th></tr></thead>
                  <tbody>
                    {[...monthly].reverse().map(m => {
                      const margin = m.gross_revenue > 0 ? ((m.net_profit / m.gross_revenue) * 100).toFixed(1) : 0
                      return (
                        <tr key={m.month} style={{ cursor: 'default' }}>
                          <td className="mono" style={{ fontWeight: 700 }}>{monthName(m.month)}</td>
                          <td className="mono">{formatNumber(m.orders)}</td>
                          <td className="mono">{formatNumber(m.items_sold)}</td>
                          <td className="mono" style={{ color: 'var(--accent)', fontWeight: 700 }}>{formatCurrency(m.gross_revenue, currency)}</td>
                          <td className="mono" style={{ color: m.net_profit > 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>{formatCurrency(m.net_profit, currency)}</td>
                          <td className="mono" style={{ color: 'var(--text-muted)' }}>{formatCurrency(m.fees, currency)}</td>
                          <td><span className={`badge ${parseFloat(margin) > 30 ? 'badge-green' : parseFloat(margin) > 10 ? 'badge-yellow' : 'badge-red'}`}>{margin}%</span></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              ) : <div className="empty-state"><p>No monthly data yet</p></div>}
            </div>

            {/* Sync log */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}>SYNC HISTORY</h3>
              </div>
              {syncLog.length > 0 ? (
                <table className="data-table">
                  <thead><tr><th>Type</th><th>Status</th><th>Items</th><th>Date</th><th>Error</th></tr></thead>
                  <tbody>
                    {syncLog.map(log => (
                      <tr key={log.id} style={{ cursor: 'default' }}>
                        <td className="mono" style={{ fontSize: 12 }}>{log.sync_type}</td>
                        <td><span className={`badge ${log.status === 'success' ? 'badge-green' : 'badge-red'}`}>{log.status}</span></td>
                        <td className="mono">{log.items_synced || 0}</td>
                        <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(log.created_at * 1000).toLocaleString('en-GB')}</td>
                        <td style={{ fontSize: 11, color: 'var(--red)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.error_message || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <div className="empty-state" style={{ padding: '30px 0' }}><p>No syncs yet</p></div>}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
