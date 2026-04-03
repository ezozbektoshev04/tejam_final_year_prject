import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'
import FoodCard from '../components/FoodCard'
import ShopCard from '../components/ShopCard'

const STATS = [
  { value: '12', label: 'Partner branches' },
  { value: '14', label: 'Active listings' },
  { value: 'Tashkent', label: 'Launch city' },
  { value: 'up to 70%', label: 'Discount' },
]

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Browse listings',
    description: 'Find surplus food from local Tashkent brands — bakeries, restaurants, and grocery stores — available at a discount.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  {
    step: '02',
    title: 'Place your order',
    description: 'Select your items, choose a quantity, and confirm your order in seconds. No upfront payment required.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    step: '03',
    title: 'Pick up in person',
    description: 'Visit the branch during the pickup window. Show your QR code, pay cash on the spot, and collect your food.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
]

export default function Home() {
  const [featuredShops, setFeaturedShops] = useState([])
  const [featuredItems, setFeaturedItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/shops/').catch(() => ({ data: [] })),
      api.get('/food-items/').catch(() => ({ data: [] })),
    ]).then(([shopsRes, itemsRes]) => {
      setFeaturedShops(shopsRes.data.slice(0, 3))
      setFeaturedItems(itemsRes.data.slice(0, 6))
    }).finally(() => setLoading(false))
  }, [])

  const heroItems = featuredItems.slice(0, 4)

  return (
    <main>
      {/* Hero */}
      <section className="bg-primary-50 pt-14 pb-16 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-10 items-center">

            {/* Left: text */}
            <div>
              <span className="inline-flex items-center gap-1.5 bg-primary-50 text-primary-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-5">
                🇺🇿 Tashkent, Uzbekistan · Early access
              </span>
              <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight tracking-tight">
                Good food.<br />
                <span className="text-primary-700">Less waste.</span><br />
                Real savings.
              </h1>
              <p className="mt-5 text-base sm:text-lg text-gray-500 max-w-md leading-relaxed">
                Tejam is a marketplace for surplus food from Tashkent's best restaurants and grocery brands — available at up to 70% off, ready for pickup today.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/browse" className="btn-primary py-3 px-6 text-sm">
                  Browse available deals
                </Link>
                <Link to="/register" className="btn-secondary py-3 px-6 text-sm">
                  Register your shop
                </Link>
              </div>
            </div>

            {/* Right: food image grid */}
            <div className="grid grid-cols-2 gap-3">
              {loading
                ? [0, 1, 2, 3].map(i => (
                    <div key={i} className={`bg-gray-100 rounded-2xl animate-pulse ${i === 0 ? 'h-52' : 'h-44'}`} />
                  ))
                : heroItems.length > 0
                ? heroItems.map((item, i) => (
                    <Link
                      key={item.id}
                      to={`/food/${item.id}`}
                      className={`block rounded-2xl overflow-hidden bg-primary-50 relative group ${i === 0 ? 'h-52' : 'h-44'}`}
                    >
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={e => { e.target.style.display = 'none' }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-5xl">🍽️</div>
                      )}
                      <div className="absolute bottom-2 left-2">
                        <span className="badge bg-primary-700 text-white text-xs font-bold">
                          {Math.round(((item.original_price - item.discounted_price) / item.original_price) * 100)}% off
                        </span>
                      </div>
                    </Link>
                  ))
                : [0, 1, 2, 3].map(i => (
                    <div key={i} className={`bg-primary-50 rounded-2xl flex items-center justify-center text-5xl ${i === 0 ? 'h-52' : 'h-44'}`}>
                      🍽️
                    </div>
                  ))
              }
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-gray-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl font-extrabold text-primary-800">{s.value}</div>
                <div className="text-sm text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-gray-900">How it works</h2>
            <p className="text-gray-500 mt-2 text-sm">From listing to pickup in three steps</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {HOW_IT_WORKS.map((step) => (
              <div key={step.step} className="bg-gray-50 rounded-2xl p-6">
                <div className="w-11 h-11 bg-primary-700 text-white rounded-xl flex items-center justify-center mb-4">
                  {step.icon}
                </div>
                <p className="text-xs font-bold text-primary-600 uppercase tracking-widest mb-1">{step.step}</p>
                <h3 className="font-semibold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Partner branches */}
      <section className="bg-primary-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Partner branches</h2>
              <p className="text-gray-500 text-sm mt-1">Real Tashkent brands on the platform</p>
            </div>
            <Link to="/browse" className="text-sm font-semibold text-primary-700 hover:text-primary-900 transition-colors">
              View all →
            </Link>
          </div>

          {loading ? (
            <div className="grid md:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="card animate-pulse">
                  <div className="h-36 bg-gray-200" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-6">
              {featuredShops.map(shop => (
                <ShopCard key={shop.id} shop={shop} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Available now */}
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Available now</h2>
              <p className="text-gray-500 text-sm mt-1">Surplus food listed today across Tashkent</p>
            </div>
            <Link to="/browse" className="text-sm font-semibold text-primary-700 hover:text-primary-900 transition-colors">
              View all →
            </Link>
          </div>

          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
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
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredItems.map(item => (
                <FoodCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="bg-primary-50 border-y border-primary-100 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-primary-600 text-xs font-bold uppercase tracking-widest mb-3">For businesses</p>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Running a restaurant or grocery store?</h2>
          <p className="text-gray-500 text-base mb-8 max-w-xl mx-auto leading-relaxed">
            List your surplus inventory on Tejam. Recover revenue from food that would otherwise go unsold — and reach customers actively looking for deals in Tashkent.
          </p>
          <Link
            to="/register"
            className="inline-block btn-primary py-3 px-8 text-sm"
          >
            Register your business — it's free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-primary-50 border-t border-primary-100 text-gray-500 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <img src="/logo-color.png" alt="Tejam" className="h-12 w-auto" />
            <p className="text-sm">
              © 2026 Tejam. Reducing food waste across Uzbekistan 🇺🇿
            </p>
            <span className="text-sm">Tashkent, Uzbekistan 🇺🇿</span>
          </div>
        </div>
      </footer>
    </main>
  )
}
