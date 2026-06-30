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

  return { getStaticMap }
}
