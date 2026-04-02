import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'

import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Browse from './pages/Browse'
import FoodDetail from './pages/FoodDetail'
import Orders from './pages/Orders'
import ShopDashboard from './pages/ShopDashboard'
import ShopListings from './pages/ShopListings'
import AIAssistant from './pages/AIAssistant'
import PickupConfirm from './pages/PickupConfirm'
import AdminPanel from './pages/AdminPanel'
import AdminLogin from './pages/AdminLogin'

function Layout() {
  const location = useLocation()
  const hideNavbar = location.pathname.startsWith('/admin')

  return (
    <div className="min-h-screen bg-white">
      {!hideNavbar && <Navbar />}
      <Routes>
        {/* Public */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/browse" element={<Browse />} />
        <Route path="/food/:id" element={<FoodDetail />} />
        <Route path="/pickup/:token" element={<PickupConfirm />} />

        {/* Customer */}
        <Route path="/orders" element={
          <ProtectedRoute role="customer">
            <Orders />
          </ProtectedRoute>
        } />

        {/* Shop */}
        <Route path="/dashboard" element={
          <ProtectedRoute role="shop">
            <ShopDashboard />
          </ProtectedRoute>
        } />
        <Route path="/listings" element={
          <ProtectedRoute role="shop">
            <ShopListings />
          </ProtectedRoute>
        } />

        {/* Both */}
        <Route path="/ai" element={
          <ProtectedRoute>
            <AIAssistant />
          </ProtectedRoute>
        } />

        {/* Admin */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={
          <ProtectedRoute role="admin" loginPath="/admin/login">
            <AdminPanel />
          </ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Layout />
      </BrowserRouter>
    </AuthProvider>
  )
}
