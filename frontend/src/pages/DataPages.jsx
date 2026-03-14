import { useState, useEffect, useCallback } from 'react'
import api from '../utils/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { formatCurrency, formatDateTime, formatDate, statusBadgeClass } from '../utils/format'
import SyncButton from '../components/SyncButton'

const PAGE = 50

// ── SALES ────────────────────────────────────────────────────────────────────

export function SalesPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [sales, setSales] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortField, setSortField] = useState('sale_date')
  const [sortDir, setSortDir] = useState('desc')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const currency = user?.default_currency || 'GBP'

  const load = useCallback(async (p = 0, q = '', from = dateFrom, to = dateTo, sf = sortField, sd = sortDir) => {
    setLoading(true)
    try {
      const params = { limit: PAGE, offset: p * PAGE, search: q || undefined, sort: sf, dir: sd }
      if (from) params.from = new Date(from).getTime()
      if (to) params.to = new Date(to + 'T23:59:59').getTime()
      const res = await api.get('/api/sales', { params })
      setSales(res.data.sales); setTotal(res.data.total)
    } catch { toast('Failed to load sales', 'error') }
    finally { setLoading(false) }
  }, [dateFrom, dateTo, sortField, sortDir])

  useEffect(() => { load() }, [])

  const handleSearch = (e) => { setSearch(e.target.value); setPage(0); load(0, e.target.value) }

  const toggleSort = (field) => {
    const newDir = sortField === field && sortDir === 'desc' ? 'asc' : 'desc'
    setSortField(field); setSortDir(newDir); setPage(0)
    load(0, search, dateFrom, dateTo, field, newDir)
  }

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <span style={{ opacity: 0.3, fontSize: 10 }}>⇅</span>
    return <span style={{ fontSize: 10, color: 'var(--accent)' }}>{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  const totalPages = Math.ceil(total / PAGE)

  const handleExport = () => {
    const params = new URLSearchParams()
    if (dateFrom) params.set('from', new Date(dateFrom).getTime())
    if (dateTo) params.set('to', new Date(dateTo + 'T23:59:59').getTime())
    window.location.href = `/api/sales/export/csv?${params.toString()}`
  }

  return (
    <div>
      <div className="page-header">
        <div><h2 style={{ fontSize: 18, marginBottom: 2 }}>💰 Sales</h2><p style={{ color: 'var(--text-muted)', fontSize: 12 }}>{total} transactions</p></div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-bar" style={{ width: 200 }}>
            <span className="search-icon">🔍</span>
            <input placeholder="SKU, order, buyer…" value={search} onChange={handleSearch} />
          </div>
          {/* From box */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 10px' }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>FROM</span>
            <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(0); load(0, search, e.target.value, dateTo) }}
              style={{ width: 120, background: 'transparent', border: 'none', fontSize: 12, color: 'var(--text)', outline: 'none', colorScheme: 'dark', cursor: 'pointer' }} />
            {dateFrom && <button onClick={() => { setDateFrom(''); load(0, search, '', dateTo) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, lineHeight: 1, padding: 0 }}>✕</button>}
          </div>
          {/* To box */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 10px' }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>TO</span>
            <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(0); load(0, search, dateFrom, e.target.value) }}
              style={{ width: 120, background: 'transparent', border: 'none', fontSize: 12, color: 'var(--text)', outline: 'none', colorScheme: 'dark', cursor: 'pointer' }} />
            {dateTo && <button onClick={() => { setDateTo(''); load(0, search, dateFrom, '') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, lineHeight: 1, padding: 0 }}>✕</button>}
          </div>
          <button className="btn btn-secondary btn-sm" onClick={handleExport} title="Export CSV">📥</button>
          <SyncButton onSync={() => load(0, search)} />
        </div>
      </div>

      <div className="page-body">
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? <div style={{ padding: 40, textAlign: 'center' }}><span className="spinner" style={{ width: 28, height: 28 }} /></div>
          : sales.length === 0 ? <div className="empty-state"><div className="empty-icon">💰</div><h3>No sales found</h3></div>
          : <>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Item</th>
                    <th>SKU</th>
                    <th onClick={() => toggleSort('quantity')} style={{ cursor: 'pointer', userSelect: 'none' }}>Qty <SortIcon field="quantity" /></th>
                    <th onClick={() => toggleSort('total_price')} style={{ cursor: 'pointer', userSelect: 'none' }}>Total <SortIcon field="total_price" /></th>
                    <th onClick={() => toggleSort('net_profit')} style={{ cursor: 'pointer', userSelect: 'none' }}>Net <SortIcon field="net_profit" /></th>
                    <th>Ad Cost</th>
                    <th onClick={() => toggleSort('buyer_username')} style={{ cursor: 'pointer', userSelect: 'none' }}>Buyer <SortIcon field="buyer_username" /></th>
                    <th onClick={() => toggleSort('sale_date')} style={{ cursor: 'pointer', userSelect: 'none' }}>Date <SortIcon field="sale_date" /></th>
                    <th onClick={() => toggleSort('payment_status')} style={{ cursor: 'pointer', userSelect: 'none' }}>Status <SortIcon field="payment_status" /></th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map(sale => (
                    <tr key={sale.id} onClick={() => setSelected(sale)}>
                      <td><span className="mono" style={{ fontSize: 10, color: 'var(--accent)' }}>{sale.order_id?.slice(0, 14)}…</span></td>
                      <td style={{ maxWidth: 180 }}>
                        <div style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sale.item_title || '—'}</div>
                        {sale.item_id && <div className="mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>#{sale.item_id}</div>}
                      </td>
                      <td><span className="mono" style={{ fontSize: 11, color: 'var(--accent)', background: 'var(--bg-card2)', padding: '2px 6px', borderRadius: 4 }}>{sale.sku || sale.custom_label || '—'}</span></td>
                      <td className="mono">{sale.quantity}</td>
                      <td className="mono" style={{ fontWeight: 700 }}>{formatCurrency(sale.display_price || sale.total_price, currency)}</td>
                      <td className="mono" style={{ color: (sale.display_net || sale.net_profit) > 0 ? 'var(--green)' : 'var(--red)', fontSize: 12 }}>{formatCurrency(sale.display_net || sale.net_profit, currency)}</td>
                      <td className="mono" style={{ fontSize: 11, color: sale.ad_rate_cost > 0 ? 'var(--red)' : 'var(--text-muted)' }}>{sale.ad_rate_cost > 0 ? formatCurrency(sale.ad_rate_cost, currency) : '—'}</td>
                      <td style={{ fontSize: 12 }}>{sale.buyer_username || '—'}</td>
                      <td style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{formatDateTime(sale.sale_date)}</td>
                      <td><span className={`badge ${statusBadgeClass(sale.payment_status)}`}>{sale.payment_status || '—'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)' }}>
                <span>Showing {page * PAGE + 1}–{Math.min((page+1)*PAGE, total)} of {total}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-sm btn-secondary" onClick={() => { const p=page-1; setPage(p); load(p,search) }} disabled={page===0}>← Prev</button>
                  <button className="btn btn-sm btn-secondary" onClick={() => { const p=page+1; setPage(p); load(p,search) }} disabled={page>=totalPages-1}>Next →</button>
                </div>
              </div>
            )}
          </>}
        </div>
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>ORDER DETAIL</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div className="modal-body">
              {[
                ['Order ID', selected.order_id], ['Item ID', selected.item_id], ['Title', selected.item_title],
                ['SKU / Code', selected.sku || selected.custom_label], ['Quantity', selected.quantity],
                ['Total', formatCurrency(selected.display_price || selected.total_price, currency)],
                ['eBay Fees', formatCurrency(selected.ebay_fees, currency)],
                ['Postage', formatCurrency(selected.postage_cost, currency)],
                ['Net Profit', formatCurrency(selected.display_net || selected.net_profit, currency)],
                ['Ad Rate Cost', selected.ad_rate_cost > 0 ? formatCurrency(selected.ad_rate_cost, currency) : null],
                ['Item Cost (COGS)', selected.item_cost > 0 ? formatCurrency(selected.item_cost, currency) : null],
                ['Buyer', selected.buyer_username], ['Country', selected.buyer_country],
                ['Date', formatDateTime(selected.sale_date)], ['Payment', selected.payment_status],
                ['Shipping', selected.shipping_status], ['Tracking', selected.tracking_number],
              ].filter(([,v]) => v).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13, gap: 16 }}>
                  <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{k}</span>
                  <span style={{ fontFamily: ['Order ID','Item ID','SKU / Code','Tracking'].includes(k) ? 'var(--font-mono)' : undefined, color: k === 'Net Profit' ? ((selected.display_net||selected.net_profit) > 0 ? 'var(--green)' : 'var(--red)') : k === 'Total' ? 'var(--accent)' : undefined, fontWeight: ['Total','Net Profit'].includes(k) ? 700 : undefined, textAlign: 'right', wordBreak: 'break-all' }}>{String(v)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── ORDERS ────────────────────────────────────────────────────────────────────

export function OrdersPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [orders, setOrders] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const currency = user?.default_currency || 'GBP'

  const load = useCallback(async (p = 0, q = '') => {
    setLoading(true)
    try {
      const res = await api.get('/api/orders', { params: { limit: 30, offset: p * 30, search: q || undefined } })
      setOrders(res.data.orders); setTotal(res.data.total)
    } catch { toast('Failed to load orders', 'error') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [])
  const handleSearch = (e) => { setSearch(e.target.value); setPage(0); load(0, e.target.value) }

  return (
    <div>
      <div className="page-header">
        <div><h2 style={{ fontSize: 18, marginBottom: 2 }}>🗂️ Orders</h2><p style={{ color: 'var(--text-muted)', fontSize: 12 }}>{total} orders</p></div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="search-bar" style={{ width: 260 }}>
            <span className="search-icon">🔍</span>
            <input placeholder="Order ID, SKU, buyer…" value={search} onChange={handleSearch} />
          </div>
          <SyncButton onSync={() => load(0, search)} />
        </div>
      </div>
      <div className="page-body">
        <div className="card" style={{ padding: 0 }}>
          {loading ? <div style={{ padding: 40, textAlign: 'center' }}><span className="spinner" style={{ width: 28, height: 28 }} /></div>
          : orders.length === 0 ? <div className="empty-state"><div className="empty-icon">🗂️</div><h3>No orders found</h3></div>
          : <>
            {orders.map(order => (
              <div key={order.order_id} style={{ borderBottom: '1px solid var(--border)' }}>
                <div onClick={() => setExpanded(expanded === order.order_id ? null : order.order_id)}
                  style={{ display: 'grid', gridTemplateColumns: '1fr 130px 110px 110px 120px 50px', padding: '14px 16px', cursor: 'pointer', alignItems: 'center', gap: 12, transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background='var(--bg-card2)'}
                  onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                  <div>
                    <div className="mono" style={{ fontSize: 11, color: 'var(--accent)', marginBottom: 2 }}>{order.order_id}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{order.buyer_username} · {order.buyer_country} · {order.line_items} item{order.line_items > 1 ? 's' : ''}</div>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDateTime(order.sale_date)}</div>
                  <div className="mono" style={{ fontWeight: 700 }}>{formatCurrency(order.total_price, currency)}</div>
                  <div className="mono" style={{ fontSize: 12, color: order.net_profit > 0 ? 'var(--green)' : 'var(--red)' }}>{formatCurrency(order.net_profit, currency)}</div>
                  <div><span className={`badge ${statusBadgeClass(order.shipping_status)}`}>{order.shipping_status || '—'}</span></div>
                  <div style={{ color: 'var(--text-muted)', textAlign: 'right' }}>{expanded === order.order_id ? '▲' : '▼'}</div>
                </div>
                {expanded === order.order_id && (
                  <div style={{ background: 'var(--bg-card2)', borderTop: '1px solid var(--border)', padding: '0 16px 12px' }}>
                    {order.tracking_number && (
                      <div style={{ padding: '10px 0 8px', borderBottom: '1px solid var(--border)', marginBottom: 8, display: 'flex', gap: 12 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tracking:</span>
                        <span className="mono" style={{ fontSize: 12, color: 'var(--accent)' }}>{order.tracking_number}</span>
                      </div>
                    )}
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
                      <thead><tr>{['Title','Item ID','SKU / Code','Qty','Unit','Total'].map(h => <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontWeight: 700, textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>{h}</th>)}</tr></thead>
                      <tbody>
                        {(order.lineItems||[]).map((li, i) => (
                          <tr key={i}>
                            <td style={{ padding: '8px 10px', fontSize: 12 }}>{li.item_title || '—'}</td>
                            <td className="mono" style={{ padding: '8px 10px', fontSize: 11, color: 'var(--text-muted)' }}>{li.item_id || '—'}</td>
                            <td style={{ padding: '8px 10px' }}><span className="mono" style={{ fontSize: 11, background: 'var(--bg-card)', padding: '2px 6px', borderRadius: 4, color: 'var(--accent)' }}>{li.sku || li.custom_label || '—'}</span></td>
                            <td className="mono" style={{ padding: '8px 10px', fontSize: 12 }}>{li.quantity}</td>
                            <td className="mono" style={{ padding: '8px 10px', fontSize: 12 }}>{formatCurrency(li.sale_price, currency)}</td>
                            <td className="mono" style={{ padding: '8px 10px', fontSize: 12, fontWeight: 700 }}>{formatCurrency(li.total_price, currency)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
            {Math.ceil(total / 30) > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)' }}>
                <span>Showing {page * 30 + 1}–{Math.min((page+1)*30, total)} of {total}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-sm btn-secondary" onClick={() => { const p=page-1; setPage(p); load(p,search) }} disabled={page===0}>← Prev</button>
                  <button className="btn btn-sm btn-secondary" onClick={() => { const p=page+1; setPage(p); load(p,search) }} disabled={page>=Math.ceil(total/30)-1}>Next →</button>
                </div>
              </div>
            )}
          </>}
        </div>
      </div>
    </div>
  )
}

// ── INVENTORY ─────────────────────────────────────────────────────────────────

export function InventoryPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)
  const [edit, setEdit] = useState(null)
  const [sortField, setSortField] = useState('updated_at')
  const [sortDir, setSortDir] = useState('desc')
  const [stockFilter, setStockFilter] = useState('in') // 'in' | 'out'
  const currency = user?.default_currency || 'GBP'

  const load = useCallback(async (q = '', sf = sortField, sd = sortDir) => {
    setLoading(true)
    try {
      const res = await api.get('/api/inventory', { params: { search: q || undefined, limit: 200, sort: sf, dir: sd } })
      setItems(res.data.items || [])
      setTotal(res.data.total || 0)
    } catch (err) {
      toast('Failed to load inventory: ' + (err.response?.data?.error || err.message), 'error')
    }
    finally { setLoading(false) }
  }, [sortField, sortDir])

  useEffect(() => { load() }, [])

  const toggleSort = (field) => {
    const newDir = sortField === field && sortDir === 'desc' ? 'asc' : 'desc'
    setSortField(field); setSortDir(newDir)
    load(search, field, newDir)
  }

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <span style={{ opacity: 0.3, fontSize: 10 }}>⇅</span>
    return <span style={{ fontSize: 10, color: 'var(--accent)' }}>{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  const openDetail = async (item) => {
    setSelected(item); setDetail(null); setEdit(null)
    try {
      const res = await api.get(`/api/inventory/${item.id}`)
      setDetail(res.data)
    } catch {}
  }

  const saveEdit = async () => {
    await api.patch(`/api/inventory/${edit.id}`, {
      notes: edit.notes, tags: edit.tags,
      cost_price: edit.cost_price ? parseFloat(edit.cost_price) : undefined,
      quantity_available: edit.quantity_available != null ? parseInt(edit.quantity_available) : undefined,
      custom_label: edit.custom_label,
      rate_markup: edit.rate_markup != null ? parseFloat(edit.rate_markup) : undefined,
      shipping_cost: edit.shipping_cost != null ? parseFloat(edit.shipping_cost) : undefined,
    })
    toast('Saved', 'success'); setEdit(null); setSelected(null); load(search)
  }

  const margin = (item) => {
    if (!item.cost_price || !item.price) return null
    return ((item.price - item.cost_price) / item.price * 100).toFixed(1)
  }

  // Filter by stock status
  const filteredItems = items.filter(item => {
    const qty = item.quantity_available ?? null
    if (stockFilter === 'in') return qty === null || qty > 0
    return qty !== null && qty <= 0
  })

  const inCount = items.filter(i => (i.quantity_available ?? 1) > 0).length
  const outCount = items.filter(i => i.quantity_available !== null && i.quantity_available <= 0).length

  const cols = [
    { label: 'Stock', field: 'quantity_available' },
    { label: 'Price', field: 'price' },
    { label: 'Cost', field: 'cost_price' },
    { label: 'Margin', field: null },
    { label: 'Sold 30d', field: null },
    { label: 'Rev 30d', field: null },
    { label: 'Status', field: 'listing_status' },
  ]

  return (
    <div>
      <div className="page-header">
        <div><h2 style={{ fontSize: 18, marginBottom: 2 }}>📦 Inventory</h2><p style={{ color: 'var(--text-muted)', fontSize: 12 }}>{total} tracked items</p></div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div className="search-bar" style={{ width: 240 }}>
            <span className="search-icon">🔍</span>
            <input placeholder="Title, SKU, tag…" value={search} onChange={e => { setSearch(e.target.value); load(e.target.value) }} />
          </div>
          <SyncButton onSync={() => load(search)} />
        </div>
      </div>

      <div className="page-body">
        {/* Stock switcher */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {[
            { key: 'in', label: `✅ In Stock`, count: inCount },
            { key: 'out', label: `❌ Out of Stock`, count: outCount },
          ].map(opt => (
            <button key={opt.key} onClick={() => setStockFilter(opt.key)}
              className="btn btn-sm"
              style={{
                background: stockFilter === opt.key ? 'var(--accent)' : 'var(--bg-card)',
                color: stockFilter === opt.key ? '#000' : 'var(--text-muted)',
                border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
              {opt.label}
              <span style={{ background: stockFilter === opt.key ? 'rgba(0,0,0,0.15)' : 'var(--bg-card2)', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
                {opt.count}
              </span>
            </button>
          ))}
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {loading
            ? <div style={{ padding: 40, textAlign: 'center' }}><span className="spinner" style={{ width: 28, height: 28 }} /></div>
            : filteredItems.length === 0
              ? <div className="empty-state"><div className="empty-icon">📦</div><h3>{stockFilter === 'out' ? 'No out of stock items' : 'No inventory yet'}</h3><p>{stockFilter === 'in' ? 'Sync your eBay account to pull listings' : 'All items have stock'}</p></div>
              : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>SKU</th>
                        {cols.map(c => (
                          <th key={c.label}
                            onClick={c.field ? () => toggleSort(c.field) : undefined}
                            style={{ cursor: c.field ? 'pointer' : 'default', userSelect: 'none', whiteSpace: 'nowrap' }}>
                            {c.label} {c.field && <SortIcon field={c.field} />}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredItems.map(item => {
                        const m = margin(item)
                        const qty = item.quantity_available
                        const price = item.display_price || item.price
                        return (
                          <tr key={item.id} onClick={() => openDetail(item)}>
                            <td style={{ maxWidth: 220 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                {item.image_url
                                  ? <img src={item.image_url} alt="" style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 6, flexShrink: 0, border: '1px solid var(--border)' }} onError={e => e.target.style.display='none'} />
                                  : <div style={{ width: 32, height: 32, background: 'var(--bg-card2)', borderRadius: 6, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>📦</div>}
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title || item.custom_label || '(No title)'}</div>
                                  <div className="mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>#{item.item_id}</div>
                                </div>
                              </div>
                            </td>
                            <td><span className="mono" style={{ fontSize: 11, background: 'var(--bg-card2)', padding: '2px 7px', borderRadius: 4, color: 'var(--accent)' }}>{item.sku || item.custom_label || '—'}</span></td>
                            <td className="mono" style={{ fontWeight: 600, color: qty === 0 ? 'var(--red)' : qty !== null && qty < 5 ? 'var(--accent)' : 'var(--green)' }}>
                              {qty !== null && qty !== undefined ? qty : '—'}
                            </td>
                            <td className="mono" style={{ fontSize: 12 }}>{price ? formatCurrency(price, currency) : '—'}</td>
                            <td className="mono" style={{ fontSize: 11, color: 'var(--text-dim)' }}>{item.cost_price ? formatCurrency(item.cost_price, currency) : '—'}</td>
                            <td>{m != null ? <span className={`badge ${parseFloat(m) > 30 ? 'badge-green' : parseFloat(m) > 0 ? 'badge-yellow' : 'badge-red'}`}>{m}%</span> : '—'}</td>
                            <td className="mono" style={{ fontWeight: 700, color: item.sold_30d > 0 ? 'var(--text)' : 'var(--text-muted)' }}>{item.sold_30d || 0}</td>
                            <td className="mono" style={{ fontSize: 12 }}>{item.revenue_30d ? formatCurrency(item.revenue_30d, currency) : '—'}</td>
                            <td><span className={`badge ${item.listing_status === 'Active' ? 'badge-green' : 'badge-yellow'}`}>{item.listing_status || 'Active'}</span></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )
          }
        </div>
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => { setSelected(null); setEdit(null) }}>
          <div className="modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                {selected.image_url && <img src={selected.image_url} alt="" style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)', flexShrink: 0 }} onError={e => e.target.style.display='none'} />}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected.title || '(No title)'}</div>
                  <div className="mono" style={{ fontSize: 10, color: 'var(--accent)' }}>{selected.item_id}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setEdit(edit ? null : { ...selected })}>{edit ? 'Cancel' : '✏ Edit'}</button>
                <button className="btn btn-ghost btn-sm" onClick={() => { setSelected(null); setEdit(null) }}>✕</button>
              </div>
            </div>
            <div className="modal-body">
              {edit ? (
                <>
                  {[
                    { label: 'Custom Label / Code', key: 'custom_label' },
                    { label: 'Cost Price', key: 'cost_price', type: 'number', hint: 'Your purchase cost' },
                    { label: 'Stock Qty', key: 'quantity_available', type: 'number' },
                    { label: 'Rate Markup %', key: 'rate_markup', type: 'number', hint: 'Added % on top of sale price for this item' },
                    { label: `Shipping Cost (${currency})`, key: 'shipping_cost', type: 'number', hint: 'Used in profit calculations instead of eBay postage' },
                    { label: 'Tags (comma separated)', key: 'tags' },
                  ].map(f => (
                    <div key={f.key} className="form-group">
                      <label>{f.label}</label>
                      <input type={f.type || 'text'} value={edit[f.key] ?? ''} onChange={e => setEdit(x => ({ ...x, [f.key]: e.target.value }))} />
                      {f.hint && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{f.hint}</p>}
                    </div>
                  ))}
                  <div className="form-group">
                    <label>Notes</label>
                    <textarea rows={3} value={edit.notes || ''} onChange={e => setEdit(x => ({ ...x, notes: e.target.value }))} />
                  </div>
                  <button className="btn btn-primary" onClick={saveEdit}>Save Changes</button>
                </>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[
                    ['SKU', selected.sku],
                    ['Custom Label', selected.custom_label],
                    ['Price', selected.display_price ? formatCurrency(selected.display_price, currency) : selected.price ? formatCurrency(selected.price, currency) : null],
                    ['Cost', selected.cost_price ? formatCurrency(selected.cost_price, currency) : null],
                    ['Rate Markup', selected.rate_markup > 0 ? selected.rate_markup + '%' : null],
                    ['Shipping Override', selected.shipping_cost > 0 ? formatCurrency(selected.shipping_cost, currency) : null],
                    ['Stock', selected.quantity_available],
                    ['Sold 30d', selected.sold_30d],
                    ['Condition', selected.condition],
                    ['Tags', selected.tags],
                    ['Notes', selected.notes],
                  ].filter(([,v]) => v != null && v !== '').map(([k,v]) => (
                    <div key={k} style={{ background: 'var(--bg-card2)', borderRadius: 8, padding: '10px 12px' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>{k.toUpperCase()}</div>
                      <div style={{ fontSize: 13 }}>{String(v)}</div>
                    </div>
                  ))}
                </div>
              )}
              {detail?.sales?.length > 0 && (
                <>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 16, marginBottom: 8 }}>SALES HISTORY</div>
                  <table className="data-table" style={{ fontSize: 11 }}>
                    <thead><tr><th>Order</th><th>Date</th><th>Qty</th><th>Total</th><th>Buyer</th></tr></thead>
                    <tbody>
                      {detail.sales.map(s => (
                        <tr key={s.id}>
                          <td className="mono" style={{ fontSize: 10, color: 'var(--accent)' }}>{s.order_id?.slice(0, 14)}…</td>
                          <td>{formatDate(s.sale_date)}</td>
                          <td className="mono">{s.quantity}</td>
                          <td className="mono" style={{ fontWeight: 700 }}>{formatCurrency(s.total_price, currency)}</td>
                          <td>{s.buyer_username}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
