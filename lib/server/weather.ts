import 'server-only'

export interface WeatherSnapshot {
  cityQuery: string
  resolvedName: string
  timezone?: string
  temperatureMaxC: number | null
  temperatureMinC: number | null
  precipitationProbabilityMax: number | null
  weatherCode: number | null
  summary: string
}

function weatherCodeLabel(code: number | null, lang: 'en' | 'zh'): string {
  if (code == null) return lang === 'zh' ? '天气未知' : 'weather unknown'
  // WMO weather interpretation codes (simplified)
  if (code === 0) return lang === 'zh' ? '晴' : 'clear'
  if (code <= 3) return lang === 'zh' ? '多云' : 'partly cloudy'
  if (code <= 48) return lang === 'zh' ? '有雾' : 'foggy'
  if (code <= 67) return lang === 'zh' ? '有雨' : 'rainy'
  if (code <= 77) return lang === 'zh' ? '有雪' : 'snowy'
  if (code <= 82) return lang === 'zh' ? '阵雨' : 'showers'
  if (code <= 99) return lang === 'zh' ? '有雷暴' : 'thunderstorms'
  return lang === 'zh' ? '天气多变' : 'mixed conditions'
}

/**
 * Free Open-Meteo geocoding + forecast. No API key required.
 * Used when the daily reading may include wear / outdoor / weather-sensitive advice.
 */
async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { cache: 'no-store', signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

export async function fetchLocalWeatherForecast(
  cityCountry: string,
  date: string,
  lang: 'en' | 'zh' = 'en'
): Promise<WeatherSnapshot | null> {
  const query = cityCountry.trim()
  if (!query) return null

  try {
    const geoUrl = new URL('https://geocoding-api.open-meteo.com/v1/search')
    geoUrl.searchParams.set('name', query.split(',')[0].trim())
    geoUrl.searchParams.set('count', '1')
    geoUrl.searchParams.set('language', lang === 'zh' ? 'zh' : 'en')
    geoUrl.searchParams.set('format', 'json')

    // Keep weather optional and fast — never block the reading for long.
    const geoRes = await fetchWithTimeout(geoUrl.toString(), 2500)
    if (!geoRes.ok) return null
    const geoJson = (await geoRes.json()) as {
      results?: Array<{ name: string; latitude: number; longitude: number; timezone?: string; country?: string }>
    }
    const place = geoJson.results?.[0]
    if (!place) return null

    const forecastUrl = new URL('https://api.open-meteo.com/v1/forecast')
    forecastUrl.searchParams.set('latitude', String(place.latitude))
    forecastUrl.searchParams.set('longitude', String(place.longitude))
    forecastUrl.searchParams.set('daily', 'weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max')
    forecastUrl.searchParams.set('timezone', place.timezone || 'auto')
    forecastUrl.searchParams.set('start_date', date)
    forecastUrl.searchParams.set('end_date', date)

    const wxRes = await fetchWithTimeout(forecastUrl.toString(), 2500)
    if (!wxRes.ok) return null
    const wxJson = (await wxRes.json()) as {
      daily?: {
        weathercode?: number[]
        temperature_2m_max?: number[]
        temperature_2m_min?: number[]
        precipitation_probability_max?: number[]
      }
    }

    const code = wxJson.daily?.weathercode?.[0] ?? null
    const tmax = wxJson.daily?.temperature_2m_max?.[0] ?? null
    const tmin = wxJson.daily?.temperature_2m_min?.[0] ?? null
    const pop = wxJson.daily?.precipitation_probability_max?.[0] ?? null
    const label = weatherCodeLabel(code, lang)
    const resolvedName = [place.name, place.country].filter(Boolean).join(', ')

    const summary =
      lang === 'zh'
        ? `${resolvedName}：${label}，气温约 ${tmin ?? '?'}–${tmax ?? '?'}°C` +
          (pop != null ? `，降水概率 ${pop}%` : '')
        : `${resolvedName}: ${label}, about ${tmin ?? '?'}–${tmax ?? '?'}°C` +
          (pop != null ? `, rain chance ${pop}%` : '')

    return {
      cityQuery: query,
      resolvedName,
      timezone: place.timezone,
      temperatureMaxC: tmax,
      temperatureMinC: tmin,
      precipitationProbabilityMax: pop,
      weatherCode: code,
      summary,
    }
  } catch (error) {
    console.error('Weather fetch failed:', error instanceof Error ? error.message : error)
    return null
  }
}
