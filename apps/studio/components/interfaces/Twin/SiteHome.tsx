import { Badge } from 'ui'

import { TwinSetupSection } from '@/components/interfaces/ProjectHome/TwinSetupSection'
import { ScaffoldContainer, ScaffoldSection } from '@/components/layouts/Scaffold'
import { useSelectedProjectQuery } from '@/hooks/misc/useSelectedProject'

export const SiteHome = () => {
  const { data: site } = useSelectedProjectQuery()

  return (
    <ScaffoldContainer size="large">
      <ScaffoldSection isFullWidth className="gap-y-10 pb-32">
        <div className="flex flex-col gap-y-1">
          <div className="flex items-center gap-x-3">
            <h1 className="text-3xl">{site?.name ?? 'Site'}</h1>
            <Badge variant="warning">Draft</Badge>
          </div>
          <p className="text-sm text-foreground-light">
            Pumping station. Finish the steps below to publish its digital twin.
          </p>
        </div>
        <TwinSetupSection />
      </ScaffoldSection>
    </ScaffoldContainer>
  )
}
