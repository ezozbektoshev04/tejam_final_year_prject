import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import api from '../api/axios'

const STATUS_CONFIG = {
  pending:   { label: 'Pending',   color: 'bg-yellow-100 text-yellow-700', next: 'confirmed' },
  confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-700',     next: 'picked_up' },
  picked_up: { label: 'Picked up', color: 'bg-primary-100 text-primary-700', next: null },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700',       next: null },
}

const STATUS_COLORS = {
  pending:   '#f59e0b',
  confirmed: '#3b82f6',
  picked_up: '#1a7548',
  cancelled: '#ef4444',
}

const CATEGORY_COLORS = ['#1a7548', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899']

const RANGE_OPTIONS = [
  { label: '7 days',  days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
  { label: 'Custom',  days: 0 },
]

function formatPrice(price) {
  return new Intl.NumberFormat('uz-UZ').format(Math.round(price))
}

function StatCard({ title, value, sub, icon, color }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className={`text-2xl font-bold mt-1 ${color || 'text-gray-900'}`}>{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
        <div className="text-3xl">{icon}</div>
      </div>
    </div>
  )
}

export default function ShopDashboard() {
  const [stats, setStats] = useState(null)
  const [orders, setOrders] = useState([])
  const [shops, setShops] = useState([])
  const [selectedShopId, setSelectedShopId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updatingOrder, setUpdatingOrder] = useState(null)

  // Date range
  const [rangeDays, setRangeDays] = useState(7)
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [isCustom, setIsCustom] = useState(false)

  // Report modal
  const [reportOpen, setReportOpen] = useState(false)
  const [reportForm, setReportForm] = useState({ period: '7d', start: '', end: '', granularity: 'daily' })
  const [reportLoading, setReportLoading] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedShopId) params.set('shop_id', selectedShopId)
      if (isCustom && customStart && customEnd) {
        params.set('start', customStart)
        params.set('end', customEnd)
      } else {
        params.set('days', rangeDays)
      }

      const [statsRes, ordersRes, shopsRes] = await Promise.all([
        api.get(`/orders/stats?${params}`),
        api.get('/orders/'),
        api.get('/shops/my'),
      ])
      setStats(statsRes.data)
      const allOrders = ordersRes.data.orders || []
      const pending = allOrders.filter(o => o.status === 'pending')
      setOrders(selectedShopId ? pending.filter(o => o.shop_id === selectedShopId) : pending)
      setShops(shopsRes.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [selectedShopId, rangeDays, isCustom, customStart, customEnd])

  useEffect(() => { fetchData() }, [fetchData])

  const handleStatusUpdate = async (orderId, newStatus) => {
    setUpdatingOrder(orderId)
    try {
      const res = await api.put(`/orders/${orderId}/status`, { status: newStatus })
      setOrders(orders.map(o => o.id === orderId ? res.data : o))
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update status')
    } finally {
      setUpdatingOrder(null)
    }
  }

  const handleRangeSelect = (days) => {
    if (days === 0) {
      setIsCustom(true)
    } else {
      setIsCustom(false)
      setRangeDays(days)
    }
  }

  const handleDownloadReport = async () => {
    const today = new Date()
    const fmt = (d) => d.toISOString().slice(0, 10)
    let start, end
    if (reportForm.period === 'custom') {
      if (!reportForm.start || !reportForm.end) { alert('Please select a start and end date'); return }
      start = reportForm.start; end = reportForm.end
    } else {
      end = fmt(today)
      const days = { '1d': 0, '7d': 6, '30d': 29, 'month': today.getDate() - 1 }
      const startDate = new Date(today)
      startDate.setDate(today.getDate() - (days[reportForm.period] ?? 6))
      start = fmt(startDate)
    }
    const params = new URLSearchParams({ start, end, granularity: reportForm.granularity })
    if (selectedShopId) params.set('shop_id', selectedShopId)
    setReportLoading(true)
    try {
      const token = localStorage.getItem('access_token')
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/reports/export?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!res.ok) { const err = await res.json(); alert(err.error || 'Export failed'); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `tejam-report-${start}-${end}.xlsx`; a.click()
      URL.revokeObjectURL(url)
      setReportOpen(false)
    } catch { alert('Export failed. Please try again.') }
    finally { setReportLoading(false) }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1,2,3,4].map(i => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
              <div className="h-8 bg-gray-200 rounded w-2/3" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const revenueData = stats?.revenue_chart?.map(d => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    revenue: Math.round(d.revenue / 1000),
  })) || []

  const statusData = (stats?.status_chart || []).filter(d => d.count > 0)

  const categoryData = stats?.category_chart || []

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{shops[0]?.name || 'Shop Dashboard'}</h1>
          <p className="text-gray-500 text-sm mt-0.5">{shops.length} branch{shops.length !== 1 ? 'es' : ''} · {shops[0]?.category}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setReportOpen(true)} className="btn-secondary text-sm">⬇ Download report</button>
          <Link to="/listings" className="btn-primary text-sm">+ Manage listings</Link>
        </div>
      </div>

      {/* Branch selector */}
      {shops.length > 1 && (
        <div className="flex gap-2 flex-wrap mb-4">
          <button
            onClick={() => setSelectedShopId(null)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${selectedShopId === null ? 'bg-primary-700 text-white border-primary-700' : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'}`}
          >All branches</button>
          {shops.map(s => (
            <button key={s.id} onClick={() => setSelectedShopId(s.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${selectedShopId === s.id ? 'bg-primary-700 text-white border-primary-700' : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'}`}
            >{s.address?.split(',')[0] || `Branch ${s.id}`}</button>
          ))}
        </div>
      )}

      {/* Date range selector */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {RANGE_OPTIONS.map(opt => (
          <button
            key={opt.label}
            onClick={() => handleRangeSelect(opt.days)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              (opt.days === 0 ? isCustom : !isCustom && rangeDays === opt.days)
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
            }`}
          >{opt.label}</button>
        ))}
        {isCustom && (
          <div className="flex items-center gap-2">
            <input type="date" className="input-field text-sm py-1.5 w-auto" value={customStart}
              onChange={e => setCustomStart(e.target.value)} />
            <span className="text-gray-400 text-sm">→</span>
            <input type="date" className="input-field text-sm py-1.5 w-auto" value={customEnd}
              onChange={e => setCustomEnd(e.target.value)} />
            <button onClick={fetchData} className="btn-primary text-sm py-1.5 px-3" disabled={!customStart || !customEnd}>
              Apply
            </button>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total revenue" value={`${formatPrice(stats?.total_revenue || 0)} UZS`} sub="from completed orders" icon="💰" color="text-primary-600" />
        <StatCard title="Total orders" value={stats?.total_orders || 0} sub="all time" icon="📦" />
        <StatCard title="Items listed" value={stats?.items_listed || 0} sub="active listings" icon="🍽️" />
        <StatCard title="Avg. rating" value={stats?.avg_rating ? `${stats.avg_rating} ⭐` : '—'} sub="customer reviews" icon="⭐" color="text-yellow-600" />
      </div>

      {/* Charts row 1: Revenue + Status breakdown */}
      <div className="grid lg:grid-cols-3 gap-6 mb-6">

        {/* Revenue chart — spans 2 cols */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Revenue (×1,000 UZS)</h2>
            {stats?.range_start && (
              <span className="text-xs text-gray-400">
                {new Date(stats.range_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} –{' '}
                {new Date(stats.range_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1a7548" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#1a7548" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [`${v}K UZS`, 'Revenue']} />
              <Area type="monotone" dataKey="revenue" stroke="#1a7548" strokeWidth={2} fill="url(#revenueGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Order status breakdown — pie */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Order status breakdown</h2>
          {statusData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={statusData} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={65} innerRadius={35}>
                    {statusData.map((entry) => (
                      <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, name) => [v, STATUS_CONFIG[name]?.label || name]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {statusData.map(d => (
                  <div key={d.status} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: STATUS_COLORS[d.status] }} />
                      <span className="text-gray-600">{STATUS_CONFIG[d.status]?.label || d.status}</span>
                    </div>
                    <span className="font-semibold text-gray-800">{d.count}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">No order data yet</div>
          )}
        </div>
      </div>

      {/* Charts row 2: Top items + Revenue by category */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">

        {/* Top items */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Top items by orders</h2>
          {stats?.top_items?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.top_items} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={100} />
                <Tooltip />
                <Bar dataKey="orders" fill="#ea580c" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-52 text-gray-400 text-sm">No order data yet</div>
          )}
        </div>

        {/* Revenue by category */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Revenue by category</h2>
          {categoryData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${Math.round(v/1000)}K`} />
                  <Tooltip formatter={(v) => [`${formatPrice(v)} UZS`, 'Revenue']} />
                  <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                    {categoryData.map((_, i) => (
                      <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-3 mt-2">
                {categoryData.map((d, i) => (
                  <div key={d.category} className="flex items-center gap-1.5 text-xs text-gray-600">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                    {d.category}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-52 text-gray-400 text-sm">No revenue data yet</div>
          )}
        </div>
      </div>

      {/* Pending orders */}
      <div className="card">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Pending orders</h2>
          <Link to="/shop-orders" className="text-sm font-semibold text-primary-700 hover:text-primary-900 transition-colors">View all orders →</Link>
        </div>
        {orders.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <p className="text-4xl mb-2">✅</p>
            <p>No pending orders right now</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-3 font-medium text-gray-500">Order</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Item</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Qty</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Amount</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Date</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map(order => {
                  const status = STATUS_CONFIG[order.status]
                  return (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{order.order_ref}</td>
                      <td className="px-4 py-3 font-medium text-gray-900 max-w-[140px] truncate">{order.food_item_name}</td>
                      <td className="px-4 py-3 text-gray-600">{order.quantity}</td>
                      <td className="px-4 py-3 font-semibold text-primary-600">{formatPrice(order.total_price)} UZS</td>
                      <td className="px-4 py-3"><span className={`badge ${status?.color}`}>{status?.label}</span></td>
                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                        {new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </td>
                      <td className="px-4 py-3">
                        {status?.next && (
                          <button
                            onClick={() => handleStatusUpdate(order.id, status.next)}
                            disabled={updatingOrder === order.id}
                            className="text-xs text-primary-600 border border-primary-200 bg-primary-50 hover:bg-primary-100 px-2 py-1 rounded-md transition-colors disabled:opacity-50 whitespace-nowrap"
                          >
                            {updatingOrder === order.id ? '…' : `Mark ${STATUS_CONFIG[status.next]?.label}`}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Report modal */}
      {reportOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">Download sales report</h2>
              <button onClick={() => setReportOpen(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              {shops.length > 1 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                  <select className="input-field" value={selectedShopId ?? ''} onChange={e => setSelectedShopId(e.target.value ? Number(e.target.value) : null)}>
                    <option value="">All branches</option>
                    {shops.map(s => <option key={s.id} value={s.id}>{s.address?.split(',')[0] || `Branch ${s.id}`}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
                <select className="input-field" value={reportForm.period} onChange={e => setReportForm(f => ({ ...f, period: e.target.value }))}>
                  <option value="1d">Today</option>
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="month">This month</option>
                  <option value="custom">Custom range</option>
                </select>
              </div>
              {reportForm.period === 'custom' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
                    <input type="date" className="input-field" value={reportForm.start} onChange={e => setReportForm(f => ({ ...f, start: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                    <input type="date" className="input-field" value={reportForm.end} onChange={e => setReportForm(f => ({ ...f, end: e.target.value }))} />
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Breakdown by</label>
                <div className="flex gap-2">
                  {['hourly', 'daily', 'weekly'].map(g => (
                    <button key={g} type="button" onClick={() => setReportForm(f => ({ ...f, granularity: g }))}
                      className={`flex-1 py-1.5 rounded-lg text-sm font-medium border transition-colors ${reportForm.granularity === g ? 'bg-primary-700 text-white border-primary-700' : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'}`}
                    >{g.charAt(0).toUpperCase() + g.slice(1)}</button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setReportOpen(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="button" onClick={handleDownloadReport} disabled={reportLoading} className="btn-primary flex-1">
                  {reportLoading ? 'Exporting…' : '⬇ Download Excel'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
