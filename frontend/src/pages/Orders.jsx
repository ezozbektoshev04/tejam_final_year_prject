import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import api from '../api/axios'
import { formatDate } from '../utils/dateTime'
import Pagination from '../components/Pagination'

const STATUS_CONFIG = {
  pending_payment: { label: 'Awaiting payment', color: 'bg-amber-100 text-amber-700',     icon: '💳' },
  pending:         { label: 'Pending',           color: 'bg-yellow-100 text-yellow-700',   icon: '⏳' },
  confirmed:       { label: 'Confirmed',         color: 'bg-blue-100 text-blue-700',       icon: '✅' },
  picked_up:       { label: 'Picked up',         color: 'bg-primary-100 text-primary-700', icon: '🎉' },
  cancelled:       { label: 'Cancelled',         color: 'bg-red-100 text-red-700',         icon: '❌' },
}

const TABS = [
  { key: 'active',    label: 'Active' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
]

function formatPrice(p) {
  return new Intl.NumberFormat('uz-UZ').format(Math.round(p)) + ' UZS'
}

// Progress steps for active orders
const STEPS = ['Order placed', 'Confirmed', 'Picked up']
function stepIndex(status) {
  if (status === 'pending_payment' || status === 'pending') return 0
  if (status === 'confirmed') return 1
  if (status === 'picked_up') return 2
  return -1
}

function OrderProgress({ status }) {
  const current = stepIndex(status)
  if (current < 0) return null
  return (
    <div className="flex items-center gap-0 mt-3 mb-1">
      {STEPS.map((step, i) => (
        <div key={step} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
              i < current  ? 'bg-primary-600 border-primary-600 text-white' :
              i === current ? 'bg-white border-primary-600 text-primary-600' :
                              'bg-white border-gray-200 text-gray-300'
            }`}>
              {i < current ? (
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : i + 1}
            </div>
            <span className={`text-xs mt-1 whitespace-nowrap ${i === current ? 'text-primary-600 font-semibold' : i < current ? 'text-primary-500' : 'text-gray-300'}`}>
              {step}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`flex-1 h-0.5 mx-1 mb-4 ${i < current ? 'bg-primary-500' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

export default function Orders() {
  const navigate = useNavigate()
  const [orders, setOrders]           = useState([])
  const [loading, setLoading]         = useState(true)
  const [tab, setTab]                 = useState('active')
  const [statusCounts, setStatusCounts] = useState({ active: 0, completed: 0, cancelled: 0 })
  const [totalSpent, setTotalSpent]   = useState(0)
  const [totalOrders, setTotalOrders] = useState(0)
  const [page, setPage]               = useState(1)
  const [totalPages, setTotalPages]   = useState(1)
  const [totalItems, setTotalItems]   = useState(0)
  const [expanded, setExpanded]       = useState(null)
  const [qrOrder, setQrOrder]         = useState(null)
  const [cancelling, setCancelling]   = useState(null)
  const [retrying, setRetrying]       = useState(null)
  const [reviewModal, setReviewModal] = useState(null)
  const [reviewForm, setReviewForm]   = useState({ rating: 5, comment: '' })
  const [reviewLoading, setReviewLoading] = useState(false)
  const PER_PAGE = 10

  const fetchOrders = (pageNum = 1, tabKey = tab) => {
    setLoading(true)
    api.get('/orders/', { params: { page: pageNum, per_page: PER_PAGE, tab: tabKey } })
      .then(res => {
        const d = res.data
        setOrders(d.orders)
        setTotalItems(d.total)
        setTotalPages(d.pages)
        setPage(d.page)
        setStatusCounts(d.status_counts)
        setTotalSpent(d.total_spent)
        setTotalOrders(Object.values(d.status_counts).reduce((a, b) => a + b, 0))
      })
      .catch(err => {
        if (err.response?.status === 401 || err.response?.status === 403) {
          // Stale or wrong-role token — force re-login
          localStorage.removeItem('access_token')
          localStorage.removeItem('user')
          navigate('/login')
        } else {
          console.error(err)
        }
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchOrders(1, 'active') }, [])

  const switchTab = (key) => {
    setTab(key)
    setExpanded(null)
    fetchOrders(1, key)
  }

  const handleCancel = async (orderId) => {
    setCancelling(orderId)
    try {
      await api.delete(`/orders/${orderId}`)
      fetchOrders(page, tab)
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
      fetchOrders(page, tab)
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit review')
    } finally {
      setReviewLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
        <p className="text-gray-500 text-sm mt-1">Track and manage all your Tejam orders</p>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Total orders', value: totalOrders, icon: '📦' },
          { label: 'Total spent', value: formatPrice(totalSpent), icon: '💰', small: true },
          { label: 'Bags saved', value: statusCounts.completed, icon: '🎁' },
        ].map(s => (
          <div key={s.label} className="card p-4 text-center">
            <div className="text-2xl mb-1">{s.icon}</div>
            <p className={`font-bold text-gray-900 ${s.small ? 'text-sm' : 'text-xl'}`}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-full">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => switchTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
            {statusCounts[t.key] > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                tab === t.key
                  ? t.key === 'active' ? 'bg-primary-100 text-primary-700'
                  : t.key === 'cancelled' ? 'bg-red-100 text-red-600'
                  : 'bg-gray-100 text-gray-600'
                  : 'bg-gray-200 text-gray-500'
              }`}>
                {statusCounts[t.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Order list */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="flex gap-4">
                <div className="w-16 h-16 bg-gray-200 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">
            {tab === 'active' ? '🕐' : tab === 'completed' ? '🎉' : '📭'}
          </div>
          <h2 className="text-lg font-semibold text-gray-700">
            {tab === 'active' ? 'No active orders' : tab === 'completed' ? 'No completed orders yet' : 'No cancelled orders'}
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            {tab === 'active' ? 'Your active orders will appear here' : tab === 'completed' ? 'Orders you\'ve picked up will show here' : 'Cancelled orders will show here'}
          </p>
          {tab === 'active' && (
            <Link to="/browse" className="btn-primary mt-5 inline-block">Browse food bags</Link>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-3" id="orders-top">
            {orders.map(order => {
              const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
              const isExpanded = expanded === order.id
              const isActive = ['pending', 'confirmed', 'pending_payment'].includes(order.status)

              return (
                <div key={order.id} className="card overflow-hidden">

                  {/* Payment required banner */}
                  {order.status === 'pending_payment' && (
                    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2">
                      <span className="text-amber-600 text-xs font-semibold">⚠ Payment required to confirm this order</span>
                    </div>
                  )}

                  {/* Main card row */}
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Image */}
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                        {order.food_item_image ? (
                          <img src={order.food_item_image} alt={order.food_item_name}
                            className="w-full h-full object-cover"
                            onError={e => { e.target.style.display = 'none' }} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="font-semibold text-gray-900 truncate text-sm">{order.food_item_name}</h3>
                            <p className="text-xs text-gray-500 mt-0.5">{order.shop_name}</p>
                          </div>
                          <span className={`badge whitespace-nowrap text-xs flex-shrink-0 ${status.color}`}>
                            {status.icon} {status.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-sm font-bold text-primary-600">{formatPrice(order.total_price)}</span>
                          <span className="text-xs text-gray-400">× {order.quantity}</span>
                          <span className="text-xs text-gray-400">{formatDate(order.created_at, 'date')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Progress bar — active orders only */}
                    {isActive && <OrderProgress status={order.status} />}

                    {/* Inline action buttons */}
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      {order.status === 'pending_payment' && (
                        <>
                          <button
                            onClick={() => handleRetryPayment(order.id)}
                            disabled={retrying === order.id}
                            className="flex items-center gap-1.5 text-xs font-semibold bg-primary-600 text-white px-3 py-1.5 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                          >
                            {retrying === order.id
                              ? <><svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Redirecting…</>
                              : '💳 Complete payment'}
                          </button>
                          <button
                            onClick={() => handleCancel(order.id)}
                            disabled={cancelling === order.id}
                            className="text-xs font-medium text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {cancelling === order.id ? 'Cancelling…' : 'Cancel'}
                          </button>
                        </>
                      )}

                      {(order.status === 'pending' || order.status === 'confirmed') && (
                        <>
                          <button
                            onClick={() => setQrOrder(order)}
                            className="flex items-center gap-1.5 text-xs font-semibold text-primary-600 border border-primary-200 bg-primary-50 hover:bg-primary-100 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                            </svg>
                            Show QR
                          </button>
                          {order.status === 'pending' && (
                            <button
                              onClick={() => handleCancel(order.id)}
                              disabled={cancelling === order.id}
                              className="text-xs font-medium text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                            >
                              {cancelling === order.id ? 'Cancelling…' : 'Cancel'}
                            </button>
                          )}
                        </>
                      )}

                      {order.status === 'picked_up' && !order.review && (
                        <button
                          onClick={() => { setReviewModal(order); setReviewForm({ rating: 5, comment: '' }) }}
                          className="text-xs font-semibold text-amber-700 border border-amber-200 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          ⭐ Leave a review
                        </button>
                      )}
                      {order.status === 'picked_up' && order.review && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <svg className="w-3.5 h-3.5 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Reviewed
                          <span className="text-yellow-400 ml-0.5">{'★'.repeat(order.review.rating)}</span>
                        </span>
                      )}

                      {/* Spacer + Details toggle */}
                      <button
                        onClick={() => setExpanded(isExpanded ? null : order.id)}
                        className="ml-auto flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {isExpanded ? 'Hide' : 'Details'}
                        <svg className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 px-4 py-4 bg-gray-50 space-y-3">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-gray-400 mb-0.5">Order ref</p>
                          <p className="font-mono font-medium text-gray-800">{order.order_ref}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-0.5">Payment</p>
                          <p className="font-medium text-gray-800">
                            {order.payment_method === 'online'
                              ? (order.status === 'pending_payment' ? '💳 Unpaid' : '💳 Paid online')
                              : '🏪 Pay in store'}
                          </p>
                        </div>
                        {order.pickup_start && order.pickup_end && (
                          <div>
                            <p className="text-xs text-gray-400 mb-0.5">Pickup window</p>
                            <p className="font-medium text-gray-800">{order.pickup_start} – {order.pickup_end}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs text-gray-400 mb-0.5">Ordered</p>
                          <p className="font-medium text-gray-800">{formatDate(order.created_at)}</p>
                        </div>
                        {order.notes && (
                          <div className="col-span-2">
                            <p className="text-xs text-gray-400 mb-0.5">Your notes</p>
                            <p className="font-medium text-gray-700">{order.notes}</p>
                          </div>
                        )}
                        {order.shop_address && (
                          <div className="col-span-2">
                            <p className="text-xs text-gray-400 mb-0.5">Pickup address</p>
                            <p className="font-medium text-gray-800">{order.shop_address}, {order.shop_city}</p>
                          </div>
                        )}
                      </div>

                      {(order.shop_address || order.shop_name) && (
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${order.shop_name || ''} ${order.shop_address || ''} Tashkent`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-sm font-medium py-2 px-4 rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                          </svg>
                          Get directions to {order.shop_name}
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {totalPages > 1 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              totalItems={totalItems}
              perPage={PER_PAGE}
              onPageChange={(p) => {
                fetchOrders(p, tab)
                document.getElementById('orders-top')?.scrollIntoView({ behavior: 'smooth' })
              }}
            />
          )}
        </>
      )}

      {/* QR Modal */}
      {qrOrder && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-xs text-center">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Pickup QR code</h2>
            <p className="text-sm text-gray-500 mb-0.5">{qrOrder.food_item_name}</p>
            <p className="text-xs text-gray-400 mb-5">{qrOrder.shop_name} · {qrOrder.order_ref}</p>
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-white border-2 border-gray-200 rounded-xl inline-block">
                <QRCodeSVG value={`${window.location.origin}/pickup/${qrOrder.pickup_token}`} size={200} level="M" includeMargin={false} />
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-1">Show this to the shop staff when you arrive.</p>
            <p className="text-xs font-semibold text-primary-600 mb-5">
              {qrOrder.payment_method === 'online'
                ? '✓ Paid online — nothing to pay at the store'
                : `Pay ${new Intl.NumberFormat('uz-UZ').format(Math.round(qrOrder.total_price))} UZS in store`}
            </p>
            <button onClick={() => setQrOrder(null)} className="btn-secondary w-full">Close</button>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Leave a review</h2>
            <p className="text-sm font-medium text-gray-700">{reviewModal.food_item_name}</p>
            <p className="text-sm text-gray-400 mb-4">{reviewModal.shop_name}</p>
            <form onSubmit={handleReviewSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
                <div className="flex gap-2">
                  {[1,2,3,4,5].map(s => (
                    <button key={s} type="button"
                      onClick={() => setReviewForm(f => ({ ...f, rating: s }))}
                      className={`text-2xl transition-transform hover:scale-110 ${s <= reviewForm.rating ? 'opacity-100' : 'opacity-30'}`}
                    >⭐</button>
                  ))}
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Comment (optional)</label>
                <textarea
                  value={reviewForm.comment}
                  onChange={e => setReviewForm(f => ({ ...f, comment: e.target.value }))}
                  className="input-field resize-none" rows={3}
                  placeholder="Share your experience…"
                />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setReviewModal(null)} className="btn-secondary flex-1">Cancel</button>
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
