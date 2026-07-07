export function useMap() {
  const API_KEY = '9fe54ab8df0243668592ff8e922a50c2'

  const getStaticMap = async (lat: number, lng: number) => {
    const styles = ['satellite', 'osm-bright']

    for (const style of styles) {
      const url =
        `https://maps.geoapify.com/v1/staticmap?` +
        `style=${style}&width=1200&height=700&zoom=17&scaleFactor=2&` +
        `center=lonlat:${lng},${lat}&` +
        `marker=lonlat:${lng},${lat};color:red&` +
        `apiKey=${API_KEY}`

      try {
        const response = await fetch(url)
        if (!response.ok) continue

        const blob = await response.blob()
        return URL.createObjectURL(blob)
      } catch {
        continue
      }
    }

    throw new Error('Failed to fetch map image')
  }

  return { getStaticMap }
}
