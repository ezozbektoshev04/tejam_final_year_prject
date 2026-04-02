import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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

const TABS = ['Overview', 'Customers', 'Shop Owners']

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

  useEffect(() => {
    fetchAll()
  }, [])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [statsRes, custRes, shopRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/users?role=customer'),
        api.get('/admin/shops'),
      ])
      setStats(statsRes.data)
      setCustomers(custRes.data)
      setShops(shopRes.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
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
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit mb-8">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {tab === 'Overview' && stats && (
        <div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard title="Total customers" value={stats.total_customers} sub="registered accounts" icon="👤" />
            <StatCard title="Partner branches" value={stats.total_shops} sub="shop owner accounts" icon="🏪" />
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
