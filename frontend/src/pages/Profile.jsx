import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import { validateEmail, validateRequired, validatePhone, validatePassword, validateConfirm, formatUzbekPhone } from '../utils/validate'
import ImageUpload from '../components/ImageUpload'

function formatPrice(p) {
  return new Intl.NumberFormat('uz-UZ').format(Math.round(p))
}

export default function Profile() {
  const { user, refreshUser } = useAuth()
  const isShop = user?.role === 'shop'

  // Account form
  const [accountForm, setAccountForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  })
  const [accountLoading, setAccountLoading] = useState(false)
  const [accountMsg, setAccountMsg] = useState(null)
  const [accountTouched, setAccountTouched] = useState({})

  // Password form
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm: '' })
  const [pwLoading, setPwLoading] = useState(false)
  const [pwMsg, setPwMsg] = useState(null)
  const [pwTouched, setPwTouched] = useState({})

  const accountErrors = {
    name:  accountTouched.name  ? validateRequired(accountForm.name, 'Name') : '',
    email: accountTouched.email ? validateEmail(accountForm.email) : '',
    phone: accountTouched.phone ? validatePhone(accountForm.phone) : '',
  }
  const pwErrors = {
    current_password: pwTouched.current_password ? validateRequired(pwForm.current_password, 'Current password') : '',
    new_password:     pwTouched.new_password     ? validatePassword(pwForm.new_password) : '',
    confirm:          pwTouched.confirm          ? validateConfirm(pwForm.confirm, pwForm.new_password) : '',
  }

  // Shop form (shop role only)
  const [shops, setShops] = useState([])
  const [selectedShopIdx, setSelectedShopIdx] = useState(0)
  const [shopForm, setShopForm] = useState({})
  const [shopLoading, setShopLoading] = useState(false)
  const [shopMsg, setShopMsg] = useState(null)

  // Customer stats
  const [stats, setStats] = useState(null)

  useEffect(() => {
    if (isShop) {
      api.get('/shops/my').then(res => {
        setShops(res.data)
        if (res.data.length > 0) {
          const s = res.data[0]
          setShopForm({
            name: s.name || '',
            description: s.description || '',
            address: s.address || '',
            city: s.city || '',
            category: s.category || '',
            image_url: s.image_url || '',
            lat: s.lat ?? '',
            lng: s.lng ?? '',
          })
        }
      }).catch(() => {})
    } else {
      // fetch customer orders for stats
      api.get('/orders/').then(res => {
        const orders = Array.isArray(res.data) ? res.data : []
        const completed = orders.filter(o => o.status === 'picked_up')
        const totalSpent = completed.reduce((s, o) => s + o.total_price, 0)
        const totalSaved = completed.reduce((s, o) => {
          // we don't have original price here, estimate from total_price (best effort)
          return s
        }, 0)
        setStats({
          total: orders.length,
          completed: completed.length,
          cancelled: orders.filter(o => o.status === 'cancelled').length,
          spent: totalSpent,
        })
      }).catch(() => {})
    }
  }, [isShop])

  const handleShopTabChange = (idx) => {
    setSelectedShopIdx(idx)
    const s = shops[idx]
    setShopForm({
      name: s.name || '',
      description: s.description || '',
      address: s.address || '',
      city: s.city || '',
      category: s.category || '',
      image_url: s.image_url || '',
      lat: s.lat ?? '',
      lng: s.lng ?? '',
    })
    setShopMsg(null)
  }

  const handleAccountSave = async (e) => {
    e.preventDefault()
    setAccountTouched({ name: true, email: true, phone: true })
    if (accountErrors.name || accountErrors.email || accountErrors.phone) return
    setAccountLoading(true)
    setAccountMsg(null)
    try {
      await api.put('/auth/me', {
        name: accountForm.name,
        email: accountForm.email,
        phone: accountForm.phone,
      })
      await refreshUser()
      setAccountMsg({ type: 'success', text: 'Profile updated successfully.' })
    } catch (err) {
      setAccountMsg({ type: 'error', text: err.response?.data?.error || 'Failed to update profile.' })
    } finally {
      setAccountLoading(false)
    }
  }

  const handlePasswordSave = async (e) => {
    e.preventDefault()
    setPwTouched({ current_password: true, new_password: true, confirm: true })
    if (pwErrors.current_password || pwErrors.new_password || pwErrors.confirm) return
    setPwMsg(null)
    setPwLoading(true)
    try {
      await api.put('/auth/me', {
        current_password: pwForm.current_password,
        new_password: pwForm.new_password,
      })
      setPwForm({ current_password: '', new_password: '', confirm: '' })
      setPwMsg({ type: 'success', text: 'Password changed successfully.' })
    } catch (err) {
      setPwMsg({ type: 'error', text: err.response?.data?.error || 'Failed to change password.' })
    } finally {
      setPwLoading(false)
    }
  }

  const handleShopSave = async (e) => {
    e.preventDefault()
    setShopLoading(true)
    setShopMsg(null)
    try {
      const shop = shops[selectedShopIdx]
      await api.put(`/shops/${shop.id}`, shopForm)
      const res = await api.get('/shops/my')
      setShops(res.data)
      setShopMsg({ type: 'success', text: 'Branch info updated successfully.' })
    } catch (err) {
      setShopMsg({ type: 'error', text: err.response?.data?.error || 'Failed to update branch.' })
    } finally {
      setShopLoading(false)
    }
  }

  const Alert = ({ msg }) => {
    if (!msg) return null
    return (
      <div className={`text-sm rounded-lg px-4 py-3 mt-3 ${
        msg.type === 'success'
          ? 'bg-primary-50 text-primary-700 border border-primary-200'
          : 'bg-red-50 text-red-700 border border-red-200'
      }`}>
        {msg.text}
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your account and settings</p>
      </div>

      {/* Customer stats */}
      {!isShop && stats && (
        <div className="grid grid-cols-3 gap-4">
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-xs text-gray-500 mt-0.5">Total orders</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-primary-600">{stats.completed}</p>
            <p className="text-xs text-gray-500 mt-0.5">Picked up</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-red-500">{stats.cancelled}</p>
            <p className="text-xs text-gray-500 mt-0.5">Cancelled</p>
          </div>
        </div>
      )}

      {/* Account info */}
      <div className="card p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Account information</h2>
        <form onSubmit={handleAccountSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
            <input
              type="text"
              className={`input-field ${accountErrors.name ? 'border-red-400' : ''}`}
              value={accountForm.name}
              onChange={e => setAccountForm(f => ({ ...f, name: e.target.value }))}
              onBlur={() => setAccountTouched(t => ({ ...t, name: true }))}
            />
            {accountErrors.name && <p className="mt-1 text-xs text-red-500">{accountErrors.name}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              className={`input-field ${accountErrors.email ? 'border-red-400' : ''}`}
              value={accountForm.email}
              onChange={e => setAccountForm(f => ({ ...f, email: e.target.value }))}
              onBlur={() => setAccountTouched(t => ({ ...t, email: true }))}
            />
            {accountErrors.email && <p className="mt-1 text-xs text-red-500">{accountErrors.email}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone number</label>
            <input
              type="text"
              className={`input-field ${accountErrors.phone ? 'border-red-400' : ''}`}
              value={accountForm.phone}
              onChange={e => setAccountForm(f => ({ ...f, phone: formatUzbekPhone(e.target.value) }))}
              onBlur={() => setAccountTouched(t => ({ ...t, phone: true }))}
              placeholder="+998 90 123 45 67"
            />
            {accountErrors.phone && <p className="mt-1 text-xs text-red-500">{accountErrors.phone}</p>}
          </div>
          <Alert msg={accountMsg} />
          <button type="submit" disabled={accountLoading} className="btn-primary text-sm">
            {accountLoading ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </div>

      {/* Shop branch info */}
      {isShop && shops.length > 0 && (
        <div className="card p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Branch information</h2>

          {shops.length > 1 && (
            <div className="flex gap-2 mb-4 flex-wrap">
              {shops.map((s, idx) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleShopTabChange(idx)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    selectedShopIdx === idx
                      ? 'bg-primary-700 text-white border-primary-700'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'
                  }`}
                >
                  {s.address?.split(',')[0] || `Branch ${idx + 1}`}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleShopSave} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Branch name</label>
                <input
                  type="text"
                  className="input-field"
                  value={shopForm.name || ''}
                  onChange={e => setShopForm(f => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  className="input-field"
                  value={shopForm.category || ''}
                  onChange={e => setShopForm(f => ({ ...f, category: e.target.value }))}
                >
                  <option value="Grocery">Grocery</option>
                  <option value="Bakery">Bakery</option>
                  <option value="Restaurant">Restaurant</option>
                  <option value="Fast Food">Fast Food</option>
                  <option value="Cafe">Cafe</option>
                  <option value="General">General</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                className="input-field resize-none"
                rows={3}
                value={shopForm.description || ''}
                onChange={e => setShopForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Tell customers about your branch…"
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  className="input-field"
                  value={shopForm.address || ''}
                  onChange={e => setShopForm(f => ({ ...f, address: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  className="input-field"
                  value={shopForm.city || ''}
                  onChange={e => setShopForm(f => ({ ...f, city: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                <input
                  type="number"
                  step="any"
                  className="input-field"
                  value={shopForm.lat ?? ''}
                  onChange={e => setShopForm(f => ({ ...f, lat: e.target.value ? parseFloat(e.target.value) : '' }))}
                  placeholder="e.g. 41.2995"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                <input
                  type="number"
                  step="any"
                  className="input-field"
                  value={shopForm.lng ?? ''}
                  onChange={e => setShopForm(f => ({ ...f, lng: e.target.value ? parseFloat(e.target.value) : '' }))}
                  placeholder="e.g. 69.2401"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cover image</label>
              <ImageUpload
                value={shopForm.image_url || ''}
                onChange={url => setShopForm(f => ({ ...f, image_url: url }))}
              />
            </div>
            <Alert msg={shopMsg} />
            <button type="submit" disabled={shopLoading} className="btn-primary text-sm">
              {shopLoading ? 'Saving…' : 'Save branch info'}
            </button>
          </form>
        </div>
      )}

      {/* Change password */}
      <div className="card p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Change password</h2>
        <form onSubmit={handlePasswordSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current password</label>
            <input
              type="password"
              className={`input-field ${pwErrors.current_password ? 'border-red-400' : ''}`}
              value={pwForm.current_password}
              onChange={e => setPwForm(f => ({ ...f, current_password: e.target.value }))}
              onBlur={() => setPwTouched(t => ({ ...t, current_password: true }))}
            />
            {pwErrors.current_password && <p className="mt-1 text-xs text-red-500">{pwErrors.current_password}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
            <input
              type="password"
              className={`input-field ${pwErrors.new_password ? 'border-red-400' : ''}`}
              value={pwForm.new_password}
              onChange={e => setPwForm(f => ({ ...f, new_password: e.target.value }))}
              onBlur={() => setPwTouched(t => ({ ...t, new_password: true }))}
            />
            {pwErrors.new_password && <p className="mt-1 text-xs text-red-500">{pwErrors.new_password}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm new password</label>
            <input
              type="password"
              className={`input-field ${pwErrors.confirm ? 'border-red-400' : ''}`}
              value={pwForm.confirm}
              onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
              onBlur={() => setPwTouched(t => ({ ...t, confirm: true }))}
            />
            {pwErrors.confirm && <p className="mt-1 text-xs text-red-500">{pwErrors.confirm}</p>}
          </div>
          <Alert msg={pwMsg} />
          <button type="submit" disabled={pwLoading} className="btn-primary text-sm">
            {pwLoading ? 'Changing…' : 'Change password'}
          </button>
        </form>
      </div>

      {/* Account meta */}
      <div className="card p-5 flex items-center gap-4">
        <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-primary-800 font-bold text-lg">{user?.name?.charAt(0).toUpperCase()}</span>
        </div>
        <div>
          <p className="font-semibold text-gray-900">{user?.name}</p>
          <p className="text-sm text-gray-500">{user?.email}</p>
          <span className={`badge mt-1 text-xs ${isShop ? 'bg-primary-100 text-primary-800' : 'bg-gray-100 text-gray-600'}`}>
            {user?.role}
          </span>
        </div>
      </div>
    </div>
  )
}
