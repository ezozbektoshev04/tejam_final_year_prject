import { useEffect, useState, useCallback } from 'react'
import api from '../api/axios'

const STATUS_CONFIG = {
  pending:         { label: 'Pending',          color: 'bg-yellow-100 text-yellow-700',   next: 'confirmed' },
  confirmed:       { label: 'Confirmed',         color: 'bg-blue-100 text-blue-700',       next: 'picked_up' },
  picked_up:       { label: 'Picked up',         color: 'bg-primary-100 text-primary-700', next: null },
  cancelled:       { label: 'Cancelled',         color: 'bg-red-100 text-red-700',         next: null },
  pending_payment: { label: 'Awaiting payment',  color: 'bg-orange-100 text-orange-700',   next: null },
}

function formatPrice(p) {
  return new Intl.NumberFormat('uz-UZ').format(Math.round(p)) + ' UZS'
}

function getPaymentStatus(order) {
  const { payment_method, status } = order
  if (status === 'pending_payment') {
    return { label: '⏳ Awaiting payment', color: 'bg-orange-100 text-orange-700', paid: false }
  }
  if (status === 'cancelled') {
    if (payment_method === 'online') {
      return { label: '↩ Refunded', color: 'bg-red-100 text-red-600', paid: false }
    }
    return { label: '✕ Cancelled', color: 'bg-gray-100 text-gray-500', paid: false }
  }
  if (payment_method === 'online') {
    return { label: '✅ Paid online', color: 'bg-green-100 text-green-700', paid: true }
  }
  // cash
  if (status === 'picked_up') {
    return { label: '✅ Cash collected', color: 'bg-green-100 text-green-700', paid: true }
  }
  return { label: '💵 Pay at pickup', color: 'bg-gray-100 text-gray-600', paid: false }
}

const PERIOD_OPTIONS = [
  { label: 'All time', value: '' },
  { label: 'Today',    value: '1d' },
  { label: '7 days',   value: '7d' },
  { label: '30 days',  value: '30d' },
  { label: 'Custom',   value: 'custom' },
]

function buildDateRange(period) {
  const fmt = d => d.toISOString().slice(0, 10)
  const today = new Date()
  if (period === '1d')  return { start: fmt(today), end: fmt(today) }
  if (period === '7d')  { const s = new Date(today); s.setDate(today.getDate() - 6);  return { start: fmt(s), end: fmt(today) } }
  if (period === '30d') { const s = new Date(today); s.setDate(today.getDate() - 29); return { start: fmt(s), end: fmt(today) } }
  return { start: '', end: '' }
}

