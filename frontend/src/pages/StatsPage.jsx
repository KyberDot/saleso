import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from 'recharts'
import api from '../utils/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { formatCurrency, formatNumber } from '../utils/format'

const ChartTip = ({ active, payload, label, currency }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--bg-card2)', border: '1px solid var(--border-light)', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 6, fontFamily: 'var(--font-mono)' }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color, display: 'flex', gap: 12, justifyContent: 'space-between' }}>
          <span>{p.name}</span>
          <span style={{ fontWeight: 700 }}>
            {['gross_revenue','net_profit','fees'].includes(p.dataKey) ? formatCurrency(p.value, currency) : formatNumber(p.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function StatsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [monthly, setMonthly] = useState([])
  const [syncLog, setSyncLog] = useState([])
  const [loading, setLoading] = useState(true)
  const currency = user?.default_currency || 'GBP'

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [monthRes, logRes] = await Promise.all([
          api.get('/api/stats/monthly'),
          api.get('/api/stats/sync-log'),
        ])
        // Reverse so oldest month is left on chart
        setMonthly([...(monthRes.data.monthly || [])].reverse())
        setSyncLog(logRes.data.logs || [])
      } catch { toast('Failed to load stats', 'error') }
      finally { setLoading(false) }
    }
    load()
  }, [])

  // Totals
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

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 style={{ fontSize: 18, marginBottom: 2 }}>Analytics</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Monthly breakdown — all time</p>
        </div>
      </div>

      <div className="page-body">
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}><span className="spinner" style={{ width: 32, height: 32 }} /></div>
        ) : (
          <>
            {/* Totals */}
            <div className="stats-grid" style={{ marginBottom: 24 }}>
              {[
                { label: 'All-Time Revenue', value: formatCurrency(totals.gross_revenue, currency), accent: true },
                { label: 'All-Time Net Profit', value: formatCurrency(totals.net_profit, currency), color: totals.net_profit > 0 ? 'var(--green)' : 'var(--red)' },
                { label: 'Total Orders', value: formatNumber(totals.orders) },
                { label: 'Total Items Sold', value: formatNumber(totals.items_sold) },
                { label: 'Total eBay Fees', value: formatCurrency(totals.fees, currency) },
                { label: 'Best Month', value: bestMonth ? bestMonth.month : '—', sub: bestMonth ? formatCurrency(bestMonth.gross_revenue, currency) : '' },
              ].map(s => (
                <div key={s.label} className="stat-card" style={{ borderColor: s.accent ? 'var(--accent)' : undefined }}>
                  <div className="stat-label">{s.label}</div>
                  <div className="stat-value" style={{ color: s.color || (s.accent ? 'var(--accent)' : undefined), fontSize: 20 }}>{s.value}</div>
                  {s.sub && <div className="stat-sub">{s.sub}</div>}
                </div>
              ))}
            </div>

            {/* Revenue chart */}
            <div className="card" style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 12, fontFamily: 'var(--font-mono)', marginBottom: 20 }}>MONTHLY REVENUE & PROFIT</h3>
              {monthly.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={monthly} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => formatCurrency(v, currency)} />
                    <Tooltip content={<ChartTip currency={currency} />} />
                    <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-muted)' }} />
                    <Bar dataKey="gross_revenue" name="Revenue" fill="var(--accent)" radius={[4,4,0,0]} opacity={0.9} />
                    <Bar dataKey="net_profit" name="Net Profit" fill="var(--green)" radius={[4,4,0,0]} opacity={0.9} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state"><p>No data yet</p></div>
              )}
            </div>

            {/* Orders & items chart */}
            <div className="card" style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 12, fontFamily: 'var(--font-mono)', marginBottom: 20 }}>MONTHLY ORDERS & ITEMS SOLD</h3>
              {monthly.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={monthly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} />
                    <Tooltip content={<ChartTip currency={currency} />} />
                    <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-muted)' }} />
                    <Line type="monotone" dataKey="orders" name="Orders" stroke="var(--accent)" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="items_sold" name="Items Sold" stroke="var(--blue)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state"><p>No data yet</p></div>
              )}
            </div>

            {/* Monthly table */}
            <div className="card" style={{ marginBottom: 20, padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}>MONTHLY BREAKDOWN</h3>
              </div>
              {monthly.length > 0 ? (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Orders</th>
                      <th>Items</th>
                      <th>Revenue</th>
                      <th>Net Profit</th>
                      <th>Fees</th>
                      <th>Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...monthly].reverse().map(m => {
                      const margin = m.gross_revenue > 0 ? ((m.net_profit / m.gross_revenue) * 100).toFixed(1) : 0
                      return (
                        <tr key={m.month} style={{ cursor: 'default' }}>
                          <td className="mono" style={{ fontWeight: 700 }}>{m.month}</td>
                          <td className="mono">{formatNumber(m.orders)}</td>
                          <td className="mono">{formatNumber(m.items_sold)}</td>
                          <td className="mono" style={{ color: 'var(--accent)', fontWeight: 700 }}>{formatCurrency(m.gross_revenue, currency)}</td>
                          <td className="mono" style={{ color: m.net_profit > 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>{formatCurrency(m.net_profit, currency)}</td>
                          <td className="mono" style={{ color: 'var(--text-muted)' }}>{formatCurrency(m.fees, currency)}</td>
                          <td>
                            <span className={`badge ${parseFloat(margin) > 30 ? 'badge-green' : parseFloat(margin) > 10 ? 'badge-yellow' : 'badge-red'}`}>
                              {margin}%
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="empty-state"><p>No monthly data yet — sync your eBay account</p></div>
              )}
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
              ) : (
                <div className="empty-state" style={{ padding: '30px 0' }}><p>No syncs yet</p></div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
