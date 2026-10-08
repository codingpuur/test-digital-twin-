import { useCallback } from 'react'

import type { Dashboard, DashboardCard } from './dashboards.types'
import { useLocalStorage } from '@/hooks/misc/useLocalStorage'

const storageKey = (siteRef: string) => `twin-dashboards-${siteRef}`

export const createDashboardId = () => `dash-${Math.random().toString(36).slice(2, 10)}`

const PUMPING_STATION_CARDS: DashboardCard[] = [
  { id: 'card-1', type: 'last-value', config: { streamIds: ['level'] } },
  { id: 'card-2', type: 'last-value', config: { streamIds: ['vibration'] } },
  { id: 'card-3', type: 'parameter-value', config: { streamIds: ['flow'] } },
  { id: 'card-4', type: 'parameter-value', config: { streamIds: ['power'] } },
  { id: 'card-5', type: 'value-over-time', config: { streamIds: ['flow', 'pressure'] } },
  { id: 'card-6', type: 'value-over-time', config: { streamIds: ['level', 'temperature'] } },
  {
    id: 'card-7',
    type: 'parameters-summary',
    config: { streamIds: ['flow', 'pressure', 'level', 'power', 'vibration', 'temperature'] },
  },
  {
    id: 'card-8',
    type: 'custom-text',
    config: {
      streamIds: [],
      title: 'About this dashboard',
      text: 'Sample data. Add a card and pick your own streams once data is flowing in.',
    },
  },
]

/** Shown on a site until the user creates or deletes dashboards, so there is something to look at. */
const SAMPLE_DASHBOARD: Dashboard = {
  id: 'dash-sample',
  name: 'Pumping station overview',
  description: 'Sample dashboard with level, flow, pressure and pump health.',
  cards: PUMPING_STATION_CARDS,
  createdAt: '2026-01-01T00:00:00.000Z',
}

export const useDashboards = (siteRef: string) => {
  const [dashboards, setDashboards] = useLocalStorage<Dashboard[]>(storageKey(siteRef), [
    SAMPLE_DASHBOARD,
  ])

  const addDashboard = useCallback(
    (input: Pick<Dashboard, 'name' | 'description'> & { template: string; view?: string }) => {
      const dashboard: Dashboard = {
        id: createDashboardId(),
        name: input.name,
        description: input.description,
        cards: input.template === 'pumping-station' ? PUMPING_STATION_CARDS : [],
        createdAt: new Date().toISOString(),
        viewId: input.view && input.view !== 'all' ? input.view : undefined,
      }
      setDashboards((previous) => [...previous, dashboard])
      return dashboard
    },
    [setDashboards]
  )

  const saveDashboard = useCallback(
    (dashboard: Dashboard) =>
      setDashboards((previous) =>
        previous.map((item) => (item.id === dashboard.id ? dashboard : item))
      ),
    [setDashboards]
  )

  const deleteDashboard = useCallback(
    (id: string) => setDashboards((previous) => previous.filter((item) => item.id !== id)),
    [setDashboards]
  )

  return { dashboards, addDashboard, saveDashboard, deleteDashboard }
}
