import { useEffect, useRef } from 'react'
import { loadYandexMaps, hasYandexKey } from '../utils/yandexMaps'

const hasKey = hasYandexKey

export default function MapEmbed({ address, shopName, city = 'Tashkent', lat, lng }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)

  const query = `${shopName ? shopName + ', ' : ''}${address || ''}, ${city}, Uzbekistan`
  const hasCoords = lat && lng

  // Use exact coordinates when available, fall back to text search
  const directionsUrl = hasCoords
    ? `https://yandex.com/maps/?rtext=~${lat},${lng}&rtt=auto`
    : `https://yandex.com/maps/?rtext=~${encodeURIComponent(query)}&rtt=auto`

  const searchUrl = hasCoords
    ? `https://yandex.com/maps/?ll=${lng},${lat}&z=16&pt=${lng},${lat},pm2rdm`
    : `https://yandex.com/maps/?text=${encodeURIComponent(query)}`

  useEffect(() => {
    if (!hasKey || !mapRef.current) return

    let cancelled = false

    loadYandexMaps().then((ymaps) => {
      if (cancelled || !mapRef.current) return

      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy()
        mapInstanceRef.current = null
      }

      const initMap = (coords) => {
        if (cancelled || !mapRef.current) return
        const map = new ymaps.Map(mapRef.current, {
          center: coords,
          zoom: 15,
          controls: ['zoomControl'],
        })
        map.geoObjects.add(
          new ymaps.Placemark(coords, {
            balloonContent: shopName || address,
          })
        )
        mapInstanceRef.current = map
      }

      if (lat && lng) {
        // Use coordinates directly — no geocoding needed
        initMap([lat, lng])
      } else {
        ymaps.geocode(query).then((result) => {
          const geoObject = result.geoObjects.get(0)
          if (geoObject) initMap(geoObject.geometry.getCoordinates())
        }).catch(() => {})
      }
    }).catch(() => {})

    return () => {
      cancelled = true
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy()
        mapInstanceRef.current = null
      }
    }
  }, [lat, lng, address, shopName, city])

  if (!address && !shopName) return null

  return (
    <div className="mt-4 rounded-xl overflow-hidden border border-gray-200">
      {hasKey ? (
        <div ref={mapRef} style={{ width: '100%', height: '220px' }} />
      ) : (
        <div className="bg-gray-50 h-36 flex flex-col items-center justify-center gap-2 text-sm text-gray-400">
          <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="font-medium text-gray-500">{address}</span>
          <span className="text-xs">{city}</span>
        </div>
      )}

      <div className="flex gap-2 p-3 bg-white">
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 btn-primary text-sm py-2 text-center flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          Get directions
        </a>
        <a
          href={searchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 btn-secondary text-sm py-2 text-center flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Open in Maps
        </a>
      </div>
    </div>
  )
}
