import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Only these paths are reachable without a session — everything else redirects to login.
const PUBLIC_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/api/auth/login',
  '/api/auth/register',
]

// Ciudad de México + Estado de México — together they cover the CDMX
// metro area (Zona Metropolitana del Valle de México). ISO 3166-2 codes
// as reported by Vercel's edge geolocation headers.
const CDMX_METRO_REGIONS = new Set(['CMX', 'MEX'])

type GeoStatus = 'cdmx' | 'mx' | 'intl' | 'unknown'

function getGeoStatus(request: NextRequest): GeoStatus {
  const country = request.headers.get('x-vercel-ip-country')
  const region = request.headers.get('x-vercel-ip-country-region')

  // These headers are only populated on Vercel's edge network. Locally
  // (or on other hosts) they're absent, so we skip the check rather than
  // guess.
  if (!country) return 'unknown'
  if (country !== 'MX') return 'intl'
  if (region && CDMX_METRO_REGIONS.has(region)) return 'cdmx'
  return 'mx'
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://avmztbdgyyrqccizmzsh.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2bXp0YmRneXlycWNjaXptenNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NjcyNjQsImV4cCI6MjA5MTI0MzI2NH0.ELsHIm9fCTa1hGcW_GQdI_hhcwYu3VkwPTaxfilidl8',
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh the session — must be called before any redirect checks.
  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))

  if (!user && !isPublic) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/auth/login'
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  supabaseResponse.cookies.set('magma_geo', getGeoStatus(request), {
    path: '/',
    maxAge: 60 * 60 * 24,
    sameSite: 'lax',
  })

  return supabaseResponse
}

export const config = {
  matcher: [
    // Run on all paths except Next.js internals and static assets.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
