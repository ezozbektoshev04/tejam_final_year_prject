import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

function formatPrice(price) {
  return new Intl.NumberFormat('uz-UZ').format(Math.round(price)) + ' UZS'
}

const STATUS_COLOR = {
  pending:   'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  picked_up: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

export default function PickupConfirm() {
  const { token } = useParams()
  const { user } = useAuth()

  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    api.get(`/orders/pickup/${token}`)
      .then(res => setOrder(res.data))
      .catch(() => setError('Order not found or invalid QR code.'))
      .finally(() => setLoading(false))
  }, [token])

  const handleConfirm = async () => {
    if (!user) {
      setError('You must be signed in as the shop owner to confirm this order.')
      return
    }
    setConfirming(true)
    setError('')
    try {
      const res = await api.put(`/orders/pickup/${token}/confirm`)
      setOrder(res.data)
      setDone(true)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to confirm pickup.')
    } finally {
      setConfirming(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    )
  }

  if (error && !order) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Invalid QR Code</h1>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <span className="text-white font-bold text-2xl">T</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Tejam Pickup</h1>
          <p className="text-sm text-gray-500 mt-0.5">Order verification</p>
        </div>

        {/* Order Card */}
        <div className="card p-5 mb-4">
          {/* Status */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-500">Order #{order.id}</span>
            <span className={`badge ${STATUS_COLOR[order.status]}`}>
              {order.status.replace('_', ' ')}
            </span>
          </div>

          {/* Food item */}
          <div className="flex gap-3 mb-4">
            {order.food_item_image && (
              <img
                src={order.food_item_image}
                alt={order.food_item_name}
                className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                onError={e => { e.target.style.display = 'none' }}
              />
            )}
            <div>
              <p className="font-semibold text-gray-900">{order.food_item_name}</p>
              <p className="text-sm text-gray-500">{order.shop_name}</p>
              <p className="text-xs text-gray-400 mt-0.5">Qty: {order.quantity}</p>
            </div>
          </div>

          {/* Details */}
          <div className="border-t border-gray-100 pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Customer</span>
              <span className="font-medium">{order.customer_name}</span>
            </div>
            {order.customer_phone && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Phone</span>
                <a href={`tel:${order.customer_phone}`} className="font-medium text-primary-600">
                  {order.customer_phone}
                </a>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Amount due</span>
              <span className="font-bold text-lg text-primary-600">{formatPrice(order.total_price)}</span>
            </div>
            {order.notes && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Notes</span>
                <span className="font-medium text-right max-w-[60%]">{order.notes}</span>
              </div>
            )}
          </div>
        </div>

        {/* Confirm button (shop only) */}
        {done ? (
          <div className="card p-5 text-center">
            <div className="text-4xl mb-2">✅</div>
            <h2 className="font-bold text-gray-900 text-lg">Pickup confirmed!</h2>
            <p className="text-gray-500 text-sm mt-1">Payment received. Order marked as picked up.</p>
            <Link to="/dashboard" className="btn-primary mt-4 inline-block text-sm">
              Back to dashboard
            </Link>
          </div>
        ) : order.status === 'picked_up' ? (
          <div className="card p-5 text-center">
            <div className="text-4xl mb-2">✅</div>
            <p className="text-gray-600 font-medium">This order has already been picked up.</p>
          </div>
        ) : order.status === 'cancelled' ? (
          <div className="card p-5 text-center">
            <div className="text-4xl mb-2">❌</div>
            <p className="text-gray-600 font-medium">This order was cancelled.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 text-center">
                {error}
              </div>
            )}
            {user?.role === 'shop' ? (
              <button
                onClick={handleConfirm}
                disabled={confirming}
                className="w-full btn-primary py-4 text-base font-bold"
              >
                {confirming ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Confirming…
                  </span>
                ) : (
                  '✓ Confirm pickup & payment received'
                )}
              </button>
            ) : (
              <div className="card p-4 text-center">
                <p className="text-sm text-gray-500 mb-3">
                  Shop staff: sign in to confirm this pickup
                </p>
                <Link
                  to={`/login`}
                  state={{ from: { pathname: `/pickup/${token}` } }}
                  className="btn-primary text-sm inline-block"
                >
                  Sign in as shop
                </Link>
              </div>
            )}
            <p className="text-center text-xs text-gray-400">
              Collect <strong>{formatPrice(order.total_price)}</strong> in cash before confirming
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
