import { useCallback } from 'react'

import type { Dashboard } from './dashboards.types'
import { useLocalStorage } from '@/hooks/misc/useLocalStorage'

const storageKey = (siteRef: string) => `twin-dashboards-${siteRef}`

export const createDashboardId = () => `dash-${Math.random().toString(36).slice(2, 10)}`

export const useDashboards = (siteRef: string) => {
  const [dashboards, setDashboards] = useLocalStorage<Dashboard[]>(storageKey(siteRef), [])

  const addDashboard = useCallback(
    (input: Pick<Dashboard, 'name' | 'description'> & { template: string }) => {
      const dashboard: Dashboard = {
        id: createDashboardId(),
        name: input.name,
        description: input.description,
        cards:
          input.template === 'pumping-station'
            ? [
                {
                  id: 'card-1',
                  type: 'last-value',
                  config: { streamIds: ['level'] },
                },
                {
                  id: 'card-2',
                  type: 'value-over-time',
                  config: { streamIds: ['flow', 'pressure'] },
                },
                {
                  id: 'card-3',
                  type: 'parameters-summary',
                  config: { streamIds: ['flow', 'pressure', 'level', 'power', 'vibration'] },
                },
              ]
            : [],
        createdAt: new Date().toISOString(),
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
