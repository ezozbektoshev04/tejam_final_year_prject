import { Link } from 'react-router-dom'

function formatPrice(price) {
  return new Intl.NumberFormat('uz-UZ').format(Math.round(price)) + ' UZS'
}

function discountPercent(original, discounted) {
  return Math.round(((original - discounted) / original) * 100)
}

export default function FoodCard({ item }) {
  const discount = discountPercent(item.original_price, item.discounted_price)

  return (
    <Link to={`/food/${item.id}`} className="card group hover:shadow-md transition-shadow duration-200 block">
      {/* Image */}
      <div className="relative h-44 overflow-hidden bg-gray-100">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400' }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl bg-primary-50">
            🍽️
          </div>
        )}
        {/* Discount badge */}
        <div className="absolute top-2 left-2">
          <span className="badge bg-primary-700 text-white font-bold text-xs px-2 py-1 rounded-full">
            -{discount}%
          </span>
        </div>
        {/* Low stock */}
        {item.quantity <= 2 && item.quantity > 0 && (
          <div className="absolute top-2 right-2">
            <span className="badge bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              Only {item.quantity} left!
            </span>
          </div>
        )}
        {!item.is_available && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white font-bold text-lg">Sold Out</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 group-hover:text-primary-700 transition-colors line-clamp-1">
          {item.name}
        </h3>
        {item.shop_name && (
          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            {item.shop_name}
            {item.shop_city && ` · ${item.shop_city}`}
          </p>
        )}
        <p className="text-xs text-gray-400 mt-1 line-clamp-2">{item.description}</p>

        {/* Price */}
        <div className="flex items-center justify-between mt-3">
          <div>
            <span className="text-base font-bold text-primary-700">
              {formatPrice(item.discounted_price)}
            </span>
            <span className="text-xs text-gray-400 line-through ml-2">
              {formatPrice(item.original_price)}
            </span>
          </div>
        </div>

        {/* Pickup time */}
        {item.pickup_start && item.pickup_end && (
          <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Pickup {item.pickup_start} – {item.pickup_end}
          </div>
        )}
      </div>
    </Link>
  )
}
