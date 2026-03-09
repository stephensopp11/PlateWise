// Supabase Edge Function: places-search
// Proxies Google Places API (New) Text Search requests server-side so the
// API key is never exposed in the client bundle.
// Also enforces a monthly call limit to prevent runaway API costs.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GOOGLE_PLACES_URL = 'https://places.googleapis.com/v1/places:searchText'
const MONTHLY_CALL_LIMIT = 500 // ~$8.50 at Advanced tier — hard stop under $10/month

const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.primaryTypeDisplayName',
  'places.priceLevel',
  'places.rating',
  'places.userRatingCount',
  'places.internationalPhoneNumber',
  'places.websiteUri',
].join(',')

// Google Places API priceLevel enum → numeric 1–3
function mapPriceLevel(level: string | undefined): 1 | 2 | 3 | null {
  switch (level) {
    case 'PRICE_LEVEL_FREE':
    case 'PRICE_LEVEL_INEXPENSIVE': return 1
    case 'PRICE_LEVEL_MODERATE':    return 2
    case 'PRICE_LEVEL_EXPENSIVE':
    case 'PRICE_LEVEL_VERY_EXPENSIVE': return 3
    default: return null
  }
}

Deno.serve(async (req) => {
  // ── CORS preflight ──────────────────────────────────────────────────────────
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    })
  }

  const corsHeaders = { 'Access-Control-Allow-Origin': '*' }

  try {
    // ── Auth: require valid Supabase JWT ──────────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl   = Deno.env.get('SUPABASE_URL')!
    const supabaseAnon  = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const googleApiKey  = Deno.env.get('GOOGLE_PLACES_API_KEY')

    if (!googleApiKey) {
      return new Response(JSON.stringify({ error: 'Google Places API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify JWT is valid (anon or user token)
    const userClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    })
    const { error: authError } = await userClient.auth.getUser()
    if (authError) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── Monthly call limit check ──────────────────────────────────────────────
    const adminClient = createClient(supabaseUrl, serviceKey)
    const month = new Date().toISOString().slice(0, 7) // 'YYYY-MM'

    const { data: usageRow } = await adminClient
      .from('api_usage')
      .select('call_count')
      .eq('month', month)
      .maybeSingle()

    const currentCount = usageRow?.call_count ?? 0
    if (currentCount >= MONTHLY_CALL_LIMIT) {
      return new Response(
        JSON.stringify({ error: 'Monthly API limit reached. Search will resume next month.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // ── Parse request body ────────────────────────────────────────────────────
    const body = await req.json() as {
      query: string
      userLat?: number | null
      userLng?: number | null
      radiusMiles?: number
    }

    if (!body.query?.trim()) {
      return new Response(JSON.stringify({ error: 'query is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── Build Google Places request ───────────────────────────────────────────
    const googleBody: Record<string, unknown> = {
      textQuery: body.query,
      maxResultCount: 20,
    }

    if (body.userLat != null && body.userLng != null) {
      googleBody.locationBias = {
        circle: {
          center: { latitude: body.userLat, longitude: body.userLng },
          radius: Math.round((body.radiusMiles ?? 10) * 1609.34),
        },
      }
    }

    // ── Call Google Places API ────────────────────────────────────────────────
    const googleRes = await fetch(GOOGLE_PLACES_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': googleApiKey,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify(googleBody),
    })

    if (!googleRes.ok) {
      const errBody = await googleRes.text().catch(() => '')
      return new Response(
        JSON.stringify({ error: `Google Places error: ${googleRes.status}`, detail: errBody }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const googleData = await googleRes.json()

    // ── Increment monthly call counter ────────────────────────────────────────
    await adminClient.from('api_usage').upsert(
      { month, call_count: currentCount + 1 },
      { onConflict: 'month' },
    )

    // ── Map Google response → PlaceResult[] ──────────────────────────────────
    type Place = Record<string, unknown>
    const results = ((googleData.places ?? []) as Place[]).map((p) => {
      const loc = p.location as { latitude: number; longitude: number } | undefined
      return {
        id:           p.id as string,
        name:         (p.displayName as { text: string } | undefined)?.text ?? 'Unknown',
        cuisine:      (p.primaryTypeDisplayName as { text: string } | undefined)?.text ?? 'Restaurant',
        priceLevel:   mapPriceLevel(p.priceLevel as string | undefined),
        address:      (p.formattedAddress as string) ?? '',
        neighborhood: '',
        phoneNumber:  (p.internationalPhoneNumber as string | undefined) ?? null,
        websiteUri:   (p.websiteUri as string | undefined) ?? null,
        lat:          loc?.latitude ?? null,
        lng:          loc?.longitude ?? null,
        rating:       (p.rating as number | undefined) ?? null,
        reviewCount:  (p.userRatingCount as number | undefined) ?? null,
        servesVegetarianFood: null,
        outdoorSeating: null,
        reservable:   null,
        goodForGroups: null,
        liveMusic:    null,
      }
    })

    return new Response(JSON.stringify({ results }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
