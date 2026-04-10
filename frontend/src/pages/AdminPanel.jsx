import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

function formatPrice(price) {
  return new Intl.NumberFormat('uz-UZ').format(Math.round(price)) + ' UZS'
}

function StatCard({ title, value, sub, icon }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
        <div className="w-11 h-11 bg-primary-50 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
          {icon}
        </div>
      </div>
    </div>
  )
}

const TABS = ['Overview', 'Pending Shops', 'Customers', 'Shop Owners', 'Earnings', 'Settings']

const NOTIF_KEYS = [
  { key: 'notification_order_placed',    label: 'Order placed (to customer)',    vars: '{ref}, {shop}, {pickup_start}, {pickup_end}, {item}' },
  { key: 'notification_order_confirmed', label: 'Order confirmed (to customer)', vars: '{ref}' },
  { key: 'notification_order_picked_up', label: 'Order picked up (to customer)', vars: '{ref}, {item}' },
  { key: 'notification_order_cancelled', label: 'Order cancelled by shop (to customer)', vars: '{ref}, {item}' },
]

export default function AdminPanel() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('Overview')
  const [stats, setStats] = useState(null)
  const [customers, setCustomers] = useState([])
  const [shops, setShops] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(null)
  const [toggling, setToggling] = useState(null)
  const [pendingShops, setPendingShops] = useState([])
  const [approving, setApproving] = useState(null)
  const [rejecting, setRejecting] = useState(null)

  // Settings state
  const [settings, setSettings] = useState(null)
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [settingsMsg, setSettingsMsg] = useState(null)
  const [newCategory, setNewCategory] = useState('')

  // Earnings state
  const [earnings, setEarnings]               = useState(null)
  const [earningsLoading, setEarningsLoading] = useState(false)
  const [earningsPeriod, setEarningsPeriod]   = useState('this_month')
  const [earningsStart, setEarningsStart]     = useState('')
  const [earningsEnd, setEarningsEnd]         = useState('')
  const [earningsSearch, setEarningsSearch]   = useState('')
  const [earningsSearchInput, setEarningsSearchInput] = useState('')
  const [earningsPage, setEarningsPage]       = useState(1)
  const [settleModal, setSettleModal]         = useState(null)
  const [settleAmount, setSettleAmount]       = useState('')
  const [settleNote, setSettleNote]           = useState('')
  const [settling, setSettling]               = useState(false)
  const [exportingEarnings, setExportingEarnings] = useState(false)
  const EARNINGS_PER_PAGE = 10

  const getEarningsDates = (period = earningsPeriod) => {
    const today = new Date()
    const fmt   = d => d.toISOString().slice(0, 10)
    if (period === 'this_month') {
      return { start: fmt(new Date(today.getFullYear(), today.getMonth(), 1)), end: fmt(today) }
    }
    if (period === 'last_month') {
      return {
        start: fmt(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
        end:   fmt(new Date(today.getFullYear(), today.getMonth(), 0)),
      }
    }
    if (period === '3_months') {
      const s = new Date(today.getFullYear(), today.getMonth() - 2, 1)
      return { start: fmt(s), end: fmt(today) }
    }
    if (period === 'custom') return { start: earningsStart, end: earningsEnd }
    return { start: '', end: '' } // all_time
  }

  useEffect(() => { fetchAll() }, [])
  useEffect(() => { if (tab === 'Settings' && !settings) fetchSettings() }, [tab])
  useEffect(() => {
    if (tab === 'Earnings') fetchEarnings(earningsPage, earningsSearch, earningsPeriod)
  }, [tab, earningsPeriod, earningsSearch, earningsPage])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [statsRes, custRes, shopRes, pendingRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/users?role=customer'),
        api.get('/admin/shops'),
        api.get('/admin/pending-shops'),
      ])
      setStats(statsRes.data)
      setCustomers(custRes.data)
      setShops(shopRes.data)
      setPendingShops(pendingRes.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchSettings = async () => {
    try {
      const res = await api.get('/admin/settings')
      setSettings(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  const fetchEarnings = async (page = earningsPage, search = earningsSearch, period = earningsPeriod) => {
    setEarningsLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', page)
      params.set('per_page', EARNINGS_PER_PAGE)
      if (search) params.set('search', search)
      const { start, end } = getEarningsDates(period)
      if (start) params.set('start', start)
      if (end)   params.set('end',   end)
      const res = await api.get(`/admin/earnings?${params}`)
      setEarnings(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setEarningsLoading(false)
    }
  }

  const handleSettleSubmit = async () => {
    if (!settleModal || !settleAmount) return
    setSettling(true)
    try {
      await api.post('/admin/earnings/settle', {
        shop_id: settleModal.shop_id,
        amount:  parseFloat(settleAmount),
        note:    settleNote,
      })
      setSettleModal(null)
      setSettleAmount('')
      setSettleNote('')
      fetchEarnings()
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to record settlement')
    } finally {
      setSettling(false)
    }
  }

  const handleExportEarnings = async () => {
    setExportingEarnings(true)
    try {
      const { start, end } = getEarningsDates()
      const params = new URLSearchParams()
      if (start) params.set('start', start)
      if (end)   params.set('end',   end)
      const token = localStorage.getItem('access_token')
      const res = await fetch(
        `/api/admin/earnings/export?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!res.ok) { const e = await res.json(); alert(e.error || 'Export failed'); return }
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url
      a.download = `tejam-earnings-${start || 'all'}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch { alert('Export failed') }
    finally { setExportingEarnings(false) }
  }

  const saveSettings = async (patch) => {
    setSettingsLoading(true)
    setSettingsMsg(null)
    try {
      await api.put('/admin/settings', patch)
      setSettings(s => ({ ...s, ...patch }))
      setSettingsMsg({ type: 'success', text: 'Settings saved.' })
    } catch (err) {
      setSettingsMsg({ type: 'error', text: err.response?.data?.error || 'Save failed.' })
    } finally {
      setSettingsLoading(false)
      setTimeout(() => setSettingsMsg(null), 3000)
    }
  }

  const handleAddCategory = () => {
    const cat = newCategory.trim()
    if (!cat || settings.categories.includes(cat)) return
    const updated = [...settings.categories, cat]
    setSettings(s => ({ ...s, categories: updated }))
    setNewCategory('')
    saveSettings({ categories: updated })
  }

  const handleRemoveCategory = (cat) => {
    const updated = settings.categories.filter(c => c !== cat)
    setSettings(s => ({ ...s, categories: updated }))
    saveSettings({ categories: updated })
  }

  const handleThresholdSave = () => {
    saveSettings({
      min_discount_percent: Number(settings.min_discount_percent),
      max_discount_percent: Number(settings.max_discount_percent),
      low_stock_threshold:  Number(settings.low_stock_threshold),
    })
  }

  const handleTemplateChange = (key, value) => {
    setSettings(s => ({ ...s, [key]: value }))
  }

  const handleTemplateSave = (key) => {
    saveSettings({ [key]: settings[key] })
  }

  const handleApproveShop = async (userId, name) => {
    setApproving(userId)
    try {
      await api.post(`/admin/approve-shop/${userId}`)
      const approved = pendingShops.find(u => u.id === userId)
      setPendingShops(prev => prev.filter(u => u.id !== userId))
      if (approved) setShops(prev => [...prev, { ...approved.shops?.[0], owner_name: approved.name, owner_email: approved.email, listing_count: 0, order_count: 0, is_active: true }])
      setStats(s => s ? { ...s, pending_shop_approvals: Math.max(0, (s.pending_shop_approvals || 1) - 1), total_shops: (s.total_shops || 0) + 1 } : s)
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to approve')
    } finally {
      setApproving(null)
    }
  }

  const handleRejectShop = async (userId, name) => {
    if (!window.confirm(`Reject and delete application from "${name}"? This cannot be undone.`)) return
    setRejecting(userId)
    try {
      await api.delete(`/admin/reject-shop/${userId}`)
      setPendingShops(prev => prev.filter(u => u.id !== userId))
      setStats(s => s ? { ...s, pending_shop_approvals: Math.max(0, (s.pending_shop_approvals || 1) - 1) } : s)
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to reject')
    } finally {
      setRejecting(null)
    }
  }

  const handleDeleteUser = async (userId, name) => {
    if (!window.confirm(`Delete user "${name}"? This cannot be undone.`)) return
    setDeleting(userId)
    try {
      await api.delete(`/admin/users/${userId}`)
      setCustomers(prev => prev.filter(u => u.id !== userId))
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete user')
    } finally {
      setDeleting(null)
    }
  }

  const handleToggleShop = async (shopId) => {
    setToggling(shopId)
    try {
      const res = await api.put(`/admin/shops/${shopId}/toggle`)
      setShops(prev => prev.map(s => s.id === shopId ? { ...s, is_active: res.data.is_active } : s))
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update shop')
    } finally {
      setToggling(null)
    }
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

  const handleLogout = () => {
    logout()
    navigate('/admin/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Navbar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo-color.png" alt="Tejam" className="h-8 w-auto" />
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest border-l border-gray-200 pl-3">Admin</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-red-600 hover:text-red-700 font-medium transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
        <p className="text-gray-500 text-sm mt-0.5">Manage users and platform activity</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit mb-8 flex-wrap">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`relative px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t}
            {t === 'Pending Shops' && pendingShops.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {pendingShops.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {tab === 'Overview' && stats && (
        <div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard title="Total customers" value={stats.total_customers} sub="registered accounts" icon="👤" />
            <StatCard title="Partner branches" value={stats.total_shops} sub={stats.pending_shop_approvals > 0 ? `${stats.pending_shop_approvals} pending approval` : 'approved accounts'} icon="🏪" />
            <StatCard title="Total orders" value={stats.total_orders} sub={`${stats.pending_orders} pending · ${stats.confirmed_orders} confirmed`} icon="📦" />
            <StatCard title="Revenue collected" value={formatPrice(stats.total_revenue)} sub="from picked-up orders" icon="💰" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="card p-5">
              <h3 className="font-semibold text-gray-900 mb-3">Platform summary</h3>
              <div className="space-y-3">
                {[
                  { label: 'Active listings', value: stats.total_listings },
                  { label: 'Pending orders', value: stats.pending_orders },
                  { label: 'Confirmed orders', value: stats.confirmed_orders },
                  { label: 'Total orders placed', value: stats.total_orders },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">{row.label}</span>
                    <span className="font-semibold text-gray-900">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="card p-5">
              <h3 className="font-semibold text-gray-900 mb-3">Admin credentials</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Email</span>
                  <span className="font-mono text-gray-800">admin@tejam.uz</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Password</span>
                  <span className="font-mono text-gray-800">password123</span>
                </div>
                <div className="mt-4 p-3 bg-primary-50 rounded-lg text-xs text-primary-700">
                  Admin account is seeded on first run. Change the password in production.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Pending Shops ── */}
      {tab === 'Pending Shops' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">{pendingShops.length} application{pendingShops.length !== 1 ? 's' : ''} awaiting review</p>
          </div>
          {pendingShops.length === 0 ? (
            <div className="card p-10 text-center text-gray-400">
              <p className="text-4xl mb-2">✅</p>
              <p className="font-medium text-gray-600 mb-1">All caught up</p>
              <p className="text-sm">No pending shop applications</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingShops.map(u => {
                const shop = u.shops?.[0]
                return (
                  <div key={u.id} className="card p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <div className="w-11 h-11 bg-amber-100 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                          🏪
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900">{shop?.name || u.name}</p>
                          <p className="text-sm text-gray-500 mt-0.5">{shop?.category} · {shop?.city}</p>
                          {shop?.address && <p className="text-xs text-gray-400 mt-0.5">{shop.address}</p>}
                          <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
                            <span>Owner: <span className="font-medium text-gray-700">{u.name}</span></span>
                            <span>Email: <span className="font-medium text-gray-700">{u.email}</span></span>
                            {u.phone && <span>Phone: <span className="font-medium text-gray-700">{u.phone}</span></span>}
                            <span>Applied: <span className="font-medium text-gray-700">{new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span></span>
                          </div>
                          {shop?.description && (
                            <p className="mt-2 text-xs text-gray-500 italic">"{shop.description}"</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleApproveShop(u.id, u.name)}
                          disabled={approving === u.id || rejecting === u.id}
                          className="text-sm px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:opacity-50 font-medium"
                        >
                          {approving === u.id ? '…' : 'Approve'}
                        </button>
                        <button
                          onClick={() => handleRejectShop(u.id, u.name)}
                          disabled={approving === u.id || rejecting === u.id}
                          className="text-sm px-4 py-2 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50 font-medium"
                        >
                          {rejecting === u.id ? '…' : 'Reject'}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Customers ── */}
      {tab === 'Customers' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">{customers.length} registered customer{customers.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="card overflow-hidden">
            {customers.length === 0 ? (
              <div className="p-10 text-center text-gray-400">
                <p className="text-4xl mb-2">👤</p>
                <p>No customers yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left border-b border-gray-100">
                      <th className="px-4 py-3 font-medium text-gray-500">#</th>
                      <th className="px-4 py-3 font-medium text-gray-500">Name</th>
                      <th className="px-4 py-3 font-medium text-gray-500">Email</th>
                      <th className="px-4 py-3 font-medium text-gray-500">Phone</th>
                      <th className="px-4 py-3 font-medium text-gray-500">Orders</th>
                      <th className="px-4 py-3 font-medium text-gray-500">Joined</th>
                      <th className="px-4 py-3 font-medium text-gray-500"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {customers.map(u => (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-400">{u.id}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-primary-800 font-semibold text-xs">
                                {u.name?.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="font-medium text-gray-900">{u.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{u.email}</td>
                        <td className="px-4 py-3 text-gray-500">{u.phone || '—'}</td>
                        <td className="px-4 py-3">
                          <span className="badge bg-primary-100 text-primary-800">{u.order_count ?? 0} orders</span>
                        </td>
                        <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                          {new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleDeleteUser(u.id, u.name)}
                            disabled={deleting === u.id}
                            className="text-xs text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 px-2 py-1 rounded-md transition-colors disabled:opacity-50"
                          >
                            {deleting === u.id ? '…' : 'Delete'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Earnings ── */}
      {tab === 'Earnings' && (
        <div>
          {/* Period selector */}
          <div className="flex flex-wrap items-center gap-2 mb-6">
            {[
              { label: 'This month',    value: 'this_month' },
              { label: 'Last month',    value: 'last_month' },
              { label: 'Last 3 months', value: '3_months'   },
              { label: 'All time',      value: 'all_time'   },
              { label: 'Custom',        value: 'custom'     },
            ].map(p => (
              <button
                key={p.value}
                onClick={() => { setEarningsPeriod(p.value); setEarningsPage(1) }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  earningsPeriod === p.value
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                }`}
              >{p.label}</button>
            ))}
            {earningsPeriod === 'custom' && (
              <>
                <input type="date" className="input-field text-sm py-1.5 w-auto"
                  value={earningsStart} onChange={e => setEarningsStart(e.target.value)} />
                <span className="text-gray-400 text-sm">→</span>
                <input type="date" className="input-field text-sm py-1.5 w-auto"
                  value={earningsEnd} onChange={e => setEarningsEnd(e.target.value)} />
                <button
                  onClick={() => { setEarningsPage(1); fetchEarnings(1, earningsSearch, 'custom') }}
                  disabled={!earningsStart || !earningsEnd}
                  className="btn-primary text-sm py-1.5 px-3 disabled:opacity-50"
                >Apply</button>
              </>
            )}
          </div>

          {earningsLoading || !earnings ? (
            <div className="card p-10 text-center text-gray-400">
              <div className="animate-spin w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full mx-auto mb-3" />
              Loading earnings…
            </div>
          ) : (
            <>
              {/* Stat cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard title="Commission (period)" value={formatPrice(earnings.total_commission)} sub={`${earnings.completed_orders} completed orders`} icon="💵" />
                <StatCard title="This month" value={formatPrice(earnings.this_month_commission)} sub="commission (all-time calc)" icon="📅" />
                <StatCard title="Last month" value={formatPrice(earnings.last_month_commission)} sub="commission" icon="🗓️" />
                <StatCard title="Gross revenue (period)" value={formatPrice(earnings.total_revenue)} sub={`shops earn ${formatPrice(earnings.total_payout)}`} icon="📊" />
              </div>

              {/* Monthly trend chart */}
              {earnings.monthly_trend?.length > 0 && (
                <div className="card p-5 mb-6">
                  <h3 className="font-semibold text-gray-900 mb-1">Monthly commission trend</h3>
                  <p className="text-xs text-gray-400 mb-4">Green = your commission · Light = gross revenue (×1,000 UZS)</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={earnings.monthly_trend} barGap={2}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${Math.round(v / 1000)}K`} />
                      <Tooltip formatter={(v, name) => [formatPrice(v), name === 'commission' ? 'Commission' : 'Gross revenue']} />
                      <Legend formatter={n => n === 'commission' ? 'Commission' : 'Gross revenue'} />
                      <Bar dataKey="revenue"    fill="#d1fae5" name="revenue"    radius={[2,2,0,0]} />
                      <Bar dataKey="commission" fill="#1a7548" name="commission" radius={[2,2,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Per-shop table */}
              <div className="card overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">Per-shop breakdown</h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Commission rate: {Math.round((earnings.commission_rate || 0.10) * 100)}% · Pending = all-time owed minus settled
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <form
                      onSubmit={e => { e.preventDefault(); setEarningsSearch(earningsSearchInput); setEarningsPage(1) }}
                      className="flex gap-2"
                    >
                      <input
                        type="text"
                        className="input-field text-sm py-1.5"
                        placeholder="Search shop, city…"
                        value={earningsSearchInput}
                        onChange={e => setEarningsSearchInput(e.target.value)}
                      />
                      <button type="submit" className="btn-secondary text-sm px-3">Search</button>
                      {earningsSearch && (
                        <button type="button" className="btn-secondary text-sm px-3"
                          onClick={() => { setEarningsSearch(''); setEarningsSearchInput(''); setEarningsPage(1) }}>
                          Clear
                        </button>
                      )}
                    </form>
                    <button
                      onClick={handleExportEarnings}
                      disabled={exportingEarnings}
                      className="btn-secondary text-sm disabled:opacity-50"
                    >
                      {exportingEarnings ? 'Exporting…' : '⬇ Export Excel'}
                    </button>
                  </div>
                </div>

                {earnings.per_shop.length === 0 ? (
                  <div className="p-10 text-center text-gray-400">
                    <p className="text-4xl mb-2">📊</p>
                    <p>{earningsSearch ? 'No shops match your search' : 'No completed orders yet'}</p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 text-left border-b border-gray-100">
                            <th className="px-4 py-3 font-medium text-gray-500">Shop</th>
                            <th className="px-4 py-3 font-medium text-gray-500">City</th>
                            <th className="px-4 py-3 font-medium text-gray-500 text-right">Orders</th>
                            <th className="px-4 py-3 font-medium text-gray-500 text-right">Gross revenue</th>
                            <th className="px-4 py-3 font-medium text-gray-500 text-right">
                              Commission ({Math.round((earnings.commission_rate || 0.10) * 100)}%)
                            </th>
                            <th className="px-4 py-3 font-medium text-gray-500 text-right">Shop payout</th>
                            <th className="px-4 py-3 font-medium text-gray-500 text-right">Settled (all-time)</th>
                            <th className="px-4 py-3 font-medium text-gray-500">Status</th>
                            <th className="px-4 py-3 font-medium text-gray-500"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {earnings.per_shop.map(s => (
                            <tr key={s.shop_id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 font-medium text-gray-900">{s.shop_name}</td>
                              <td className="px-4 py-3 text-gray-500">{s.city || '—'}</td>
                              <td className="px-4 py-3 text-gray-600 text-right">{s.orders}</td>
                              <td className="px-4 py-3 text-gray-700 text-right">{formatPrice(s.revenue)}</td>
                              <td className="px-4 py-3 text-primary-700 font-semibold text-right">{formatPrice(s.commission)}</td>
                              <td className="px-4 py-3 text-gray-600 text-right">{formatPrice(s.payout)}</td>
                              <td className="px-4 py-3 text-gray-600 text-right">{formatPrice(s.total_settled)}</td>
                              <td className="px-4 py-3">
                                {s.pending_payout > 0 ? (
                                  <span className="badge bg-amber-100 text-amber-700 font-medium">
                                    {formatPrice(s.pending_payout)} owed
                                  </span>
                                ) : (
                                  <span className="badge bg-primary-100 text-primary-700">✓ Settled</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {s.pending_payout > 0 && (
                                  <button
                                    onClick={() => { setSettleModal(s); setSettleAmount(String(s.pending_payout)); setSettleNote('') }}
                                    className="text-xs text-primary-700 border border-primary-200 bg-primary-50 hover:bg-primary-100 px-2 py-1 rounded-md transition-colors font-medium"
                                  >
                                    Mark settled
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        {earnings.per_shop.length > 0 && (
                          <tfoot className="bg-gray-50 border-t border-gray-200">
                            <tr>
                              <td className="px-4 py-3 font-semibold text-gray-700" colSpan={2}>
                                {earningsSearch
                                  ? `${earnings.total_shops} result${earnings.total_shops !== 1 ? 's' : ''}`
                                  : 'Period total'}
                              </td>
                              <td className="px-4 py-3 font-semibold text-gray-700 text-right">{earnings.completed_orders}</td>
                              <td className="px-4 py-3 font-semibold text-gray-700 text-right">{formatPrice(earnings.total_revenue)}</td>
                              <td className="px-4 py-3 font-bold text-primary-700 text-right">{formatPrice(earnings.total_commission)}</td>
                              <td className="px-4 py-3 font-semibold text-gray-700 text-right">{formatPrice(earnings.total_payout)}</td>
                              <td colSpan={3} />
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>

                    {/* Pagination */}
                    {earnings.pages > 1 && (
                      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                        <p className="text-sm text-gray-500">
                          Page {earnings.page} of {earnings.pages} · {earnings.total_shops} shops
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEarningsPage(p => p - 1)}
                            disabled={earnings.page === 1}
                            className="btn-secondary text-sm px-3 py-1.5 disabled:opacity-40"
                          >← Prev</button>
                          <button
                            onClick={() => setEarningsPage(p => p + 1)}
                            disabled={earnings.page >= earnings.pages}
                            className="btn-secondary text-sm px-3 py-1.5 disabled:opacity-40"
                          >Next →</button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}

          {/* Settle modal */}
          {settleModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-bold text-gray-900">Record settlement</h2>
                  <button onClick={() => setSettleModal(null)} className="text-gray-400 hover:text-gray-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Marking <span className="font-semibold">{settleModal.shop_name}</span> as paid.
                  Pending: <span className="font-semibold text-amber-600">{formatPrice(settleModal.pending_payout)}</span>
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount settled (UZS)</label>
                    <input
                      type="number"
                      className="input-field"
                      value={settleAmount}
                      onChange={e => setSettleAmount(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. Bank transfer April 2025"
                      value={settleNote}
                      onChange={e => setSettleNote(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button onClick={() => setSettleModal(null)} className="btn-secondary flex-1">Cancel</button>
                    <button
                      onClick={handleSettleSubmit}
                      disabled={settling || !settleAmount}
                      className="btn-primary flex-1 disabled:opacity-50"
                    >
                      {settling ? 'Saving…' : 'Confirm settlement'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Settings ── */}
      {tab === 'Settings' && (
        <div className="space-y-6">

          {settingsMsg && (
            <div className={`p-3 rounded-xl text-sm flex items-center gap-2 ${
              settingsMsg.type === 'success'
                ? 'bg-primary-50 border border-primary-200 text-primary-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}>
              {settingsMsg.type === 'success' ? '✓' : '✕'} {settingsMsg.text}
            </div>
          )}

          {!settings ? (
            <div className="card p-10 text-center text-gray-400">
              <div className="animate-spin w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full mx-auto mb-3" />
              Loading settings…
            </div>
          ) : (
            <>
              {/* ── Categories ── */}
              <div className="card p-6">
                <h2 className="font-semibold text-gray-900 mb-1">Food categories</h2>
                <p className="text-sm text-gray-500 mb-4">These categories appear in browse filters and shop registration.</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {(settings.categories || []).map(cat => (
                    <span key={cat} className="inline-flex items-center gap-1.5 bg-primary-50 text-primary-800 text-sm font-medium px-3 py-1.5 rounded-lg border border-primary-200">
                      {cat}
                      <button
                        onClick={() => handleRemoveCategory(cat)}
                        className="text-primary-400 hover:text-red-500 transition-colors ml-0.5"
                        title="Remove"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="input-field flex-1 text-sm"
                    placeholder="New category name…"
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                  />
                  <button
                    onClick={handleAddCategory}
                    disabled={!newCategory.trim() || settingsLoading}
                    className="btn-primary text-sm px-4 disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* ── Commission ── */}
              <div className="card p-6">
                <h2 className="font-semibold text-gray-900 mb-1">Commission rate</h2>
                <p className="text-sm text-gray-500 mb-4">
                  Percentage the platform earns from each completed order. Applied to all new orders immediately.
                </p>
                <div className="flex items-end gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Commission (%)</label>
                    <input
                      type="number" min={0} max={50} step={0.5}
                      className="input-field w-32"
                      value={Math.round((settings.commission_rate ?? 0.10) * 100)}
                      onChange={e => setSettings(s => ({ ...s, commission_rate: Number(e.target.value) / 100 }))}
                    />
                    <p className="text-xs text-gray-400 mt-1">Currently {Math.round((settings.commission_rate ?? 0.10) * 100)}%</p>
                  </div>
                  <button
                    onClick={() => saveSettings({ commission_rate: settings.commission_rate ?? 0.10 })}
                    disabled={settingsLoading}
                    className="btn-primary text-sm mb-6"
                  >
                    {settingsLoading ? 'Saving…' : 'Save rate'}
                  </button>
                </div>
              </div>

              {/* ── Discount thresholds ── */}
              <div className="card p-6">
                <h2 className="font-semibold text-gray-900 mb-1">Discount thresholds</h2>
                <p className="text-sm text-gray-500 mb-4">Platform-wide guidelines for shop owners when setting prices.</p>
                <div className="grid sm:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Min discount (%)</label>
                    <input
                      type="number" min={1} max={99}
                      className="input-field"
                      value={settings.min_discount_percent ?? 20}
                      onChange={e => setSettings(s => ({ ...s, min_discount_percent: e.target.value }))}
                    />
                    <p className="text-xs text-gray-400 mt-1">Minimum recommended discount</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max discount (%)</label>
                    <input
                      type="number" min={1} max={99}
                      className="input-field"
                      value={settings.max_discount_percent ?? 80}
                      onChange={e => setSettings(s => ({ ...s, max_discount_percent: e.target.value }))}
                    />
                    <p className="text-xs text-gray-400 mt-1">Maximum allowed discount</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Low stock alert (qty)</label>
                    <input
                      type="number" min={1} max={20}
                      className="input-field"
                      value={settings.low_stock_threshold ?? 2}
                      onChange={e => setSettings(s => ({ ...s, low_stock_threshold: e.target.value }))}
                    />
                    <p className="text-xs text-gray-400 mt-1">Notify shop when stock ≤ this</p>
                  </div>
                </div>
                <button
                  onClick={handleThresholdSave}
                  disabled={settingsLoading}
                  className="btn-primary text-sm"
                >
                  {settingsLoading ? 'Saving…' : 'Save thresholds'}
                </button>
              </div>

              {/* ── Notification templates ── */}
              <div className="card p-6">
                <h2 className="font-semibold text-gray-900 mb-1">Notification templates</h2>
                <p className="text-sm text-gray-500 mb-4">
                  Edit the in-app notification messages. Use the placeholder variables shown under each template.
                </p>
                <div className="space-y-5">
                  {NOTIF_KEYS.map(({ key, label, vars }) => (
                    <div key={key}>
                      <div className="flex items-start justify-between mb-1.5">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">{label}</label>
                          <p className="text-xs text-gray-400 mt-0.5">Variables: <span className="font-mono">{vars}</span></p>
                        </div>
                        <button
                          onClick={() => handleTemplateSave(key)}
                          disabled={settingsLoading}
                          className="text-xs btn-primary px-3 py-1.5 ml-4 flex-shrink-0"
                        >
                          Save
                        </button>
                      </div>
                      <textarea
                        rows={2}
                        className="input-field resize-none text-sm font-mono"
                        value={settings[key] ?? ''}
                        onChange={e => handleTemplateChange(key, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Shop Owners ── */}
      {tab === 'Shop Owners' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">{shops.length} partner branch{shops.length !== 1 ? 'es' : ''}</p>
          </div>
          <div className="card overflow-hidden">
            {shops.length === 0 ? (
              <div className="p-10 text-center text-gray-400">
                <p className="text-4xl mb-2">🏪</p>
                <p>No shops yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left border-b border-gray-100">
                      <th className="px-4 py-3 font-medium text-gray-500">#</th>
                      <th className="px-4 py-3 font-medium text-gray-500">Shop</th>
                      <th className="px-4 py-3 font-medium text-gray-500">Owner</th>
                      <th className="px-4 py-3 font-medium text-gray-500">Category</th>
                      <th className="px-4 py-3 font-medium text-gray-500">Listings</th>
                      <th className="px-4 py-3 font-medium text-gray-500">Orders</th>
                      <th className="px-4 py-3 font-medium text-gray-500">Status</th>
                      <th className="px-4 py-3 font-medium text-gray-500"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {shops.map(s => (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-400">{s.id}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{s.name}</p>
                          <p className="text-xs text-gray-400">{s.city}{s.address && ` · ${s.address}`}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-gray-700">{s.owner_name}</p>
                          <p className="text-xs text-gray-400">{s.owner_email}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{s.category}</td>
                        <td className="px-4 py-3 text-gray-600">{s.listing_count ?? 0}</td>
                        <td className="px-4 py-3 text-gray-600">{s.order_count ?? 0}</td>
                        <td className="px-4 py-3">
                          <span className={`badge ${s.is_active ? 'bg-primary-100 text-primary-800' : 'bg-gray-100 text-gray-500'}`}>
                            {s.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleToggleShop(s.id)}
                            disabled={toggling === s.id}
                            className={`text-xs px-2 py-1 rounded-md border transition-colors disabled:opacity-50 ${
                              s.is_active
                                ? 'text-red-600 border-red-200 bg-red-50 hover:bg-red-100'
                                : 'text-primary-700 border-primary-200 bg-primary-50 hover:bg-primary-100'
                            }`}
                          >
                            {toggling === s.id ? '…' : s.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  </div>
  )
}
