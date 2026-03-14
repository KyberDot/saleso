import { useState, useEffect, useCallback } from 'react'
import api from '../utils/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { formatCurrency, formatDateTime, formatDate, statusBadgeClass } from '../utils/format'
import SyncButton from '../components/SyncButton'

const PAGE = 50

// ── SHARED SORT ICON ─────────────────────────────────────────────────────────
function SortTh({ label, field, sortField, sortDir, onSort, style }) {
  const active = sortField === field
  return (
    <th onClick={field ? () => onSort(field) : undefined}
      style={{ cursor: field ? 'pointer' : 'default', userSelect: 'none', ...style }}>
      {label}{field && <span style={{ marginLeft: 4, opacity: active ? 1 : 0.3, color: active ? 'var(--accent)' : undefined, fontSize: 10 }}>
        {active ? (sortDir === 'asc' ? '↑' : '↓') : '⇅'}
      </span>}
    </th>
  )
}

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

  const load = useCallback(async (p = 0, q = search, from = dateFrom, to = dateTo, sf = sortField, sd = sortDir) => {
    setLoading(true)
    try {
      const params = { limit: PAGE, offset: p * PAGE }
      if (q) params.search = q
      if (sf) { params.sort = sf; params.dir = sd }
      if (from) params.from = new Date(from).getTime()
      if (to) params.to = new Date(to + 'T23:59:59').getTime()
      const res = await api.get('/api/sales', { params })
      setSales(res.data.sales || [])
      setTotal(res.data.total || 0)
    } catch { toast('Failed to load sales', 'error') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [])

  const onSort = (field) => {
    const nd = sortField === field && sortDir === 'desc' ? 'asc' : 'desc'
    setSortField(field); setSortDir(nd); setPage(0); load(0, search, dateFrom, dateTo, field, nd)
  }

  const totalPages = Math.ceil(total / PAGE)

  const handleExport = () => {
    const p = new URLSearchParams()
    if (dateFrom) p.set('from', new Date(dateFrom).getTime())
    if (dateTo) p.set('to', new Date(dateTo + 'T23:59:59').getTime())
    window.location.href = `/api/sales/export/csv?${p.toString()}`
  }

  const sp = { sortField, sortDir, onSort }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 600 }}>💰 Sales</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>{total} transactions</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="search-bar" style={{ width: 200 }}>
            <span className="search-icon">🔍</span>
            <input placeholder="SKU, order, buyer…" value={search} onChange={e => { setSearch(e.target.value); setPage(0); load(0, e.target.value) }} style={{ height: 34 }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '8px 0 0 8px', padding: '6px 10px', borderRight: 'none' }}>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>FROM</span>
              <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(0); load(0, search, e.target.value, dateTo) }}
                style={{ width: 118, background: 'transparent', border: 'none', fontSize: 12, color: 'var(--text)', outline: 'none', colorScheme: 'dark', cursor: 'pointer', padding: 0, boxShadow: 'none' }} />
              {dateFrom && <button onClick={() => { setDateFrom(''); load(0, search, '', dateTo) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12, padding: 0, lineHeight: 1 }}>✕</button>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '0 8px 8px 0', padding: '6px 10px' }}>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>TO</span>
              <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(0); load(0, search, dateFrom, e.target.value) }}
                style={{ width: 118, background: 'transparent', border: 'none', fontSize: 12, color: 'var(--text)', outline: 'none', colorScheme: 'dark', cursor: 'pointer', padding: 0, boxShadow: 'none' }} />
              {dateTo && <button onClick={() => { setDateTo(''); load(0, search, dateFrom, '') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12, padding: 0, lineHeight: 1 }}>✕</button>}
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={handleExport} title="Export CSV" style={{ height: 34, padding: '0 10px' }}>📥</button>
          <SyncButton onSync={() => load(0, search)} />
        </div>
      </div>

      <div className="page-body">
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {loading
            ? <div style={{ padding: 40, textAlign: 'center' }}><span className="spinner" /></div>
            : sales.length === 0
              ? <div className="empty-state"><span className="empty-icon">💰</span><h3>No sales found</h3></div>
              : <>
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: 110 }}>Order ID</th>
                        <th>Item</th>
                        <th style={{ width: 90 }}>SKU</th>
                        <SortTh label="Qty" field="quantity" {...sp} style={{ width: 50 }} />
                        <SortTh label="Total" field="total_price" {...sp} style={{ width: 80 }} />
                        <SortTh label="Net" field="net_profit" {...sp} style={{ width: 80 }} />
                        <th style={{ width: 72 }}>Ad Cost</th>
                        <SortTh label="Buyer" field="buyer_username" {...sp} style={{ width: 110 }} />
                        <SortTh label="Date" field="sale_date" {...sp} style={{ width: 130 }} />
                        <SortTh label="Status" field="payment_status" {...sp} style={{ width: 80 }} />
                      </tr>
                    </thead>
                    <tbody>
                      {sales.map(sale => (
                        <tr key={sale.id} onClick={() => setSelected(sale)}>
                          <td><span className="mono" style={{ fontSize: 10, color: 'var(--accent)' }}>{sale.order_id?.slice(0, 14)}…</span></td>
                          <td style={{ maxWidth: 200 }}>
                            <div style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sale.item_title || '—'}</div>
                            {sale.item_id && <div className="mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>#{sale.item_id}</div>}
                          </td>
                          <td>
                            {(sale.sku || sale.custom_label) ? (
                              <span className="mono" style={{ fontSize: 11, color: 'var(--accent)', background: 'var(--bg-card2)', padding: '2px 6px', borderRadius: 4, whiteSpace: 'nowrap', display: 'inline-block', maxWidth: 86, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {sale.sku || sale.custom_label}
                              </span>
                            ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                          </td>
                          <td className="mono" style={{ fontSize: 12 }}>{sale.quantity}</td>
                          <td className="mono" style={{ fontWeight: 600, fontSize: 12 }}>{formatCurrency(sale.display_price || sale.total_price, currency)}</td>
                          <td className="mono" style={{ color: (sale.display_net ?? sale.net_profit) > 0 ? 'var(--green)' : 'var(--red)', fontSize: 12, fontWeight: 600 }}>{formatCurrency(sale.display_net ?? sale.net_profit, currency)}</td>
                          <td className="mono" style={{ fontSize: 11, color: sale.ad_rate_cost > 0 ? 'var(--red)' : 'var(--text-muted)' }}>{sale.ad_rate_cost > 0 ? formatCurrency(sale.ad_rate_cost, currency) : '—'}</td>
                          <td style={{ fontSize: 12 }}>{sale.buyer_username || '—'}</td>
                          <td style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{formatDateTime(sale.sale_date)}</td>
                          <td><span className={`badge badge-${sale.payment_status === 'PAID' ? 'green' : 'yellow'}`} style={{ fontSize: 10 }}>{sale.payment_status || '—'}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {totalPages > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)' }}>
                    <span>{page * PAGE + 1}–{Math.min((page+1)*PAGE, total)} of {total}</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-sm btn-secondary" onClick={() => { const p=page-1; setPage(p); load(p) }} disabled={page===0}>← Prev</button>
                      <button className="btn btn-sm btn-secondary" onClick={() => { const p=page+1; setPage(p); load(p) }} disabled={page>=totalPages-1}>Next →</button>
                    </div>
                  </div>
                )}
              </>
          }
        </div>
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>ORDER DETAIL</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div className="modal-body">
              {[
                ['Order ID', selected.order_id],
                ['Item', selected.item_title],
                ['SKU', selected.sku || selected.custom_label],
                ['Quantity', selected.quantity],
                ['Sale Total', formatCurrency(selected.display_price || selected.total_price, currency)],
                ['eBay Fees', formatCurrency(selected.ebay_fees, currency)],
                ['Postage', formatCurrency(selected.postage_cost, currency)],
                ['Ad Rate Cost', selected.ad_rate_cost > 0 ? formatCurrency(selected.ad_rate_cost, currency) : null],
                ['Item Cost (COGS)', selected.item_cost > 0 ? formatCurrency(selected.item_cost, currency) : null],
                ['Net Profit', formatCurrency(selected.display_net ?? selected.net_profit, currency)],
                ['Buyer', selected.buyer_username],
                ['Country', selected.buyer_country],
                ['Date', formatDateTime(selected.sale_date)],
                ['Payment', selected.payment_status],
                ['Shipping', selected.shipping_status],
                ['Tracking', selected.tracking_number],
              ].filter(([,v]) => v != null && v !== '' && v !== '—').map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: 13, gap: 16 }}>
                  <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{k}</span>
                  <span style={{
                    fontFamily: ['Order ID','SKU','Tracking'].includes(k) ? 'var(--font-mono)' : undefined,
                    color: k === 'Net Profit' ? ((selected.display_net ?? selected.net_profit) > 0 ? 'var(--green)' : 'var(--red)') : k === 'Sale Total' ? 'var(--accent)' : k === 'Ad Rate Cost' || k === 'Item Cost (COGS)' ? 'var(--red)' : undefined,
                    fontWeight: ['Sale Total','Net Profit'].includes(k) ? 600 : undefined,
                    textAlign: 'right', wordBreak: 'break-all', fontSize: 13
                  }}>{String(v)}</span>
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
      setOrders(res.data.orders || []); setTotal(res.data.total || 0)
    } catch { toast('Failed to load orders', 'error') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [])

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 600 }}>🗂️ Orders</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>{total} orders</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="search-bar" style={{ width: 240 }}>
            <span className="search-icon">🔍</span>
            <input placeholder="Order ID, SKU, buyer…" value={search} onChange={e => { setSearch(e.target.value); setPage(0); load(0, e.target.value) }} style={{ height: 34 }} />
          </div>
          <SyncButton onSync={() => load(0, search)} />
        </div>
      </div>
      <div className="page-body">
        <div className="card" style={{ padding: 0 }}>
          {loading ? <div style={{ padding: 40, textAlign: 'center' }}><span className="spinner" /></div>
          : orders.length === 0 ? <div className="empty-state"><span className="empty-icon">🗂️</span><h3>No orders found</h3></div>
          : orders.map(order => (
            <div key={order.order_id} style={{ borderBottom: '1px solid var(--border)' }}>
              <div onClick={() => setExpanded(expanded === order.order_id ? null : order.order_id)}
                style={{ display: 'grid', gridTemplateColumns: '1fr 130px 100px 100px 110px 30px', padding: '11px 16px', cursor: 'pointer', alignItems: 'center', gap: 12, fontSize: 13 }}
                onMouseEnter={e => e.currentTarget.style.background='var(--bg-card2)'}
                onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                <div>
                  <div className="mono" style={{ fontSize: 11, color: 'var(--accent)', marginBottom: 2 }}>{order.order_id}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{order.buyer_username} · {order.buyer_country} · {order.line_items} item{order.line_items > 1 ? 's' : ''}</div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDateTime(order.sale_date)}</div>
                <div className="mono" style={{ fontWeight: 600, fontSize: 13 }}>{formatCurrency(order.total_price, currency)}</div>
                <div className="mono" style={{ fontSize: 12, color: order.net_profit > 0 ? 'var(--green)' : 'var(--red)' }}>{formatCurrency(order.net_profit, currency)}</div>
                <div><span className={`badge badge-${order.shipping_status === 'FULFILLED' ? 'green' : 'yellow'}`} style={{ fontSize: 10 }}>{order.shipping_status || '—'}</span></div>
                <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>{expanded === order.order_id ? '▲' : '▼'}</div>
              </div>
              {expanded === order.order_id && (
                <div style={{ background: 'var(--bg-card2)', borderTop: '1px solid var(--border)', padding: '0 16px 12px' }}>
                  {order.tracking_number && (
                    <div style={{ padding: '8px 0', borderBottom: '1px solid var(--border)', marginBottom: 8, display: 'flex', gap: 12 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Tracking:</span>
                      <span className="mono" style={{ fontSize: 11, color: 'var(--accent)' }}>{order.tracking_number}</span>
                    </div>
                  )}
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
                    <thead><tr>{['Title','Item ID','SKU','Qty','Unit','Total'].map(h => <th key={h} style={{ padding: '5px 10px', textAlign: 'left', fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--border)' }}>{h}</th>)}</tr></thead>
                    <tbody>
                      {(order.lineItems||[]).map((li, i) => (
                        <tr key={i}>
                          <td style={{ padding: '7px 10px', fontSize: 12 }}>{li.item_title || '—'}</td>
                          <td className="mono" style={{ padding: '7px 10px', fontSize: 11, color: 'var(--text-muted)' }}>{li.item_id || '—'}</td>
                          <td style={{ padding: '7px 10px' }}><span className="mono" style={{ fontSize: 11, background: 'var(--bg-card)', padding: '1px 6px', borderRadius: 4, color: 'var(--accent)' }}>{li.sku || li.custom_label || '—'}</span></td>
                          <td className="mono" style={{ padding: '7px 10px', fontSize: 12 }}>{li.quantity}</td>
                          <td className="mono" style={{ padding: '7px 10px', fontSize: 12 }}>{formatCurrency(li.sale_price, currency)}</td>
                          <td className="mono" style={{ padding: '7px 10px', fontSize: 12, fontWeight: 600 }}>{formatCurrency(li.total_price, currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
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
  const [stockFilter, setStockFilter] = useState('in')
  const currency = user?.default_currency || 'GBP'

  const load = useCallback(async (q = '', sf = sortField, sd = sortDir) => {
    setLoading(true)
    try {
      const res = await api.get('/api/inventory', { params: { search: q || undefined, limit: 500, sort: sf, dir: sd } })
      setItems(res.data.items || [])
      setTotal(res.data.total || 0)
    } catch (err) {
      toast('Failed to load inventory: ' + (err.response?.data?.error || err.message), 'error')
    }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [])

  const onSort = (field) => {
    const nd = sortField === field && sortDir === 'desc' ? 'asc' : 'desc'
    setSortField(field); setSortDir(nd); load(search, field, nd)
  }

  const openDetail = async (item) => {
    setSelected(item); setDetail(null); setEdit(null)
    try { const res = await api.get(`/api/inventory/${item.id}`); setDetail(res.data) } catch {}
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

  const filteredItems = items.filter(item => {
    const qty = item.quantity_available
    // Active = qty is null (unknown) OR qty > 0
    // Inactive = qty is exactly 0
    if (stockFilter === 'in') return qty === null || qty === undefined || qty > 0
    return qty !== null && qty !== undefined && qty === 0
  })

  const inCount = items.filter(i => i.quantity_available === null || i.quantity_available === undefined || i.quantity_available > 0).length
  const outCount = items.filter(i => i.quantity_available !== null && i.quantity_available !== undefined && i.quantity_available === 0).length
  const sp = { sortField, sortDir, onSort }

  const margin = (item) => {
    if (!item.cost_price || !item.price) return null
    return ((item.price - item.cost_price) / item.price * 100).toFixed(1)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 600 }}>📦 Inventory</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>{total} items</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Stock switcher */}
          <div style={{ display: 'flex', background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 20, padding: 3, gap: 2 }}>
            {[
              { key: 'in', label: 'In Stock', count: inCount, dot: '#22c55e' },
              { key: 'out', label: 'Out of Stock', count: outCount, dot: '#ef4444' },
            ].map(opt => {
              const active = stockFilter === opt.key
              return (
                <button key={opt.key} onClick={() => setStockFilter(opt.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '5px 14px', borderRadius: 16, border: 'none', cursor: 'pointer',
                    background: active ? 'var(--bg-card2)' : 'transparent',
                    color: active ? 'var(--text)' : 'var(--text-muted)',
                    fontSize: 12, fontWeight: active ? 600 : 400,
                    transition: 'all 0.15s',
                    boxShadow: active ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
                  }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: opt.dot, display: 'inline-block', opacity: active ? 1 : 0.4, flexShrink: 0 }} />
                  {opt.label}
                </button>
              )
            })}
          </div>
          <div className="search-bar" style={{ width: 220 }}>
            <span className="search-icon">🔍</span>
            <input placeholder="Title, SKU…" value={search} onChange={e => { setSearch(e.target.value); load(e.target.value) }} style={{ height: 34 }} />
          </div>
          <SyncButton onSync={() => load(search)} />
        </div>
      </div>

      <div className="page-body">
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {loading
            ? <div style={{ padding: 40, textAlign: 'center' }}><span className="spinner" /></div>
            : filteredItems.length === 0
              ? <div className="empty-state"><span className="empty-icon">📦</span><h3>{stockFilter === 'out' ? 'No out of stock items' : 'No inventory yet'}</h3></div>
              : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ minWidth: 180 }}>Item</th>
                        <th style={{ width: 90 }}>SKU</th>
                        <SortTh label="Stock" field="quantity_available" {...sp} style={{ width: 64 }} />
                        <SortTh label="Price" field="price" {...sp} style={{ width: 80 }} />
                        <SortTh label="Cost" field="cost_price" {...sp} style={{ width: 80 }} />
                        <th style={{ width: 70 }}>Margin</th>
                        <th style={{ width: 64 }}>Sold 30d</th>
                        <th style={{ width: 80 }}>Rev 30d</th>
                        <SortTh label="Status" field="listing_status" {...sp} style={{ width: 80 }} />
                      </tr>
                    </thead>
                    <tbody>
                      {filteredItems.map(item => {
                        const m = margin(item)
                        const qty = item.quantity_available
                        const price = item.display_price || item.price
                        return (
                          <tr key={item.id} onClick={() => openDetail(item)}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                {item.image_url
                                  ? <img src={item.image_url} alt="" style={{ width: 28, height: 28, objectFit: 'cover', borderRadius: 5, flexShrink: 0, border: '1px solid var(--border)' }} onError={e => e.target.style.display='none'} />
                                  : <div style={{ width: 28, height: 28, background: 'var(--bg-card2)', borderRadius: 5, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>📦</div>
                                }
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{item.title || item.custom_label || '(No title)'}</div>
                                  <div className="mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>#{item.item_id}</div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className="mono" style={{ fontSize: 10, background: 'var(--bg-card2)', padding: '2px 6px', borderRadius: 4, color: 'var(--accent)', whiteSpace: 'nowrap', display: 'inline-block', maxWidth: 86, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {item.sku || item.custom_label || '—'}
                              </span>
                            </td>
                            <td className="mono" style={{ fontWeight: 600, fontSize: 12, color: qty === 0 ? 'var(--red)' : qty !== null && qty < 5 ? 'var(--accent)' : 'var(--green)' }}>
                              {qty !== null && qty !== undefined ? qty : '—'}
                            </td>
                            <td className="mono" style={{ fontSize: 12 }}>{price ? formatCurrency(price, currency) : '—'}</td>
                            <td className="mono" style={{ fontSize: 11, color: 'var(--text-dim)' }}>{item.cost_price ? formatCurrency(item.cost_price, currency) : '—'}</td>
                            <td>{m != null ? <span className={`badge badge-${parseFloat(m) > 30 ? 'green' : parseFloat(m) > 0 ? 'yellow' : 'red'}`} style={{ fontSize: 10 }}>{m}%</span> : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>}</td>
                            <td className="mono" style={{ fontSize: 12, color: item.sold_30d > 0 ? 'var(--text)' : 'var(--text-muted)' }}>{item.sold_30d || 0}</td>
                            <td className="mono" style={{ fontSize: 12 }}>{item.revenue_30d ? formatCurrency(item.revenue_30d, currency) : '—'}</td>
                            <td>{(() => {
                              const isOutOfStock = item.quantity_available !== null && item.quantity_available !== undefined && item.quantity_available === 0
                              if (isOutOfStock) return <span className="badge badge-red" style={{ fontSize: 10 }}>Inactive</span>
                              return <span className="badge badge-green" style={{ fontSize: 10 }}>{item.listing_status || 'Active'}</span>
                            })()}</td>
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

      {/* Detail modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => { setSelected(null); setEdit(null) }}>
          <div className="modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                {selected.image_url && <img src={selected.image_url} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 7, border: '1px solid var(--border)', flexShrink: 0 }} onError={e => e.target.style.display='none'} />}
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
                    { label: 'Cost Price', key: 'cost_price', type: 'number', hint: 'Your purchase cost per unit' },
                    { label: 'Stock Qty', key: 'quantity_available', type: 'number' },
                    { label: 'Ad Rate %', key: 'rate_markup', type: 'number', hint: 'Ad spend % deducted from each sale profit' },
                    { label: `Postage Override (${currency})`, key: 'shipping_cost', type: 'number', hint: 'Overrides eBay postage in profit calculations' },
                    { label: 'Tags', key: 'tags' },
                  ].map(f => (
                    <div key={f.key} className="form-group">
                      <label>{f.label}</label>
                      <input type={f.type || 'text'} value={edit[f.key] ?? ''} onChange={e => setEdit(x => ({ ...x, [f.key]: e.target.value }))} />
                      {f.hint && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{f.hint}</p>}
                    </div>
                  ))}
                  <div className="form-group">
                    <label>Notes</label>
                    <textarea rows={2} value={edit.notes || ''} onChange={e => setEdit(x => ({ ...x, notes: e.target.value }))} />
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={saveEdit}>Save Changes</button>
                </>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    ['SKU', selected.sku],
                    ['Custom Label', selected.custom_label],
                    ['Price', selected.display_price ? formatCurrency(selected.display_price, currency) : selected.price ? formatCurrency(selected.price, currency) : null],
                    ['Cost', selected.cost_price ? formatCurrency(selected.cost_price, currency) : null],
                    ['Ad Rate %', selected.rate_markup > 0 ? selected.rate_markup + '%' : null],
                    ['Postage Override', selected.shipping_cost > 0 ? formatCurrency(selected.shipping_cost, currency) : null],
                    ['Stock', selected.quantity_available],
                    ['Sold 30d', selected.sold_30d],
                    ['Condition', selected.condition],
                    ['Tags', selected.tags],
                  ].filter(([,v]) => v != null && v !== '').map(([k,v]) => (
                    <div key={k} style={{ background: 'var(--bg-card2)', borderRadius: 8, padding: '9px 12px' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k}</div>
                      <div style={{ fontSize: 13 }}>{String(v)}</div>
                    </div>
                  ))}
                </div>
              )}
              {detail?.sales?.length > 0 && (
                <>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Sales History</div>
                  <table className="data-table" style={{ fontSize: 11 }}>
                    <thead><tr><th>Order</th><th>Date</th><th>Qty</th><th>Total</th><th>Buyer</th></tr></thead>
                    <tbody>
                      {detail.sales.map(s => (
                        <tr key={s.id}>
                          <td className="mono" style={{ fontSize: 10, color: 'var(--accent)' }}>{s.order_id?.slice(0, 12)}…</td>
                          <td style={{ fontSize: 11 }}>{formatDate(s.sale_date)}</td>
                          <td className="mono">{s.quantity}</td>
                          <td className="mono" style={{ fontWeight: 600 }}>{formatCurrency(s.total_price, currency)}</td>
                          <td style={{ fontSize: 11 }}>{s.buyer_username}</td>
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
