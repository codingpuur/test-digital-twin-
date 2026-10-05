import { DashboardEditor } from '@/components/interfaces/Twin/dashboards/DashboardEditor'
import { DefaultLayout } from '@/components/layouts/DefaultLayout'
import { ProjectLayoutWithAuth } from '@/components/layouts/ProjectLayout'
import type { NextPageWithLayout } from '@/types'

const DashboardPage: NextPageWithLayout = () => {
  return <DashboardEditor />
}

DashboardPage.getLayout = (page) => (
  <DefaultLayout>
    <ProjectLayoutWithAuth>{page}</ProjectLayoutWithAuth>
  </DefaultLayout>
)

export default DashboardPage
