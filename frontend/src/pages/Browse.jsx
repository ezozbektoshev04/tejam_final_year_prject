import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, Navigate, useNavigate } from 'react-router-dom'
import api from '../api/axios'
import FoodCard from '../components/FoodCard'
import ShopCard from '../components/ShopCard'
import { useAuth } from '../context/AuthContext'
import { haversineKm } from '../utils/distance'

const CATEGORIES = ['All categories', 'Bakery', 'Restaurant', 'Grocery', 'Cafe', 'Fast Food', 'Sweets']

function isPickupNow(pickupStart, pickupEnd) {
  if (!pickupStart || !pickupEnd) return false
  const now = new Date()
  const cur = now.getHours() * 60 + now.getMinutes()
  const [sh, sm] = pickupStart.split(':').map(Number)
  const [eh, em] = pickupEnd.split(':').map(Number)
  return cur >= sh * 60 + sm && cur <= eh * 60 + em
}

export default function Browse() {
  // All hooks must come before any early return
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const shopFilter = searchParams.get('shop') // shop id from ShopCard click
  const [activeTab, setActiveTab] = useState('food')
  const [searchText, setSearchText] = useState(searchParams.get('q') || '')
  const [category, setCategory] = useState(searchParams.get('category') || 'All categories')
  const [availableNow, setAvailableNow] = useState(false)

  const [foodItems, setFoodItems] = useState([])
  const [shops, setShops] = useState([])
  const [selectedShop, setSelectedShop] = useState(null) // shop info for header
  const [loading, setLoading] = useState(true)
  const [userLocation, setUserLocation] = useState(null) // { lat, lng }
  const [locating, setLocating] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const params = { city: 'Tashkent' }
    if (searchText) params.search = searchText
    if (category !== 'All categories') params.category = category
    if (shopFilter) params.shop_id = shopFilter

    try {
      const [foodRes, shopsRes] = await Promise.all([
        api.get('/food-items/', { params }),
        shopFilter ? Promise.resolve({ data: [] }) : api.get('/shops/', { params }),
      ])
      setFoodItems(foodRes.data)
      setShops(shopsRes.data)

      // If filtering by shop, fetch shop info for the header
      if (shopFilter) {
        const shopRes = await api.get(`/shops/${shopFilter}`)
        setSelectedShop(shopRes.data)
        setActiveTab('food')
      } else {
        setSelectedShop(null)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [searchText, category, shopFilter])

  useEffect(() => {
    const timeout = setTimeout(fetchData, 300)
    return () => clearTimeout(timeout)
  }, [fetchData])

  // Shop users should not access Browse
  if (user?.role === 'shop') return <Navigate to="/dashboard" replace />

  const handleSearch = (e) => {
    e.preventDefault()
    fetchData()
  }

  const clearShopFilter = () => navigate('/browse')

  const handleNearMe = () => {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocating(false)
        setActiveTab('shops')
      },
      () => setLocating(false),
      { timeout: 8000 }
    )
  }

  const visibleItems = availableNow
    ? foodItems.filter(item => isPickupNow(item.pickup_start, item.pickup_end))
    : foodItems

  const shopsWithDistance = shops.map(shop => ({
    ...shop,
    distanceKm: userLocation && shop.lat && shop.lng
      ? haversineKm(userLocation.lat, userLocation.lng, shop.lat, shop.lng)
      : null,
  }))
  const sortedShops = userLocation
    ? [...shopsWithDistance].sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity))
    : shopsWithDistance

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        {selectedShop ? (
          <div>
            <button
              onClick={clearShopFilter}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600 mb-2 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              All shops
            </button>
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{selectedShop.name}</h1>
                <p className="text-gray-500 text-sm mt-0.5">
                  {selectedShop.category} · {selectedShop.city}
                  {selectedShop.address && ` · ${selectedShop.address}`}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Browse deals</h1>
            <p className="text-gray-500 text-sm mt-1 flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Tashkent
            </p>
          </div>
        )}
      </div>

      {/* Search & Filters — hide when viewing a specific shop */}
      {!selectedShop && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search for plov, samsa, non bread…"
                className="input-field pl-10"
              />
            </div>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="input-field sm:w-48"
            >
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <button type="submit" className="btn-primary px-6">Search</button>
            <button
              type="button"
              onClick={handleNearMe}
              disabled={locating}
              title="Sort shops by distance from your location"
              className={`btn-secondary px-4 flex items-center gap-1.5 flex-shrink-0 ${userLocation ? 'border-primary-400 text-primary-600' : ''}`}
            >
              {locating ? (
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
              <span className="text-sm">{userLocation ? 'Near me ✓' : 'Near me'}</span>
            </button>
          </form>

          {activeTab === 'food' && (
            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAvailableNow(v => !v)}
                  className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${availableNow ? 'bg-primary-600' : 'bg-gray-200'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${availableNow ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
                <span className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                  <span className={`inline-block w-2 h-2 rounded-full ${availableNow ? 'bg-primary-500 animate-pulse' : 'bg-gray-300'}`} />
                  Available for pickup right now
                </span>
              </div>
              {availableNow && (
                <span className="text-xs text-gray-400">
                  {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab Toggle — hide when viewing a specific shop */}
      {!selectedShop && (
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit mb-6">
          {[
            { key: 'food', label: `Food items (${visibleItems.length})` },
            { key: 'shops', label: `Shops (${sortedShops.length})` },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-44 bg-gray-200" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
                <div className="h-4 bg-gray-200 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : (activeTab === 'food' || selectedShop) ? (
        visibleItems.length === 0 ? (
          <EmptyState
            icon="⏰"
            title={availableNow ? 'No pickups available right now' : 'No food items found'}
            description={availableNow ? 'Check back later or turn off the filter' : 'Try adjusting your search or category filter'}
          />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleItems.map(item => <FoodCard key={item.id} item={item} />)}
          </div>
        )
      ) : (
        sortedShops.length === 0 ? (
          <EmptyState icon="🏪" title="No shops found" description="Try searching by name or category" />
        ) : (
          <>
            {userLocation && (
              <p className="text-xs text-primary-600 mb-3 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Sorted by nearest to your location
                <button onClick={() => setUserLocation(null)} className="ml-1 text-gray-400 hover:text-gray-600">✕</button>
              </p>
            )}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedShops.map(shop => (
                <ShopCard key={shop.id} shop={shop} distanceKm={shop.distanceKm} />
              ))}
            </div>
          </>
        )
      )}
    </div>
  )
}

function EmptyState({ icon, title, description }) {
  return (
    <div className="text-center py-20">
      <div className="text-6xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-700">{title}</h3>
      <p className="text-gray-400 text-sm mt-1">{description}</p>
    </div>
  )
}
