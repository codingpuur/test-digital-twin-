import type { TwinView } from './views.types'

export const filterViews = (views: TwinView[], search: string) => {
  const query = search.trim().toLowerCase()
  return query ? views.filter((view) => view.name.toLowerCase().includes(query)) : views
}

/** Views that a dashboard is bound to, shown as their own group like in Tandem. */
export const splitByDashboards = (views: TwinView[], dashboardViewIds: Set<string>) => ({
  fromDashboards: views.filter((view) => dashboardViewIds.has(view.id)),
  others: views.filter((view) => !dashboardViewIds.has(view.id)),
})

/** "Facility View", then "Facility View 2", "Facility View 3"... without clashing with an existing name. */
export const uniqueViewName = (base: string, views: Pick<TwinView, 'name'>[]) => {
  const names = new Set(views.map((view) => view.name.toLowerCase()))
  if (!names.has(base.toLowerCase())) return base
  let counter = 2
  while (names.has(`${base} ${counter}`.toLowerCase())) counter += 1
  return `${base} ${counter}`
}
