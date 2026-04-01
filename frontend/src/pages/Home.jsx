import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'
import FoodCard from '../components/FoodCard'
import ShopCard from '../components/ShopCard'

const STATS = [
  { value: '50,000+', label: 'Meals saved' },
  { value: '200+', label: 'Partner shops' },
  { value: '4', label: 'Cities' },
  { value: '60%', label: 'Average discount' },
]

const HOW_IT_WORKS = [
  {
    step: '1',
    title: 'Browse deals',
    description: 'Find discounted surplus food from bakeries, restaurants, and grocery stores near you.',
    icon: '🔍',
  },
  {
    step: '2',
    title: 'Place your order',
    description: 'Order your favourite items at up to 70% off the original price.',
    icon: '🛒',
  },
  {
    step: '3',
    title: 'Pick up & enjoy',
    description: 'Go to the shop during the pickup window, collect your food and enjoy!',
    icon: '🎉',
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

  return (
    <main>
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-primary-700 via-primary-600 to-primary-500 text-white overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-8 left-10 text-8xl">🍽️</div>
          <div className="absolute top-20 right-20 text-6xl">🥖</div>
          <div className="absolute bottom-10 left-1/4 text-7xl">🧆</div>
          <div className="absolute bottom-20 right-10 text-5xl">🌿</div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-4">
              <span className="badge bg-white/20 text-white text-sm px-3 py-1">
                🇺🇿 Made for Uzbekistan
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight">
              Save food.
              <br />
              <span className="text-accent-300">Save money.</span>
              <br />
              Save Uzbekistan.
            </h1>
            <p className="mt-6 text-xl text-primary-100 max-w-xl">
              Tejam connects you with local shops in Tashkent selling surplus food at up to 70% off. Fresh samsa, non bread, plov — all at amazing prices.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/browse" className="bg-white text-primary-700 font-bold py-3 px-8 rounded-xl hover:bg-primary-50 transition-colors shadow-lg">
                Browse deals now
              </Link>
              <Link to="/register" className="bg-accent-500 hover:bg-accent-600 text-white font-bold py-3 px-8 rounded-xl transition-colors shadow-lg">
                List your shop →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-3xl font-extrabold text-primary-600">{s.value}</div>
                <div className="text-sm text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900">How Tejam works</h2>
          <p className="text-gray-500 mt-2">Three simple steps to amazing food deals</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {HOW_IT_WORKS.map((step) => (
            <div key={step.step} className="text-center p-6">
              <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
                {step.icon}
              </div>
              <div className="inline-flex items-center justify-center w-7 h-7 bg-primary-600 text-white rounded-full text-sm font-bold mb-3">
                {step.step}
              </div>
              <h3 className="font-semibold text-lg text-gray-900 mb-2">{step.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Shops */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Featured shops</h2>
              <p className="text-gray-500 text-sm mt-1">Top-rated sellers on Tejam</p>
            </div>
            <Link to="/browse" className="text-primary-600 text-sm font-medium hover:underline">
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

      {/* Featured Food Items */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Today's deals</h2>
              <p className="text-gray-500 text-sm mt-1">Fresh surplus food available now</p>
            </div>
            <Link to="/browse" className="text-primary-600 text-sm font-medium hover:underline">
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
      <section className="bg-gradient-to-r from-accent-500 to-accent-600 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Own a food business in Uzbekistan?</h2>
          <p className="text-accent-100 text-lg mb-8 max-w-2xl mx-auto">
            Join Tejam and turn your surplus food into sales. Reduce waste, earn more revenue, and reach thousands of hungry customers.
          </p>
          <Link
            to="/register"
            className="inline-block bg-white text-accent-600 font-bold py-3 px-8 rounded-xl hover:bg-accent-50 transition-colors shadow-lg"
          >
            Register your shop for free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">T</span>
              </div>
              <span className="text-white font-bold text-lg">Tejam</span>
            </div>
            <p className="text-sm">
              © 2026 Tejam. Reducing food waste across Uzbekistan 🇺🇿
            </p>
            <div className="flex gap-6 text-sm">
              <span>Tashkent, Uzbekistan 🇺🇿</span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}
