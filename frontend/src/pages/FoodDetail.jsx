import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { formatDate } from '../utils/dateTime'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import MapEmbed from '../components/MapEmbed'

function formatPrice(price) {
  return new Intl.NumberFormat('uz-UZ').format(Math.round(price)) + ' UZS'
}

function StarRow({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(s => (
        <svg
          key={s}
          className={`w-4 h-4 ${s <= rating ? 'text-yellow-400' : 'text-gray-200'}`}
          fill="currentColor" viewBox="0 0 24 24"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  )
}

export default function FoodDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('online')
  const [ordering, setOrdering] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState(false)
  const [orderError, setOrderError] = useState('')

  useEffect(() => {
    api.get(`/food-items/${id}`)
      .then(res => setItem(res.data))
      .catch(() => navigate('/browse'))
      .finally(() => setLoading(false))
  }, [id, navigate])

  const handleOrder = async (e) => {
    e.preventDefault()
    if (!user) {
      navigate('/login', { state: { from: { pathname: `/food/${id}` } } })
      return
    }
    if (user.role !== 'customer') {
      setOrderError('Only customer accounts can place orders.')
      return
    }
    setOrdering(true)
    setOrderError('')
    try {
      if (paymentMethod === 'online') {
        const res = await api.post('/payments/create-checkout-session', {
          food_item_id: parseInt(id),
          quantity,
          notes,
        })
        window.location.href = res.data.checkout_url
      } else {
        await api.post('/orders/', { food_item_id: parseInt(id), quantity, notes })
        setOrderSuccess(true)
        setItem(prev => ({
          ...prev,
          quantity: prev.quantity - quantity,
          is_available: prev.quantity - quantity > 0,
        }))
      }
    } catch (err) {
      setOrderError(err.response?.data?.error || 'Failed to place order.')
      setOrdering(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-72 bg-gray-200 rounded-xl" />
          <div className="h-6 bg-gray-200 rounded w-2/3" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
        </div>
      </div>
    )
  }

  if (!item) return null

  const discount = Math.round(((item.original_price - item.discounted_price) / item.original_price) * 100)

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to="/browse" className="hover:text-primary-600">Browse</Link>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-gray-900 font-medium">{item.name}</span>
      </nav>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Left: Image + Info */}
        <div>
          <div className="relative rounded-xl overflow-hidden h-72 bg-gray-100">
            {item.image_url ? (
              <img
                src={item.image_url}
                alt={item.name}
                className="w-full h-full object-cover"
                onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600' }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-7xl">🍽️</div>
            )}
            <div className="absolute top-3 left-3">
              <span className="badge bg-primary-700 text-white font-bold px-3 py-1 text-sm">
                -{discount}%
              </span>
            </div>
          </div>

          {/* Shop info */}
          {item.shop && (
            <>
              <div className="mt-4 p-4 bg-gray-50 border border-gray-100 rounded-xl flex items-start gap-3">
                <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-lg">🏪</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{item.shop.name}</p>
                  <p className="text-sm text-gray-500">
                    {item.shop.category} · {item.shop.city}
                  </p>
                  {item.shop.address && (
                    <p className="text-xs text-gray-400 mt-0.5">{item.shop.address}</p>
                  )}
                </div>
              </div>
              <MapEmbed
                shopName={item.shop.name}
                address={item.shop.address}
                city={item.shop.city}
                lat={item.shop.lat}
                lng={item.shop.lng}
              />
            </>
          )}
        </div>

        {/* Right: Details + Order */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{item.name}</h1>

          {/* Price */}
          <div className="flex items-center gap-3 mt-3">
            <span className="text-3xl font-extrabold text-primary-600">
              {formatPrice(item.discounted_price)}
            </span>
            <span className="text-lg text-gray-400 line-through">
              {formatPrice(item.original_price)}
            </span>
            <span className="badge bg-primary-100 text-primary-800 font-semibold">
              Save {formatPrice(item.original_price - item.discounted_price)}
            </span>
          </div>

          <span className="inline-flex items-center gap-1 mt-2 bg-amber-50 text-amber-700 text-xs font-semibold px-3 py-1 rounded-full border border-amber-200">
            🎁 Surprise Bag
          </span>

          {item.description && (
            <p className="text-gray-600 mt-4 leading-relaxed">{item.description}</p>
          )}

          {item.contents_hint && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-sm font-semibold text-amber-800 mb-1">What's inside?</p>
              <p className="text-sm text-amber-700">{item.contents_hint}</p>
              <p className="text-xs text-amber-500 mt-2 italic">
                Exact contents vary daily. This is a surprise bag — items are selected by the shop based on what's available.
              </p>
            </div>
          )}

          {/* Details */}
          <div className="mt-5 space-y-3">
            {item.pickup_start && item.pickup_end && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <svg className="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Pickup: <strong>{item.pickup_start} – {item.pickup_end}</strong></span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <svg className="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18" />
              </svg>
              <span>
                {item.quantity > 0 ? (
                  <>Available: <strong className={item.quantity <= 3 ? 'text-red-600' : 'text-gray-900'}>{item.quantity} portions</strong></>
                ) : (
                  <span className="text-red-600 font-semibold">Sold out</span>
                )}
              </span>
            </div>
          </div>

          {/* Order form */}
          <div className="mt-6 p-4 bg-white border border-gray-200 rounded-xl">
            {orderSuccess ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="font-bold text-gray-900 text-lg">Order placed!</h3>
                <p className="text-gray-500 text-sm mt-1">
                  Pay in store at {item.shop?.name} between {item.pickup_start} – {item.pickup_end}.
                </p>
                <Link to="/orders" className="btn-primary mt-4 inline-block text-sm px-5 py-2">
                  View my orders
                </Link>
              </div>
            ) : (
              <form onSubmit={handleOrder}>
                <h3 className="font-semibold text-gray-900 mb-4">Place order</h3>

                {orderError && (
                  <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    {orderError}
                  </div>
                )}

                {/* Payment method selector */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment method</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('online')}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-sm font-medium transition-colors ${
                        paymentMethod === 'online'
                          ? 'border-primary-600 bg-primary-50 text-primary-700'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
                      </svg>
                      Pay online
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cash')}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-sm font-medium transition-colors ${
                        paymentMethod === 'cash'
                          ? 'border-primary-600 bg-primary-50 text-primary-700'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      Pay in cash
                    </button>
                  </div>
                  {paymentMethod === 'online' && (
                    <p className="text-xs text-gray-400 mt-1.5 text-center">
                      Test card: <span className="font-mono">4242 4242 4242 4242</span> · any future date · any CVC
                    </p>
                  )}
                  {paymentMethod === 'cash' && (
                    <p className="text-xs text-gray-400 mt-1.5 text-center">
                      Reserve now, pay in store when you pick up
                    </p>
                  )}
                </div>

                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setQuantity(q => Math.max(1, q - 1))}
                      className="w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 font-bold text-lg"
                    >
                      −
                    </button>
                    <span className="text-xl font-bold w-8 text-center">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity(q => Math.min(item.quantity, q + 1))}
                      className="w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 font-bold text-lg"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="input-field"
                    placeholder="Any special requests?"
                  />
                </div>

                <div className="flex items-center justify-between mb-4 pt-3 border-t border-gray-100">
                  <span className="text-gray-600">Total:</span>
                  <span className="text-xl font-bold text-primary-600">
                    {formatPrice(item.discounted_price * quantity)}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={!item.is_available || ordering}
                  className="btn-primary w-full py-3 flex items-center justify-center gap-2"
                >
                  {ordering ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      {paymentMethod === 'online' ? 'Redirecting to payment…' : 'Placing order…'}
                    </>
                  ) : !item.is_available ? 'Sold out' : paymentMethod === 'online' ? 'Pay online' : 'Pay in cash'}
                </button>

                {!user && (
                  <p className="text-center text-xs text-gray-400 mt-2">
                    <Link to="/login" className="text-primary-600 font-medium">Sign in</Link> to place an order
                  </p>
                )}
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Reviews */}
      <div className="mt-10">
        <div className="flex items-center gap-4 mb-5">
          <h2 className="text-xl font-bold text-gray-900">
            Reviews
          </h2>
          {item.review_count > 0 && (
            <div className="flex items-center gap-2">
              <StarRow rating={Math.round(item.avg_rating)} />
              <span className="text-sm text-gray-500">
                {item.avg_rating} · {item.review_count} review{item.review_count !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>

        {item.reviews && item.reviews.length > 0 ? (
          <div className="space-y-4">
            {item.reviews.map(review => (
              <div key={review.id} className="card p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                      <span className="text-primary-700 font-semibold text-sm">
                        {review.customer_name?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="font-medium text-sm text-gray-800">{review.customer_name}</span>
                  </div>
                  <StarRow rating={review.rating} />
                </div>
                {review.comment && (
                  <p className="text-gray-600 text-sm mt-2">{review.comment}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  {formatDate(review.created_at, 'date')}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 bg-gray-50 rounded-xl border border-gray-100">
            <div className="text-4xl mb-2">⭐</div>
            <p className="text-gray-500 text-sm">No reviews yet</p>
            <p className="text-gray-400 text-xs mt-1">Be the first to order and leave a review!</p>
          </div>
        )}
      </div>
    </div>
  )
}
