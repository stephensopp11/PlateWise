import { useState, useCallback } from 'react'

export type GeolocationStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable'

export interface GeolocationState {
  status: GeolocationStatus
  lat: number | null
  lng: number | null
  error: string | null
  request: () => void
  clear: () => void
}

export function useGeolocation(): GeolocationState {
  const [status, setStatus] = useState<GeolocationStatus>(
    typeof navigator !== 'undefined' && !navigator.geolocation ? 'unavailable' : 'idle'
  )
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const request = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus('unavailable')
      return
    }
    setStatus('requesting')
    setError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude)
        setLng(pos.coords.longitude)
        setStatus('granted')
      },
      (err) => {
        setStatus('denied')
        setError(
          err.code === err.PERMISSION_DENIED
            ? 'Location access was denied. You can enable it in your browser settings.'
            : 'Could not determine your location. Please try again.'
        )
      },
      { timeout: 10000, maximumAge: 300_000 }
    )
  }, [])

  const clear = useCallback(() => {
    setStatus('idle')
    setLat(null)
    setLng(null)
    setError(null)
  }, [])

  return { status, lat, lng, error, request, clear }
}
