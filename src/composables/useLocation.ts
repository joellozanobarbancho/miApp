import { ref } from 'vue'
import { Geolocation } from '@capacitor/geolocation'

const lastLocation = ref<{
  lat: number
  lng: number
  accuracy: number
} | null>(null)

const watchingId = ref<string | null>(null)

export async function requestLocationPermission() {
  try {
    const perm = await Geolocation.requestPermissions()
    return perm
  } catch (err) {
    console.error('Error solicitando permisos de ubicación', err)
    throw err
  }
}

export async function getPreciseLocation() {
  await Geolocation.requestPermissions()

  const pos = await Geolocation.getCurrentPosition({
    enableHighAccuracy: true,
    timeout: 8000,
    maximumAge: 0
  })

  return {
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
    accuracy: pos.coords.accuracy
  }
}


export async function getApproxLocation() {
  await requestLocationPermission()

  const pos = await Geolocation.getCurrentPosition({
    enableHighAccuracy: false,
    timeout: 5000,
    maximumAge: 10000
  })

  const data = {
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
    accuracy: pos.coords.accuracy
  }

  lastLocation.value = data
  return data
}

export async function startWatchingLocation(callback?: (loc: any) => void) {
  await requestLocationPermission()
  const id = await Geolocation.watchPosition(
    { enableHighAccuracy: true },
    pos => {
      if (!pos || !pos.coords) return

      const data = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy
      }

      lastLocation.value = data
      callback?.(data)
    }
  )

  watchingId.value = id
}

export function stopWatchingLocation() {
  if (watchingId.value) {
    Geolocation.clearWatch({ id: watchingId.value })
    watchingId.value = null
  }
}

export function useLastLocation() {
  return lastLocation
}
