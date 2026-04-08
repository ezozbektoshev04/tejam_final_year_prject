import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { validateEmail, validatePassword } from '../utils/validate'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/'

  const [form, setForm] = useState({ email: '', password: '' })
  const [touched, setTouched] = useState({})
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const fieldErrors = {
    email: touched.email ? validateEmail(form.email) : '',
    password: touched.password ? validatePassword(form.password) : '',
  }

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })
  const handleBlur = (e) => setTouched(t => ({ ...t, [e.target.name]: true }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setTouched({ email: true, password: true })
    if (fieldErrors.email || fieldErrors.password) return
    setError('')
    setLoading(true)
    try {
      const user = await login(form.email, form.password)
      if (user.role === 'admin') navigate('/admin')
      else if (user.role === 'shop') navigate('/dashboard')
      else navigate(from)
    } catch (err) {
      if (err.response?.data?.unverified) {
        navigate('/verify-email', { state: { email: form.email } })
        return
      }
      setError(err.response?.data?.error || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = (role) => {
    if (role === 'shop') setForm({ email: 'korzinka@tejam.uz', password: 'password123' })
    else setForm({ email: 'customer1@tejam.uz', password: 'password123' })
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex">

      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary-700 flex-col justify-between p-12 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-64 h-64 rounded-full bg-white" />
          <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-white" />
          <div className="absolute top-1/2 left-1/3 w-40 h-40 rounded-full bg-white" />
        </div>

        <div className="relative">
          <img src="/logo-white.png" alt="Tejam" className="h-12 w-auto" />
        </div>

        <div className="relative">
          <h2 className="text-3xl font-bold text-white leading-tight mb-4">
            Good food.<br />Less waste.<br />Real savings.
          </h2>
          <p className="text-primary-200 text-base leading-relaxed mb-8">
            Join thousands of Tashkent residents saving money and reducing food waste every day.
          </p>
          <div className="grid grid-cols-3 gap-4">
            {[
              { value: '10', label: 'Partner branches' },
              { value: '70%', label: 'Max discount' },
              { value: '🇺🇿', label: 'Tashkent' },
            ].map(s => (
              <div key={s.label} className="bg-white/10 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-white">{s.value}</p>
                <p className="text-primary-200 text-xs mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <p className="text-primary-300 text-sm">© 2026 Tejam · Tashkent, Uzbekistan</p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <img src="/logo-color.png" alt="Tejam" className="h-12 w-auto mx-auto" />
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
            <p className="text-gray-500 mt-1 text-sm">Sign in to your Tejam account</p>
          </div>

          {/* Demo accounts */}
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">Try a demo account</p>
            <div className="flex gap-2">
              <button
                onClick={() => fillDemo('customer')}
                className="flex-1 text-xs bg-white border border-amber-200 text-amber-800 px-3 py-2 rounded-lg hover:bg-amber-100 transition-colors font-medium"
              >
                👤 Customer
              </button>
              <button
                onClick={() => fillDemo('shop')}
                className="flex-1 text-xs bg-white border border-amber-200 text-amber-800 px-3 py-2 rounded-lg hover:bg-amber-100 transition-colors font-medium"
              >
                🏪 Shop owner
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`input-field ${fieldErrors.email ? 'border-red-400 focus:border-red-400' : ''}`}
                placeholder="you@example.com"
                autoComplete="email"
              />
              {fieldErrors.email && <p className="mt-1 text-xs text-red-500">{fieldErrors.email}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <Link to="/forgot-password" className="text-xs text-primary-600 hover:underline font-medium">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`input-field pr-10 ${fieldErrors.password ? 'border-red-400 focus:border-red-400' : ''}`}
                  placeholder="••••••••"
                  autoComplete="current-password"
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
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-sm font-semibold"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in…
                </span>
              ) : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary-600 font-semibold hover:underline">
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
