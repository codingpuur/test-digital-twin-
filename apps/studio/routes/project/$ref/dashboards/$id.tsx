import { createFileRoute } from '@tanstack/react-router'

import { ProjectLayoutWithAuth } from '@/components/layouts/ProjectLayout'
import DashboardPage from '@/pages/project/[ref]/dashboards/[id]'

export const Route = createFileRoute('/project/$ref/dashboards/$id')({
  component: DashboardRoute,
})

function DashboardRoute() {
  return (
    <ProjectLayoutWithAuth>
      <DashboardPage dehydratedState={undefined} />
    </ProjectLayoutWithAuth>
  )
}
