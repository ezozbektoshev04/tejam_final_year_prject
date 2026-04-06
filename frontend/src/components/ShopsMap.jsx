import { useEffect, useRef } from 'react'
import { loadYandexMaps, hasYandexKey } from '../utils/yandexMaps'

const CATEGORY_PRESET = {
  Grocery: 'islands#greenDotIcon',
  Bakery: 'islands#brownDotIcon',
  Restaurant: 'islands#blueDotIcon',
  'Fast Food': 'islands#redDotIcon',
  Cafe: 'islands#violetDotIcon',
}

const CATEGORY_COLOR = {
  Grocery: '#16a34a',
  Bakery: '#92400e',
  Restaurant: '#2563eb',
  'Fast Food': '#dc2626',
  Cafe: '#7c3aed',
}

function balloonContent(shop, bagCount) {
  const color = CATEGORY_COLOR[shop.category] || '#1a7548'
  return `
    <div style="padding:10px 4px 4px;min-width:200px;font-family:sans-serif">
      <div style="font-weight:700;font-size:14px;color:#111">${shop.name}</div>
      <div style="color:#666;font-size:12px;margin-top:2px">${shop.category} · ${shop.address || shop.city}</div>
      <div style="color:${color};font-size:12px;font-weight:600;margin-top:6px">
        ${bagCount} bag${bagCount !== 1 ? 's' : ''} available
      </div>
      <a
        href="/browse?shop=${shop.id}"
        style="display:inline-block;margin-top:8px;background:${color};color:#fff;padding:5px 12px;border-radius:6px;font-size:12px;text-decoration:none;font-weight:600"
      >
        View deals →
      </a>
    </div>
  `
}

export default function ShopsMap({ shops, foodItems, userLocation }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)

  // Count available bags per shop
  const bagCountByShop = {}
  foodItems.forEach(item => {
    bagCountByShop[item.shop_id] = (bagCountByShop[item.shop_id] || 0) + 1
  })

  useEffect(() => {
    if (!hasYandexKey || !mapRef.current) return

    const shopsWithCoords = shops.filter(s => s.lat && s.lng)
    if (shopsWithCoords.length === 0) return

    let cancelled = false

    loadYandexMaps().then((ymaps) => {
      if (cancelled || !mapRef.current) return

      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy()
        mapInstanceRef.current = null
      }

      // Center on Tashkent or average of all shop coords
      const avgLat = shopsWithCoords.reduce((s, sh) => s + sh.lat, 0) / shopsWithCoords.length
      const avgLng = shopsWithCoords.reduce((s, sh) => s + sh.lng, 0) / shopsWithCoords.length

      const map = new ymaps.Map(mapRef.current, {
        center: [avgLat, avgLng],
        zoom: 13,
        controls: ['zoomControl', 'fullscreenControl'],
      })

      // Add shop pins
      shopsWithCoords.forEach(shop => {
        const preset = CATEGORY_PRESET[shop.category] || 'islands#grayDotIcon'
        const count = bagCountByShop[shop.id] || 0
        const placemark = new ymaps.Placemark(
          [shop.lat, shop.lng],
          {
            balloonContent: balloonContent(shop, count),
            hintContent: `${shop.name} — ${count} bag${count !== 1 ? 's' : ''}`,
          },
          { preset, balloonCloseButton: true }
        )
        map.geoObjects.add(placemark)
      })

      // Add user location pin if available
      if (userLocation) {
        const userPin = new ymaps.Placemark(
          [userLocation.lat, userLocation.lng],
          { hintContent: 'Your location' },
          { preset: 'islands#darkBlueDotIcon' }
        )
        map.geoObjects.add(userPin)
      }

      mapInstanceRef.current = map
    }).catch(() => {})

    return () => {
      cancelled = true
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy()
        mapInstanceRef.current = null
      }
    }
  }, [shops, foodItems, userLocation])

  if (!hasYandexKey) {
    return (
      <div className="bg-gray-50 rounded-xl border border-gray-200 h-[500px] flex flex-col items-center justify-center gap-2 text-gray-400">
        <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <p className="text-sm">Yandex Maps API key not configured</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl overflow-hidden border border-gray-200">
      <div ref={mapRef} style={{ width: '100%', height: '520px' }} />
      {/* Legend */}
      <div className="bg-white px-4 py-3 border-t border-gray-100 flex flex-wrap gap-4">
        {Object.entries(CATEGORY_COLOR).map(([cat, color]) => (
          <div key={cat} className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
            {cat}
          </div>
        ))}
        {userLocation && (
          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-blue-700" />
            Your location
          </div>
        )}
      </div>
    </div>
  )
}
