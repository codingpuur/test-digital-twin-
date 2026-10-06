import { createFileRoute } from '@tanstack/react-router'

import { ProjectLayoutWithAuth } from '@/components/layouts/ProjectLayout'
import AssistantRoute from '@/pages/project/[ref]/assistant'

export const Route = createFileRoute('/project/$ref/assistant')({
  component: ProjectAssistantRoute,
})

function ProjectAssistantRoute() {
  return (
    <ProjectLayoutWithAuth>
      <AssistantRoute dehydratedState={undefined} />
    </ProjectLayoutWithAuth>
  )
}