export default function ShopOrders() {
  const [shops, setShops] = useState([])
  const [orders, setOrders] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [updatingOrder, setUpdatingOrder] = useState(null)
  const [expandedId, setExpandedId] = useState(null)

  // Filters
  const [shopId, setShopId] = useState(null)
  const [status, setStatus] = useState('')
  const [payment, setPayment] = useState('')
  const [period, setPeriod] = useState('')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage] = useState(1)
  const PER_PAGE = 20

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (shopId)  params.set('shop_id', shopId)
      if (status)  params.set('status', status)
      if (payment) params.set('payment', payment)
      if (search)  params.set('search', search)
      params.set('page', page)
      params.set('per_page', PER_PAGE)

      let start = '', end = ''
      if (period === 'custom') {
        start = customStart; end = customEnd
      } else if (period) {
        ({ start, end } = buildDateRange(period))
      }
      if (start) params.set('start', start)
      if (end)   params.set('end', end)

      const res = await api.get(`/orders/?${params}`)
      // backend now returns { orders, total } for shop role
      if (res.data.orders) {
        setOrders(res.data.orders)
        setTotal(res.data.total)
      } else {
        // customer fallback (shouldn't reach here)
        setOrders(res.data)
        setTotal(res.data.length)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [shopId, status, payment, search, period, customStart, customEnd, page])

  useEffect(() => {
    api.get('/shops/my').then(r => setShops(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    setPage(1)
  }, [shopId, status, payment, search, period, customStart, customEnd])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const handleStatusUpdate = async (orderId, newStatus) => {
    setUpdatingOrder(orderId)
    try {
      const res = await api.put(`/orders/${orderId}/status`, { status: newStatus })
      setOrders(prev => prev.map(o => o.id === orderId ? res.data : o))
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update status')
    } finally {
      setUpdatingOrder(null)
    }
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    setSearch(searchInput)
  }

  const completedOrders    = orders.filter(o => o.status === 'picked_up' || o.status === 'confirmed')
  const pendingCount       = orders.filter(o => o.status === 'pending').length
  const awaitingPayment    = orders.filter(o => o.status === 'pending_payment').length
  const paidOnlineCount    = orders.filter(o => o.payment_method === 'online' && o.status !== 'pending_payment' && o.status !== 'cancelled').length
  const totalRevenue       = completedOrders.reduce((s, o) => s + o.total_price, 0)
  const totalPages         = Math.ceil(total / PER_PAGE)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <p className="text-gray-500 text-sm mt-0.5">All orders across your branches</p>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{total}</p>
          <p className="text-xs text-gray-500 mt-0.5">Matching orders</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-primary-600">{formatPrice(totalRevenue)}</p>
          <p className="text-xs text-gray-500 mt-0.5">Revenue (this page)</p>
        </div>
        <div className="card p-4 text-center relative">
          <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">Pending action</p>
          {pendingCount > 0 && (
            <span className="absolute top-2 right-2 w-2 h-2 bg-yellow-400 rounded-full" />
          )}
        </div>
        <div className="card p-4 text-center relative">
          <p className="text-2xl font-bold text-green-600">{paidOnlineCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">Paid online</p>
          {awaitingPayment > 0 && (
            <span className="absolute top-2 right-2 flex items-center gap-1">
              <span className="text-xs text-orange-600 font-semibold">{awaitingPayment} pending</span>
            </span>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-5 space-y-3">
        <div className="flex flex-wrap gap-3">
          {/* Branch */}
          {shops.length > 1 && (
            <select
              className="input-field w-auto text-sm"
              value={shopId ?? ''}
              onChange={e => setShopId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">All branches</option>
              {shops.map(s => (
                <option key={s.id} value={s.id}>
                  {s.address?.split(',')[0] || `Branch ${s.id}`}
                </option>
              ))}
            </select>
          )}

          {/* Status */}
          <select
            className="input-field w-auto text-sm"
            value={status}
            onChange={e => setStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>

          {/* Payment */}
          <select
            className="input-field w-auto text-sm"
            value={payment}
            onChange={e => setPayment(e.target.value)}
          >
            <option value="">All payments</option>
            <option value="cash">Cash</option>
            <option value="online">Online</option>
          </select>

          {/* Period */}
          <select
            className="input-field w-auto text-sm"
            value={period}
            onChange={e => setPeriod(e.target.value)}
          >
            {PERIOD_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Custom dates */}
          {period === 'custom' && (
            <>
              <input type="date" className="input-field w-auto text-sm"
                value={customStart} onChange={e => setCustomStart(e.target.value)} />
              <input type="date" className="input-field w-auto text-sm"
                value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
            </>
          )}
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <input
            type="text"
            className="input-field text-sm flex-1"
            placeholder="Search by order ref or item name…"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
          />
          <button type="submit" className="btn-primary text-sm px-4">Search</button>
          {search && (
            <button type="button" className="btn-secondary text-sm px-3"
              onClick={() => { setSearch(''); setSearchInput('') }}>
              Clear
            </button>
          )}
        </form>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-400">
            <div className="animate-spin w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full mx-auto mb-3" />
            Loading orders…
          </div>
        ) : orders.length === 0 ? (
          <div className="p-16 text-center">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-gray-500">No orders match your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-3 font-medium text-gray-500">#</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Date & Time</th>
                  {!shopId && shops.length > 1 && (
                    <th className="px-4 py-3 font-medium text-gray-500">Branch</th>
                  )}
                  <th className="px-4 py-3 font-medium text-gray-500">Item</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Qty</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Total</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Payment</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map(order => {
                  const sc = STATUS_CONFIG[order.status]
                  const ps = getPaymentStatus(order)
                  const isExpanded = expandedId === order.id
                  return (
                    <>
                      <tr
                        key={order.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => setExpandedId(isExpanded ? null : order.id)}
                      >
                        <td className="px-4 py-3 text-gray-500 font-mono text-xs">{order.order_ref}</td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                          {new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          {' '}
                          <span className="text-gray-400 text-xs">
                            {new Date(order.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </td>
                        {!shopId && shops.length > 1 && (
                          <td className="px-4 py-3 text-gray-600 max-w-[120px] truncate">
                            {order.shop_address?.split(',')[0] || order.shop_name}
                          </td>
                        )}
                        <td className="px-4 py-3 font-medium text-gray-900 max-w-[150px] truncate">
                          {order.food_item_name}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{order.quantity}</td>
                        <td className="px-4 py-3 font-semibold text-primary-600 whitespace-nowrap">
                          {formatPrice(order.total_price)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`badge text-xs font-medium ${ps.color}`}>
                            {ps.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`badge ${sc?.color}`}>{sc?.label}</span>
                        </td>
                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          {sc?.next && (
                            <button
                              onClick={() => handleStatusUpdate(order.id, sc.next)}
                              disabled={updatingOrder === order.id}
                              className="text-xs text-primary-600 border border-primary-200 bg-primary-50 hover:bg-primary-100 px-2 py-1 rounded-md transition-colors disabled:opacity-50 whitespace-nowrap"
                            >
                              {updatingOrder === order.id ? '…' : `Mark ${STATUS_CONFIG[sc.next]?.label}`}
                            </button>
                          )}
                        </td>
                      </tr>

                      {/* Expanded row */}
                      {isExpanded && (
                        <tr key={`${order.id}-expanded`} className="bg-primary-50">
                          <td colSpan={9} className="px-6 py-4">
                            <div className="grid sm:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Pickup window</p>
                                <p className="text-gray-800">{order.pickup_start || '—'} – {order.pickup_end || '—'}</p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Order ref</p>
                                <p className="font-mono text-sm font-bold text-gray-800">{order.order_ref}</p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Payment status</p>
                                <span className={`badge text-xs font-medium ${ps.color}`}>{ps.label}</span>
                                <p className="text-xs text-gray-400 mt-1">
                                  Method: {order.payment_method === 'online' ? '💳 Online (Stripe)' : '💵 Cash'}
                                </p>
                              </div>
                              {order.notes ? (
                                <div>
                                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Customer notes</p>
                                  <p className="text-gray-700">{order.notes}</p>
                                </div>
                              ) : order.pickup_token ? (
                                <div>
                                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Pickup token</p>
                                  <p className="font-mono text-xs text-gray-600 bg-white px-2 py-1 rounded border border-gray-200 break-all">{order.pickup_token}</p>
                                </div>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, total)} of {total}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => p - 1)}
                disabled={page === 1}
                className="btn-secondary text-sm px-3 py-1.5 disabled:opacity-40"
              >
                ← Prev
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page >= totalPages}
                className="btn-secondary text-sm px-3 py-1.5 disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
