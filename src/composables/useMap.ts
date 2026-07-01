export function useMap() {
  const API_KEY = '9fe54ab8df0243668592ff8e922a50c2'

  const getStaticMap = async (lat: number, lng: number) => {
    const url =
      `https://maps.geoapify.com/v1/staticmap?` +
      `style=osm-carto&width=600&height=400&zoom=15&` +
      `center=lonlat:${lng},${lat}&` +
      `marker=lonlat:${lng},${lat};color:red&` +
      `apiKey=${API_KEY}`

    const response = await fetch(url)

    if (!response.ok) {
      throw new Error('Failed to fetch map image')
    }

    const blob = await response.blob()
    return URL.createObjectURL(blob)
  }

  // Geocodificación inversa gratuita (OpenStreetMap Nominatim) para rellenar
  // Indirizzo/Comune a partir del GPS en el paso "Identificazione e indirizzo".
  const reverseGeocode = async (lat: number, lng: number) => {
    const url =
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`

    const response = await fetch(url, {
      headers: { Accept: 'application/json' }
    })

    if (!response.ok) {
      throw new Error('Failed to reverse geocode location')
    }

    const data = await response.json()
    const addr = data.address ?? {}

    const streetPart = [addr.road, addr.house_number].filter(Boolean).join(', ')
    const indirizzo = streetPart || data.display_name || ''
    const comune = addr.city ?? addr.town ?? addr.village ?? addr.municipality ?? ''

    return { indirizzo, comune }
  }

  return { getStaticMap, reverseGeocode }
}
