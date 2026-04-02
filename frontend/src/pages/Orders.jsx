import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import api from '../api/axios'

const STATUS_CONFIG = {
  pending_payment: { label: 'Awaiting payment', color: 'bg-amber-100 text-amber-700',    icon: '💳' },
  pending:         { label: 'Pending',          color: 'bg-yellow-100 text-yellow-700',  icon: '⏳' },
  confirmed:       { label: 'Confirmed',        color: 'bg-blue-100 text-blue-700',      icon: '✅' },
  picked_up:       { label: 'Picked up',        color: 'bg-primary-100 text-primary-700', icon: '🎉' },
  cancelled:       { label: 'Cancelled',        color: 'bg-red-100 text-red-700',        icon: '❌' },
}

function formatPrice(price) {
  return new Intl.NumberFormat('uz-UZ').format(Math.round(price)) + ' UZS'
}

export default function Orders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(null)
  const [retrying, setRetrying] = useState(null)
  const [expanded, setExpanded] = useState(null)
  const [qrOrder, setQrOrder] = useState(null)
  const [reviewModal, setReviewModal] = useState(null)
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' })
  const [reviewLoading, setReviewLoading] = useState(false)

  const fetchOrders = () => {
    api.get('/orders/')
      .then(res => setOrders(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchOrders() }, [])

  const handleCancel = async (orderId) => {
    setCancelling(orderId)
    try {
      await api.delete(`/orders/${orderId}`)
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: 'cancelled' } : o))
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to cancel order')
    } finally {
      setCancelling(null)
    }
  }

  const handleRetryPayment = async (orderId) => {
    setRetrying(orderId)
    try {
      const res = await api.post(`/payments/retry/${orderId}`)
      window.location.href = res.data.checkout_url
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to start payment')
      setRetrying(null)
    }
  }

  const handleReviewSubmit = async (e) => {
    e.preventDefault()
    setReviewLoading(true)
    try {
      await api.post(`/orders/${reviewModal.id}/review`, reviewForm)
      setReviewModal(null)
      fetchOrders()
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit review')
    } finally {
      setReviewLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="space-y-4">
          {[1,2,3].map(i => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="flex gap-4">
                <div className="w-16 h-16 bg-gray-200 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
        <p className="text-gray-500 text-sm mt-1">
          {orders.filter(o => o.status !== 'pending_payment' && o.status !== 'cancelled').length} active · {orders.length} total
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🛒</div>
          <h2 className="text-xl font-semibold text-gray-700">No orders yet</h2>
          <p className="text-gray-400 mt-2">Browse deals and place your first order!</p>
          <Link to="/browse" className="btn-primary mt-4 inline-block">Browse food</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => {
            const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
            const isExpanded = expanded === order.id

            return (
              <div key={order.id} className="card overflow-visible">
                <div
                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpanded(isExpanded ? null : order.id)}
                >
                  <div className="flex items-center gap-4">
                    {/* Image */}
                    <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      {order.food_item_image ? (
                        <img
                          src={order.food_item_image}
                          alt={order.food_item_name}
                          className="w-full h-full object-cover"
                          onError={e => { e.target.style.display='none' }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-gray-900 truncate">{order.food_item_name}</h3>
                          <p className="text-sm text-gray-500">{order.shop_name}</p>
                        </div>
                        <span className={`badge whitespace-nowrap ${status.color}`}>
                          {status.icon} {status.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-sm font-semibold text-primary-600">
                          {formatPrice(order.total_price)}
                        </span>
                        <span className="text-xs text-gray-400">
                          × {order.quantity}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                    </div>

                    <svg
                      className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t border-gray-100 p-4 bg-gray-50">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Order ID</span>
                        <p className="font-medium">#{order.id}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Status</span>
                        <p className="font-medium">{status.label}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Quantity</span>
                        <p className="font-medium">{order.quantity}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Total</span>
                        <p className="font-medium text-primary-600">{formatPrice(order.total_price)}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Payment</span>
                        <p className="font-medium">
                          {order.payment_method === 'online'
                            ? (order.status === 'pending_payment' ? '💳 Unpaid' : '💳 Paid online')
                            : '💵 Cash in store'}
                        </p>
                      </div>
                      {order.notes && (
                        <div className="col-span-2">
                          <span className="text-gray-500">Notes</span>
                          <p className="font-medium">{order.notes}</p>
                        </div>
                      )}
                      {order.shop_address && (
                        <div className="col-span-2">
                          <span className="text-gray-500">Pickup address</span>
                          <p className="font-medium">{order.shop_address}</p>
                        </div>
                      )}
                    </div>

                    {(order.shop_address || order.shop_name) && (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${order.shop_name || ''} ${order.shop_address || ''} Tashkent Uzbekistan`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 w-full flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-sm font-medium py-2 px-4 rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                        </svg>
                        Get directions to {order.shop_name}
                      </a>
                    )}

                    <div className="mt-3 flex gap-2 flex-wrap">
                      {/* Unpaid online order actions */}
                      {order.status === 'pending_payment' && (
                        <>
                          <button
                            onClick={() => handleRetryPayment(order.id)}
                            disabled={retrying === order.id}
                            className="text-sm text-white bg-primary-700 hover:bg-primary-800 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
                          >
                            {retrying === order.id ? (
                              <>
                                <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                                </svg>
                                Redirecting…
                              </>
                            ) : '💳 Complete payment'}
                          </button>
                          <button
                            onClick={() => handleCancel(order.id)}
                            disabled={cancelling === order.id}
                            className="text-sm text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {cancelling === order.id ? 'Cancelling…' : 'Cancel'}
                          </button>
                        </>
                      )}
                      {/* Active order actions */}
                      {(order.status === 'pending' || order.status === 'confirmed') && (
                        <button
                          onClick={() => setQrOrder(order)}
                          className="text-sm text-primary-600 border border-primary-200 bg-primary-50 hover:bg-primary-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                          </svg>
                          Show QR code
                        </button>
                      )}
                      {order.status === 'pending' && (
                        <button
                          onClick={() => handleCancel(order.id)}
                          disabled={cancelling === order.id}
                          className="text-sm text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {cancelling === order.id ? 'Cancelling…' : 'Cancel order'}
                        </button>
                      )}
                      {order.status === 'picked_up' && !order.review && (
                        <button
                          onClick={() => setReviewModal(order)}
                          className="text-sm text-primary-600 border border-primary-200 bg-primary-50 hover:bg-primary-100 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          Leave a review ⭐
                        </button>
                      )}
                      {order.status === 'picked_up' && order.review && (
                        <span className="text-sm text-gray-400">✓ Reviewed</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Review Modal */}
      {/* QR Code Modal */}
      {qrOrder && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-xs text-center">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Your pickup QR code</h2>
            <p className="text-sm text-gray-500 mb-1">{qrOrder.food_item_name}</p>
            <p className="text-xs text-gray-400 mb-5">{qrOrder.shop_name} · Order #{qrOrder.id}</p>

            <div className="flex justify-center mb-5">
              <div className="p-3 bg-white border-2 border-gray-200 rounded-xl inline-block">
                <QRCodeSVG
                  value={`${window.location.origin}/pickup/${qrOrder.pickup_token}`}
                  size={200}
                  level="M"
                  includeMargin={false}
                />
              </div>
            </div>

            <p className="text-xs text-gray-500 mb-1">
              Show this to the shop staff when you arrive.
            </p>
            <p className="text-xs font-semibold text-primary-600 mb-5">
              {qrOrder.payment_method === 'online'
                ? '✓ Paid online — nothing to pay at the store'
                : `Pay ${new Intl.NumberFormat('uz-UZ').format(Math.round(qrOrder.total_price))} UZS cash on pickup`}
            </p>

            <button
              onClick={() => setQrOrder(null)}
              className="btn-secondary w-full"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {reviewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Leave a review</h2>
            <p className="text-sm text-gray-500 mb-4">{reviewModal.shop_name}</p>

            <form onSubmit={handleReviewSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
                <div className="flex gap-2">
                  {[1,2,3,4,5].map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setReviewForm(f => ({ ...f, rating: s }))}
                      className={`text-2xl transition-transform hover:scale-110 ${s <= reviewForm.rating ? 'opacity-100' : 'opacity-30'}`}
                    >
                      ⭐
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Comment (optional)</label>
                <textarea
                  value={reviewForm.comment}
                  onChange={e => setReviewForm(f => ({ ...f, comment: e.target.value }))}
                  className="input-field resize-none"
                  rows={3}
                  placeholder="Share your experience…"
                />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setReviewModal(null)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" disabled={reviewLoading} className="btn-primary flex-1">
                  {reviewLoading ? 'Submitting…' : 'Submit review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
