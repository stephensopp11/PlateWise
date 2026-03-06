import { useState } from 'react'
import { Map, Marker, Overlay } from 'pigeon-maps'
import { openTableUrl, priceLabel } from '@/lib/places'
import type { PlaceResult } from '@/lib/places'

interface Props {
  places: PlaceResult[]
  scannedMap?: Map<string, { avgMenuScore: number; bestMatchCount: number; totalItems: number }>
  onView: (place: PlaceResult) => void
  userLat?: number | null
  userLng?: number | null
}

function scoreColor(score: number) {
  if (score >= 75) return '#16a34a'   // green-600
  if (score >= 50) return '#d97706'   // amber-600
  return '#dc2626'                    // red-600
}

export default function RestaurantMap({ places, scannedMap, onView, userLat, userLng }: Props) {
  const [selected, setSelected] = useState<PlaceResult | null>(null)

  const mappable = places.filter((p) => p.lat !== null && p.lng !== null)

  if (mappable.length === 0 && (userLat == null || userLng == null)) {
    return (
      <div className="border rounded-xl h-64 flex items-center justify-center text-muted-foreground text-sm">
        No location data available for these restaurants.
      </div>
    )
  }

  // Center on user location if available, otherwise average of restaurant points
  const centerLat = userLat ?? (mappable.reduce((s, p) => s + p.lat!, 0) / mappable.length)
  const centerLng = userLng ?? (mappable.reduce((s, p) => s + p.lng!, 0) / mappable.length)

  return (
    <div className="relative rounded-xl overflow-hidden border" style={{ height: 400 }}>
      <Map
        defaultCenter={[centerLat, centerLng]}
        defaultZoom={13}
        onClick={() => setSelected(null)}
      >
        {/* User location dot */}
        {userLat != null && userLng != null && (
          <Overlay anchor={[userLat, userLng]} offset={[12, 12]}>
            <div className="relative flex items-center justify-center">
              <span className="absolute inline-block w-8 h-8 rounded-full bg-blue-400/30 animate-ping" />
              <span className="inline-block w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-md" />
            </div>
          </Overlay>
        )}
        {mappable.map((place) => {
          const scanned = scannedMap?.get(place.name.toLowerCase())
          const color = scanned ? scoreColor(scanned.avgMenuScore) : '#6366f1' // indigo for unscanned

          return (
            <Marker
              key={place.id}
              anchor={[place.lat!, place.lng!]}
              color={color}
              width={selected?.id === place.id ? 42 : 32}
              onClick={(e) => {
                e.event.stopPropagation()
                setSelected(place)
              }}
            />
          )
        })}

        {selected && selected.lat !== null && selected.lng !== null && (() => {
          const scanned = scannedMap?.get(selected.name.toLowerCase())
          const compatColor = scanned
            ? scanned.avgMenuScore >= 75 ? 'text-green-600'
            : scanned.avgMenuScore >= 50 ? 'text-amber-500'
            : 'text-red-500'
            : ''

          return (
            <Overlay anchor={[selected.lat, selected.lng]} offset={[120, 230]}>
              <div className="bg-white border rounded-xl shadow-lg p-3 w-56 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{selected.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {selected.cuisine}
                      {selected.priceLevel ? ` · ${priceLabel(selected.priceLevel)}` : ''}
                      {selected.rating != null ? ` · ⭐ ${selected.rating.toFixed(1)}` : ''}
                    </p>
                  </div>
                  {scanned && (
                    <p className={`text-sm font-bold shrink-0 ${compatColor}`}>
                      {scanned.avgMenuScore}%
                    </p>
                  )}
                </div>

                {scanned && (
                  <p className="text-xs text-muted-foreground">
                    {scanned.bestMatchCount} of {scanned.totalItems} dishes are a Best Match
                  </p>
                )}

                <div className="flex gap-1.5">
                  <button
                    onClick={() => onView(selected)}
                    className="flex-1 bg-primary text-primary-foreground rounded-lg py-1.5 text-xs font-medium hover:opacity-90 transition"
                  >
                    {scanned ? 'View scores' : 'Scan menu'}
                  </button>
                  <a
                    href={openTableUrl(selected.name)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 border rounded-lg py-1.5 text-xs font-medium text-center hover:bg-muted transition"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Book
                  </a>
                </div>
              </div>
            </Overlay>
          )
        })()}
      </Map>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur rounded-lg border px-3 py-2 text-xs space-y-1 shadow">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-600" />
          <span>75%+ match</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span>50–74% match</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500" />
          <span>Below 50%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-indigo-500" />
          <span>Not yet scanned</span>
        </div>
      </div>
    </div>
  )
}
