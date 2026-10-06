import { AssistantPage } from '@/components/interfaces/Twin/assistant/AssistantPage'
import { DefaultLayout } from '@/components/layouts/DefaultLayout'
import { ProjectLayoutWithAuth } from '@/components/layouts/ProjectLayout'
import type { NextPageWithLayout } from '@/types'

const AssistantRoute: NextPageWithLayout = () => {
  return <AssistantPage />
}

AssistantRoute.getLayout = (page) => (
  <DefaultLayout>
    <ProjectLayoutWithAuth>{page}</ProjectLayoutWithAuth>
  </DefaultLayout>
)

export default AssistantRoute
