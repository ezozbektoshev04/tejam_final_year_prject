import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import NotificationBell from './NotificationBell'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/')
    setDropdownOpen(false)
    setMobileOpen(false)
  }

  const navLinkClass = ({ isActive }) =>
    `text-sm font-medium transition-colors ${isActive
      ? 'text-primary-700'
      : 'text-gray-600 hover:text-primary-700'
    }`

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">

          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img src="/logo-color.png" alt="Tejam" className="h-14 w-auto" />
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            {user?.role !== 'admin' && <NavLink to="/" className={navLinkClass} end>Home</NavLink>}
            {user?.role === 'admin' && <NavLink to="/admin" className={navLinkClass}>Dashboard</NavLink>}
            {user?.role !== 'shop' && user?.role !== 'admin' && <NavLink to="/browse" className={navLinkClass}>Browse</NavLink>}
            {user && user?.role !== 'admin' && <NavLink to="/ai" className={navLinkClass}>AI Assistant</NavLink>}
            {user?.role === 'shop' && (
              <>
                <NavLink to="/dashboard" className={navLinkClass}>Dashboard</NavLink>
                <NavLink to="/shop-orders" className={navLinkClass}>Orders</NavLink>
                <NavLink to="/listings" className={navLinkClass}>Listings</NavLink>
              </>
            )}
            {user?.role === 'customer' && (
              <NavLink to="/orders" className={navLinkClass}>My Orders</NavLink>
            )}
          </div>

          {/* Auth */}
          <div className="hidden md:flex items-center gap-3">
            {user && user.role !== 'admin' && <NotificationBell />}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 focus:outline-none"
                >
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-primary-800 font-semibold text-sm">
                      {user.name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="max-w-24 truncate">{user.name}</span>
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-xs text-gray-400">Signed in as</p>
                      <p className="text-sm font-medium text-gray-900 truncate">{user.email}</p>
                      <span className={`badge mt-1 ${user.role === 'shop'
                        ? 'bg-primary-100 text-primary-800'
                        : 'bg-primary-50 text-primary-700'
                      }`}>
                        {user.role}
                      </span>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                  Log in
                </Link>
                <Link to="/register" className="btn-primary text-sm">
                  Sign up
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white">
          <div className="px-4 py-3 space-y-1">
            {user?.role !== 'admin' && (
              <NavLink to="/" className={navLinkClass} end onClick={() => setMobileOpen(false)}>
                <div className="py-2">Home</div>
              </NavLink>
            )}
            {user?.role === 'admin' && (
              <NavLink to="/admin" className={navLinkClass} onClick={() => setMobileOpen(false)}>
                <div className="py-2">Dashboard</div>
              </NavLink>
            )}
            {user?.role !== 'shop' && user?.role !== 'admin' && (
              <NavLink to="/browse" className={navLinkClass} onClick={() => setMobileOpen(false)}>
                <div className="py-2">Browse</div>
              </NavLink>
            )}
            {user && user?.role !== 'admin' && (
              <NavLink to="/ai" className={navLinkClass} onClick={() => setMobileOpen(false)}>
                <div className="py-2">AI Assistant</div>
              </NavLink>
            )}
            {user?.role === 'shop' && (
              <>
                <NavLink to="/dashboard" className={navLinkClass} onClick={() => setMobileOpen(false)}>
                  <div className="py-2">Dashboard</div>
                </NavLink>
                <NavLink to="/shop-orders" className={navLinkClass} onClick={() => setMobileOpen(false)}>
                  <div className="py-2">Orders</div>
                </NavLink>
                <NavLink to="/listings" className={navLinkClass} onClick={() => setMobileOpen(false)}>
                  <div className="py-2">Listings</div>
                </NavLink>
              </>
            )}
            {user?.role === 'customer' && (
              <NavLink to="/orders" className={navLinkClass} onClick={() => setMobileOpen(false)}>
                <div className="py-2">My Orders</div>
              </NavLink>
            )}
            <div className="pt-3 border-t border-gray-100">
              {user ? (
                <div>
                  <p className="text-sm text-gray-500 py-1">{user.name}</p>
                  <button onClick={handleLogout} className="text-sm text-red-600 font-medium py-2">
                    Sign out
                  </button>
                </div>
              ) : (
                <div className="flex gap-3 py-2">
                  <Link to="/login" className="text-sm font-medium text-gray-600" onClick={() => setMobileOpen(false)}>
                    Log in
                  </Link>
                  <Link to="/register" className="btn-primary text-sm" onClick={() => setMobileOpen(false)}>
                    Sign up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
