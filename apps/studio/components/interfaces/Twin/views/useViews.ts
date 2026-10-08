import { useCallback } from 'react'

import type { TwinView, ViewSnapshot } from './views.types'
import { useLocalStorage } from '@/hooks/misc/useLocalStorage'

const createViewId = () => `view-${Math.random().toString(36).slice(2, 10)}`

/** Saved views of a site, kept in the browser like dashboards. */
export const useViews = (siteRef: string) => {
  const [views, setViews] = useLocalStorage<TwinView[]>(`twin-views-${siteRef}`, [])

  const addView = useCallback(
    (name: string, snapshot: ViewSnapshot) => {
      const view: TwinView = {
        id: createViewId(),
        name,
        createdAt: new Date().toISOString(),
        ...snapshot,
      }
      setViews((previous) => [...previous, view])
      return view
    },
    [setViews]
  )

  /** Replaces what a view shows with the current screen, keeping its name. */
  const updateView = useCallback(
    (id: string, snapshot: ViewSnapshot) =>
      setViews((previous) =>
        previous.map((view) => (view.id === id ? { ...view, ...snapshot } : view))
      ),
    [setViews]
  )

  const renameView = useCallback(
    (id: string, name: string) =>
      setViews((previous) => previous.map((view) => (view.id === id ? { ...view, name } : view))),
    [setViews]
  )

  const deleteView = useCallback(
    (id: string) => setViews((previous) => previous.filter((view) => view.id !== id)),
    [setViews]
  )

  return { views, addView, updateView, renameView, deleteView }
}
