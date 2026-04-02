import { Link } from 'react-router-dom'
import { formatDistance } from '../utils/distance'

function StarRating({ rating }) {
  return (
    <div className="flex items-center gap-1">
      <svg className="w-3.5 h-3.5 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
      <span className="text-xs font-medium text-gray-600">{rating?.toFixed(1) || '—'}</span>
    </div>
  )
}

const CATEGORY_EMOJIS = {
  Bakery: '🥖',
  Restaurant: '🍽️',
  Grocery: '🛒',
  Cafe: '☕',
  'Fast Food': '🍔',
  Sweets: '🍰',
  General: '🏪',
}

export default function ShopCard({ shop, distanceKm }) {
  const emoji = CATEGORY_EMOJIS[shop.category] || '🏪'

  return (
    <Link to={`/browse?shop=${shop.id}`} className="card group hover:shadow-md transition-shadow duration-200 block">
      {/* Image */}
      <div className="relative h-36 overflow-hidden bg-primary-50">
        {shop.image_url ? (
          <img
            src={shop.image_url}
            alt={shop.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => { e.target.style.display = 'none' }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl">
            {emoji}
          </div>
        )}
        {/* Category badge */}
        <div className="absolute bottom-2 left-2">
          <span className="badge bg-white/90 text-gray-700 text-xs font-medium shadow-sm">
            {emoji} {shop.category}
          </span>
        </div>
        {/* Distance badge */}
        {distanceKm != null && (
          <div className="absolute bottom-2 right-2">
            <span className="badge bg-primary-700/90 text-white text-xs font-medium shadow-sm flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {formatDistance(distanceKm)}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-gray-900 group-hover:text-primary-700 transition-colors">
            {shop.name}
          </h3>
          <StarRating rating={shop.rating} />
        </div>

        <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {shop.city}
          {shop.address && ` · ${shop.address}`}
        </div>

        {shop.description && (
          <p className="text-xs text-gray-400 mt-2 line-clamp-2">{shop.description}</p>
        )}

        <div className="mt-3 flex items-center gap-1 text-xs text-primary-700 font-semibold">
          <span>View deals</span>
          <svg className="w-3 h-3 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  )
}
