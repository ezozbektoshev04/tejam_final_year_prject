import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const CITIES = ['Tashkent']
const CATEGORIES = ['Bakery', 'Restaurant', 'Grocery', 'Cafe', 'Fast Food', 'Sweets', 'General']

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState(1) // 1: role, 2: details
  const [role, setRole] = useState('')
  const [form, setForm] = useState({
    email: '', password: '', name: '', phone: '',
    shop_name: '', shop_address: '', shop_city: 'Tashkent',
    shop_category: 'Restaurant', shop_description: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleRoleSelect = (selectedRole) => {
    setRole(selectedRole)
    setStep(2)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setLoading(true)
    try {
      const userData = await register({ ...form, role })
      if (userData.role === 'shop') navigate('/dashboard')
      else navigate('/browse')
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (step === 1) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Join Tejam</h1>
            <p className="text-gray-500 mt-1">How will you use Tejam?</p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <button
              onClick={() => handleRoleSelect('customer')}
              className="card p-6 text-left hover:shadow-md hover:border-primary-300 border-2 border-transparent transition-all group"
            >
              <div className="text-4xl mb-3">🛒</div>
              <h2 className="text-lg font-bold text-gray-900 group-hover:text-primary-600">I'm a customer</h2>
              <p className="text-gray-500 text-sm mt-1">
                Browse and buy discounted surplus food from local shops and restaurants.
              </p>
              <ul className="mt-3 space-y-1">
                {['Up to 70% off', 'Support local shops', 'Reduce food waste'].map(f => (
                  <li key={f} className="text-xs text-gray-500 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 text-primary-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
            </button>

            <button
              onClick={() => handleRoleSelect('shop')}
              className="card p-6 text-left hover:shadow-md hover:border-accent-300 border-2 border-transparent transition-all group"
            >
              <div className="text-4xl mb-3">🏪</div>
              <h2 className="text-lg font-bold text-gray-900 group-hover:text-accent-600">I own a shop</h2>
              <p className="text-gray-500 text-sm mt-1">
                List your surplus food and reach thousands of customers. Free to join.
              </p>
              <ul className="mt-3 space-y-1">
                {['Reduce food waste', 'Earn more revenue', 'AI-powered pricing'].map(f => (
                  <li key={f} className="text-xs text-gray-500 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 text-accent-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
            </button>
          </div>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <button onClick={() => setStep(1)} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mx-auto mb-3">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {role === 'shop' ? 'Register your shop' : 'Create your account'}
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            {role === 'shop' ? '🏪 Shop owner account' : '🛒 Customer account'}
          </p>
        </div>

        <div className="card p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Full name *</label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="Your full name"
                  required
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="Min. 6 chars"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="+998 90 123 45 67"
                />
              </div>
            </div>

            {role === 'shop' && (
              <div className="pt-3 border-t border-gray-100 space-y-4">
                <h3 className="text-sm font-semibold text-gray-700">Shop details</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Shop name *</label>
                  <input
                    type="text"
                    name="shop_name"
                    value={form.shop_name}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="e.g. Toshkent Non"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                    <select name="shop_city" value={form.shop_city} onChange={handleChange} className="input-field">
                      {CITIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                    <select name="shop_category" value={form.shop_category} onChange={handleChange} className="input-field">
                      {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input
                    type="text"
                    name="shop_address"
                    value={form.shop_address}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="Street address"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    name="shop_description"
                    value={form.shop_description}
                    onChange={handleChange}
                    className="input-field resize-none"
                    rows={2}
                    placeholder="Brief description of your shop"
                  />
                </div>
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 mt-2">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating account…
                </span>
              ) : 'Create account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-4">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
