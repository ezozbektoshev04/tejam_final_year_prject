import { useEffect, useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

function formatPrice(price) {
  return new Intl.NumberFormat('uz-UZ').format(Math.round(price)) + ' UZS'
}

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams()
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const sessionId = searchParams.get('session_id')
  const orderId = searchParams.get('order_id')

  const [order, setOrder] = useState(null)
  const [verifying, setVerifying] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      navigate('/login')
      return
    }
    if (!sessionId || !orderId) {
      navigate('/')
      return
    }

    api.post('/payments/verify', {
      session_id: sessionId,
      order_id: parseInt(orderId),
    })
      .then(res => setOrder(res.data))
      .catch(err => setError(err.response?.data?.error || 'Could not verify payment.'))
      .finally(() => setVerifying(false))
  }, [sessionId, orderId, user, authLoading, navigate])

  if (authLoading || verifying) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Confirming your payment…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
        <div className="max-w-sm w-full text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Payment verification failed</h1>
          <p className="text-gray-500 text-sm mb-6">{error}</p>
          <Link to="/orders" className="btn-primary px-6 py-2.5 text-sm">
            View my orders
          </Link>
        </div>
      </div>
    )
  }

  if (!order) return null

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        {/* Success header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Payment confirmed!</h1>
          <p className="text-gray-500 text-sm mt-1">Your order has been placed successfully</p>
        </div>

        {/* Order card */}
        <div className="card p-5 mb-5">
          <div className="flex items-start gap-4">
            {order.food_item_image && (
              <img
                src={order.food_item_image}
                alt={order.food_item_name}
                className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                onError={(e) => { e.target.style.display = 'none' }}
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 leading-tight">{order.food_item_name}</p>
              <p className="text-sm text-gray-500 mt-0.5">{order.shop_name}</p>
              <p className="text-xs text-gray-400 mt-0.5">{order.shop_city}{order.shop_address && ` · ${order.shop_address}`}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-bold text-primary-600">{formatPrice(order.total_price)}</p>
              <p className="text-xs text-gray-400 mt-0.5">×{order.quantity}</p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Order ID</span>
              <span className="font-mono text-gray-700">#{order.id}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Status</span>
              <span className="badge bg-primary-100 text-primary-800">Awaiting pickup</span>
            </div>
          </div>
        </div>

        {/* QR notice */}
        <div className="p-4 bg-primary-50 border border-primary-100 rounded-xl mb-6">
          <div className="flex items-start gap-3">
            <span className="text-2xl">📱</span>
            <div>
              <p className="font-semibold text-primary-900 text-sm">Show QR code at pickup</p>
              <p className="text-primary-700 text-xs mt-0.5">
                Open your orders to find the QR code. Show it to the shop staff when you arrive to collect your order.
              </p>
            </div>
          </div>
        </div>

        {/* Stripe test card notice */}
        <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg mb-6 text-xs text-amber-800">
          <span className="font-semibold">Test mode</span> — This was a simulated Stripe payment. No real money was charged.
        </div>

        <div className="flex gap-3">
          <Link to="/orders" className="btn-primary flex-1 py-2.5 text-center text-sm">
            View my orders
          </Link>
          <Link to="/browse" className="flex-1 py-2.5 text-center text-sm border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors font-medium">
            Keep browsing
          </Link>
        </div>
      </div>
    </div>
  )
}
