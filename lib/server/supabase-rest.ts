import 'server-only'

interface SupabaseRestRequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  path: string
  query?: Record<string, string | number | boolean | null | undefined>
  body?: unknown
  prefer?: string
  headers?: Record<string, string>
}

interface PostgrestError {
  message: string
  details?: string
  hint?: string
  code?: string
}

export class SupabaseRestError extends Error {
  readonly status: number
  readonly details?: PostgrestError

  constructor(status: number, details?: PostgrestError) {
    super(details?.message ?? `Supabase REST request failed with status ${status}`)
    this.status = status
    this.details = details
  }
}

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.')
  }
  return { url, serviceRoleKey }
}

function buildSupabaseRestUrl(path: string, query?: SupabaseRestRequestOptions['query']): URL {
  const { url } = getSupabaseConfig()
  const normalizedBase = url.endsWith('/') ? url.slice(0, -1) : url
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const requestUrl = new URL(`${normalizedBase}${normalizedPath}`)

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null) return
      requestUrl.searchParams.set(key, String(value))
    })
  }

  return requestUrl
}

export async function supabaseRestRequest<T>(options: SupabaseRestRequestOptions): Promise<T> {
  const { serviceRoleKey } = getSupabaseConfig()
  const requestUrl = buildSupabaseRestUrl(options.path, options.query)

  const headers: Record<string, string> = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    ...options.headers,
  }

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  if (options.prefer) {
    headers.Prefer = options.prefer
  }

  const response = await fetch(requestUrl, {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    cache: 'no-store',
  })

  const raw = await response.text()
  let parsed: unknown = null
  if (raw) {
    try {
      parsed = JSON.parse(raw)
    } catch {
      parsed = { message: raw }
    }
  }

  if (!response.ok) {
    throw new SupabaseRestError(response.status, (parsed ?? undefined) as PostgrestError | undefined)
  }

  return parsed as T
}
