import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { validateEmail, validatePassword, validateRequired, validatePhone } from '../utils/validate'

const CATEGORIES = ['Bakery', 'Restaurant', 'Grocery', 'Cafe', 'Fast Food', 'Sweets', 'General']

function getPasswordStrength(pw) {
  if (!pw) return { score: 0, label: '', color: '' }
  let score = 0
  if (pw.length >= 6) score++
  if (pw.length >= 10) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  if (score <= 1) return { score, label: 'Weak', color: 'bg-red-400' }
  if (score <= 2) return { score, label: 'Fair', color: 'bg-amber-400' }
  if (score <= 3) return { score, label: 'Good', color: 'bg-blue-400' }
  return { score, label: 'Strong', color: 'bg-primary-500' }
}

const CUSTOMER_PERKS = ['Up to 70% off surplus food', 'QR code pickup', 'Real-time order tracking', 'AI-powered recommendations']
const SHOP_PERKS = ['Recover revenue from unsold food', 'AI pricing & descriptions', 'Sales analytics dashboard', 'Multi-branch management']

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState(1)
  const [role, setRole] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [form, setForm] = useState({
    email: '', password: '', name: '', phone: '',
    shop_name: '', shop_address: '', shop_city: 'Tashkent',
    shop_category: 'Restaurant', shop_description: '',
  })
  const [touched, setTouched] = useState({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })
  const handleBlur = (e) => setTouched(t => ({ ...t, [e.target.name]: true }))
  const strength = getPasswordStrength(form.password)

  const fieldErrors = {
    name:      touched.name      ? validateRequired(form.name, 'Full name') : '',
    email:     touched.email     ? validateEmail(form.email) : '',
    password:  touched.password  ? validatePassword(form.password) : '',
    phone:     touched.phone     ? validatePhone(form.phone) : '',
    shop_name: touched.shop_name ? validateRequired(form.shop_name, 'Shop name') : '',
  }

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
    setTouched({ name: true, email: true, password: true, phone: true, shop_name: true })
    const hasErrors = fieldErrors.name || fieldErrors.email || fieldErrors.password || fieldErrors.phone
      || (role === 'shop' && !form.shop_name.trim())
    if (hasErrors) return
    setLoading(true)
    try {
      const res = await register({ ...form, role })
      navigate('/verify-email', { state: { email: form.email } })
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  /* ── Step 1: Role selection ── */
  if (step === 1) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex">

        {/* Left brand panel */}
        <div className="hidden lg:flex lg:w-1/2 bg-primary-700 flex-col justify-between p-12 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 left-10 w-64 h-64 rounded-full bg-white" />
            <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-white" />
          </div>
          <div className="relative">
            <img src="/logo-white.png" alt="Tejam" className="h-12 w-auto" />
          </div>
          <div className="relative">
            <h2 className="text-3xl font-bold text-white leading-tight mb-4">
              Join Tashkent's food-saving movement
            </h2>
            <p className="text-primary-200 text-base leading-relaxed">
              Whether you're hunting for deals or selling surplus food — Tejam connects you with the right people.
            </p>
          </div>
          <p className="relative text-primary-300 text-sm">© 2026 Tejam · Tashkent, Uzbekistan</p>
        </div>

        {/* Right: role picker */}
        <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">

            <div className="lg:hidden text-center mb-8">
              <img src="/logo-color.png" alt="Tejam" className="h-12 w-auto mx-auto" />
            </div>

            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
              <p className="text-gray-500 mt-1 text-sm">How will you use Tejam?</p>
            </div>

            <div className="space-y-4">
              {/* Customer card */}
              <button
                onClick={() => handleRoleSelect('customer')}
                className="w-full text-left border-2 border-gray-200 hover:border-primary-400 hover:bg-primary-50 rounded-2xl p-5 transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary-100 group-hover:bg-primary-200 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 transition-colors">
                    🛒
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h2 className="text-base font-bold text-gray-900 group-hover:text-primary-700">I'm a customer</h2>
                      <svg className="w-5 h-5 text-gray-300 group-hover:text-primary-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                    <p className="text-gray-500 text-sm mt-0.5 mb-3">Buy discounted surplus food from local shops</p>
                    <div className="grid grid-cols-2 gap-1">
                      {CUSTOMER_PERKS.map(p => (
                        <span key={p} className="text-xs text-gray-500 flex items-center gap-1">
                          <svg className="w-3 h-3 text-primary-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </button>

              {/* Shop card */}
              <button
                onClick={() => handleRoleSelect('shop')}
                className="w-full text-left border-2 border-gray-200 hover:border-primary-400 hover:bg-primary-50 rounded-2xl p-5 transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary-100 group-hover:bg-primary-200 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 transition-colors">
                    🏪
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h2 className="text-base font-bold text-gray-900 group-hover:text-primary-700">I own a shop</h2>
                      <svg className="w-5 h-5 text-gray-300 group-hover:text-primary-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                    <p className="text-gray-500 text-sm mt-0.5 mb-3">List surplus food and reach new customers — free to join</p>
                    <div className="grid grid-cols-2 gap-1">
                      {SHOP_PERKS.map(p => (
                        <span key={p} className="text-xs text-gray-500 flex items-center gap-1">
                          <svg className="w-3 h-3 text-primary-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </button>
            </div>

            <p className="text-center text-sm text-gray-500 mt-6">
              Already have an account?{' '}
              <Link to="/login" className="text-primary-600 font-semibold hover:underline">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    )
  }

  /* ── Step 2: Details form ── */
  return (
    <div className="min-h-[calc(100vh-4rem)] flex">

      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary-700 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-64 h-64 rounded-full bg-white" />
          <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-white" />
        </div>
        <div className="relative">
          <img src="/logo-white.png" alt="Tejam" className="h-12 w-auto" />
        </div>
        <div className="relative">
          <div className="inline-flex items-center gap-2 bg-white/20 text-white text-sm font-medium px-4 py-2 rounded-full mb-5">
            {role === 'shop' ? '🏪 Shop owner account' : '🛒 Customer account'}
          </div>
          <h2 className="text-2xl font-bold text-white leading-tight mb-4">
            {role === 'shop'
              ? 'Start recovering revenue from unsold food today.'
              : 'Start saving money and reducing food waste today.'}
          </h2>
          <ul className="space-y-3">
            {(role === 'shop' ? SHOP_PERKS : CUSTOMER_PERKS).map(p => (
              <li key={p} className="flex items-center gap-3 text-primary-100 text-sm">
                <svg className="w-4 h-4 text-primary-300 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {p}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-primary-300 text-sm">© 2026 Tejam · Tashkent, Uzbekistan</p>
      </div>

      {/* Right: form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12 overflow-y-auto">
        <div className="w-full max-w-md">

          <div className="lg:hidden text-center mb-6">
            <img src="/logo-color.png" alt="Tejam" className="h-12 w-auto mx-auto" />
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <div className="flex items-center gap-2 ml-auto">
              <div className="w-6 h-1.5 rounded-full bg-primary-200" />
              <div className="w-6 h-1.5 rounded-full bg-primary-700" />
            </div>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              {role === 'shop' ? 'Register your shop' : 'Create your account'}
            </h1>
            <p className="text-gray-500 mt-1 text-sm">Fill in your details to get started</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Personal info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full name *</label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`input-field ${fieldErrors.name ? 'border-red-400' : ''}`}
                  placeholder="Your full name"
                  autoComplete="name"
                />
                {fieldErrors.name && <p className="mt-1 text-xs text-red-500">{fieldErrors.name}</p>}
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address *</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`input-field ${fieldErrors.email ? 'border-red-400' : ''}`}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
                {fieldErrors.email && <p className="mt-1 text-xs text-red-500">{fieldErrors.email}</p>}
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password *</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`input-field pr-10 ${fieldErrors.password ? 'border-red-400' : ''}`}
                    placeholder="Min. 6 characters"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showPw ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                {fieldErrors.password && <p className="mt-1 text-xs text-red-500">{fieldErrors.password}</p>}
                {/* Password strength bar */}
                {form.password && (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-1">
                      {[1, 2, 3, 4].map(i => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            i <= strength.score ? strength.color : 'bg-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                    <p className={`text-xs ${
                      strength.score <= 1 ? 'text-red-500' :
                      strength.score <= 2 ? 'text-amber-600' :
                      strength.score <= 3 ? 'text-blue-600' : 'text-primary-600'
                    }`}>
                      {strength.label} password
                    </p>
                  </div>
                )}
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone number</label>
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`input-field ${fieldErrors.phone ? 'border-red-400' : ''}`}
                  placeholder="+998 90 123 45 67"
                  autoComplete="tel"
                />
                {fieldErrors.phone && <p className="mt-1 text-xs text-red-500">{fieldErrors.phone}</p>}
              </div>
            </div>

            {/* Shop details */}
            {role === 'shop' && (
              <div className="pt-4 border-t border-gray-100 space-y-4">
                <p className="text-sm font-semibold text-gray-700">Branch details</p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Shop / branch name *</label>
                  <input
                    type="text"
                    name="shop_name"
                    value={form.shop_name}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`input-field ${fieldErrors.shop_name ? 'border-red-400' : ''}`}
                    placeholder="e.g. Toshkent Non — Chilonzor"
                  />
                  {fieldErrors.shop_name && <p className="mt-1 text-xs text-red-500">{fieldErrors.shop_name}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">City *</label>
                    <select name="shop_city" value={form.shop_city} onChange={handleChange} className="input-field">
                      <option>Tashkent</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Category *</label>
                    <select name="shop_category" value={form.shop_category} onChange={handleChange} className="input-field">
                      {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
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

            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-sm font-semibold">
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

          <p className="text-center text-sm text-gray-500 mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
