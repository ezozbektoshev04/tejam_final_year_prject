const YANDEX_MAPS_API_KEY = import.meta.env.VITE_YANDEX_MAPS_API_KEY

export const hasYandexKey =
  !!YANDEX_MAPS_API_KEY && YANDEX_MAPS_API_KEY !== 'your-yandex-maps-api-key-here'

let scriptLoading = false
const callbacks = []

export function getYmaps() {
  return /** @type {any} */ (window).ymaps
}

export function loadYandexMaps() {
  return new Promise((resolve, reject) => {
    const ymaps = getYmaps()
    if (ymaps) {
      ymaps.ready(() => resolve(ymaps))
      return
    }
    callbacks.push({ resolve, reject })
    if (scriptLoading) return
    scriptLoading = true
    const script = document.createElement('script')
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${YANDEX_MAPS_API_KEY}&lang=ru_RU`
    script.onload = () => {
      getYmaps().ready(() => {
        const y = getYmaps()
        callbacks.forEach(cb => cb.resolve(y))
        callbacks.length = 0
      })
    }
    script.onerror = (e) => {
      callbacks.forEach(cb => cb.reject(e))
      callbacks.length = 0
    }
    document.head.appendChild(script)
  })
}
