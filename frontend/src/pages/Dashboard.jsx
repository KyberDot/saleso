import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import api from '../utils/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { formatCurrency, formatNumber, formatDate } from '../utils/format'
import SyncButton from '../components/SyncButton'

const DAYS = [0, 7, 14, 30, 90]

const ChartTip = ({ active, payload, label, currency }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--bg-card2)', border: '1px solid var(--border-light)', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 6, fontFamily: 'var(--font-mono)' }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color, display: 'flex', gap: 8 }}>
          <span>{p.name}</span>
          <span style={{ fontWeight: 700, marginLeft: 'auto' }}>
            {p.dataKey === 'revenue' ? formatCurrency(p.value, currency) : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [days, setDays] = useState(30)
  const [data, setData] = useState({ summary: null, dailySales: [], topItems: [] })
  const [recentSales, setRecentSales] = useState([])
  const [loading, setLoading] = useState(true)
  const currency = user?.default_currency || 'GBP'

  // Get first name from full_name, fallback to username
  const firstName = user?.full_name
    ? user.full_name.trim().split(' ')[0]
    : user?.username || ''

  const load = async () => {
    setLoading(true)
    try {
      const daysParam = days === 0 ? 1 : days
      const todayParam = days === 0 ? 1 : 0
      const [sumRes, salesRes] = await Promise.all([
        api.get(`/api/sales/summary?days=${daysParam}&today=${todayParam}`),
        api.get('/api/sales?limit=6'),
      ])
      setData(sumRes.data)
      setRecentSales(salesRes.data.sales || [])
    } catch { toast('Failed to load dashboard', 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [days])

  const s = data.summary || {}

  // Format X-axis labels — show Mon/Day only, no year
  const formatXAxis = (val) => {
    if (!val) return ''
    // val is like "2026-03-14" or "Mar 14"
    try {
      const d = new Date(val)
      if (isNaN(d)) return val
      return d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
    } catch { return val }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 style={{ fontSize: 18, marginBottom: 2 }}>🏠 Dashboard</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>
            Welcome back, {firstName}!
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 2, background: 'var(--bg-card2)', borderRadius: 8, padding: 3, border: '1px solid var(--border)' }}>
            {DAYS.map(d => (
              <button key={d} className="btn btn-sm" onClick={() => setDays(d)}
                style={{ background: days === d ? 'var(--accent)' : 'transparent', color: days === d ? '#000' : 'var(--text-muted)', border: 'none', fontFamily: 'var(--font-mono)' }}>
                {d === 0 ? 'Today' : d + 'd'}
              </button>
            ))}
          </div>
          <SyncButton onSync={load} />
        </div>
      </div>

      <div className="page-body">
        <div className="stats-grid" style={{ marginBottom: 24 }}>
          {[
            { label: 'Gross Revenue', value: formatCurrency(s.gross_revenue, currency), sub: `${formatNumber(s.total_orders)} orders`, accent: true },
            { label: 'Net Profit', value: formatCurrency(s.net_profit, currency), sub: 'After fees & postage', color: s.net_profit > 0 ? 'var(--green)' : 'var(--red)' },
            { label: 'Items Sold', value: formatNumber(s.total_items_sold), sub: `Avg ${formatCurrency(s.avg_order_value, currency)}` },
            { label: 'eBay Fees', value: formatCurrency(s.total_fees, currency), sub: 'Est. 10%' },
            { label: 'Unique Buyers', value: formatNumber(s.unique_buyers), sub: days === 0 ? 'Today' : `Last ${days} days` },
          ].map(stat => (
            <div key={stat.label} className="stat-card" style={{ borderColor: stat.accent ? 'var(--accent)' : undefined }}>
              <div className="stat-label">{stat.label}</div>
              <div className="stat-value" style={{ color: stat.color || (stat.accent ? 'var(--accent)' : undefined) }}>
                {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : stat.value}
              </div>
              <div className="stat-sub">{stat.sub}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, marginBottom: 24 }}>
          {/* Revenue chart */}
          <div className="card">
            <h3 style={{ fontSize: 12, fontFamily: 'var(--font-mono)', marginBottom: 20 }}>
              REVENUE — {days === 0 ? 'TODAY' : `LAST ${days} DAYS`}
            </h3>
            {data.dailySales?.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={data.dailySales}>
                  <defs>
                    <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="day"
                    tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatXAxis}
                    interval="preserveStartEnd"
                  />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => formatCurrency(v, currency)} />
                  <Tooltip content={<ChartTip currency={currency} />} />
                  <Area type="monotone" dataKey="revenue" name="Revenue" stroke="var(--accent)" strokeWidth={2} fill="url(#rg)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state" style={{ padding: '40px 0' }}>
                <p>No data yet — sync your eBay account</p>
              </div>
            )}
          </div>

          {/* Top sellers — first 4 visible, rest scrollable */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}>TOP SELLERS</h3>
              <Link to="/inventory" style={{ fontSize: 11, color: 'var(--accent)', textDecoration: 'none' }}>All →</Link>
            </div>
            {data.topItems?.length > 0 ? (
              <div style={{ overflowY: 'auto', maxHeight: 148 }}>
                {data.topItems.map((item, i) => (
                  <TopSellerRow key={i} item={item} i={i} currency={currency} />
                ))}
              </div>
            ) : <div className="empty-state" style={{ padding: '30px 0' }}><p>No items yet</p></div>}
          </div>
        </div>

        {/* Recent sales */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}>RECENT SALES</h3>
            <Link to="/sales" style={{ fontSize: 11, color: 'var(--accent)', textDecoration: 'none' }}>View all →</Link>
          </div>
          {recentSales.length > 0 ? (
            <table className="data-table">
              <thead><tr><th>Item</th><th>SKU / Code</th><th>Buyer</th><th>Date</th><th>Total</th><th>Net</th></tr></thead>
              <tbody>
                {recentSales.map(sale => (
                  <tr key={sale.id}>
                    <td style={{ maxWidth: 200 }}><div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sale.item_title || '—'}</div></td>
                    <td><span className="mono" style={{ fontSize: 11, color: 'var(--accent)', background: 'var(--bg-card2)', padding: '2px 6px', borderRadius: 4 }}>{sale.sku || sale.custom_label || '—'}</span></td>
                    <td style={{ fontSize: 12 }}>{sale.buyer_username || '—'}</td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDate(sale.sale_date)}</td>
                    <td className="mono" style={{ fontWeight: 700 }}>{formatCurrency(sale.display_price || sale.total_price, currency)}</td>
                    <td className="mono" style={{ color: (sale.display_net || sale.net_profit) > 0 ? 'var(--green)' : 'var(--red)', fontSize: 12 }}>{formatCurrency(sale.display_net || sale.net_profit, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📊</div>
              <h3>No sales yet</h3>
              <p>Connect your eBay account in Settings and click Sync</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TopSellerRow({ item, i, currency }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ width: 20, height: 20, borderRadius: 5, background: i === 0 ? 'var(--accent)' : 'var(--bg-card2)', color: i === 0 ? '#000' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.item_title || item.sku || 'Unknown'}</div>
        {item.sku && <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{item.sku}</div>}
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>{item.total_sold}</div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>sold</div>
      </div>
    </div>
  )
}
