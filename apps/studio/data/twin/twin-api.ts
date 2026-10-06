import { constructHeaders, fetchHandler } from '@/data/fetchers'
import { API_URL } from '@/lib/constants'

// The twin endpoints belong to the mock backend and are not in the generated OpenAPI types, so
// they are called through the same fetch wrapper and auth headers as the typed client.
export const twinFetch = async (path: string, init: RequestInit = {}) => {
  const headers = await constructHeaders(init.headers)
  const response = await fetchHandler(`${API_URL}/platform/twin${path}`, { ...init, headers })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.error?.message ?? `Request failed (${response.status})`)
  }
  return response
}

export const twinFetchJson = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const headers = new Headers(init.headers)
  if (init.body) headers.set('Content-Type', 'application/json')
  return (await twinFetch(path, { ...init, headers })).json()
}
