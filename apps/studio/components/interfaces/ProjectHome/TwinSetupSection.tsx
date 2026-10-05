import { Check, FileUp, Link2, Lock, Network, Shapes, SlidersHorizontal, Upload } from 'lucide-react'
import type { ReactNode } from 'react'
import { Badge, Button, Card, CardContent, cn } from 'ui'

type StepStatus = 'done' | 'current' | 'locked'

type TwinSetupStep = {
  id: string
  heading: string
  subheading: string
  icon: ReactNode
  status: StepStatus
}

const TWIN_SETUP_STEPS: TwinSetupStep[] = [
  {
    id: 'site',
    heading: 'Site created',
    subheading: 'Done',
    icon: <Check size={16} strokeWidth={1.5} />,
    status: 'done',
  },
  {
    id: 'model',
    heading: 'Upload 3D model',
    subheading: 'Current step',
    icon: <FileUp size={16} strokeWidth={1.5} />,
    status: 'current',
  },
  {
    id: 'classification',
    heading: 'Classification',
    subheading: 'Locked',
    icon: <Shapes size={16} strokeWidth={1.5} />,
    status: 'locked',
  },
  {
    id: 'mapping',
    heading: 'Map parameters',
    subheading: 'Locked',
    icon: <SlidersHorizontal size={16} strokeWidth={1.5} />,
    status: 'locked',
  },
  {
    id: 'linking',
    heading: 'Link data and docs',
    subheading: 'Locked',
    icon: <Link2 size={16} strokeWidth={1.5} />,
    status: 'locked',
  },
  {
    id: 'ontology',
    heading: 'Ontology and publish',
    subheading: 'Locked',
    icon: <Network size={16} strokeWidth={1.5} />,
    status: 'locked',
  },
]

export const TwinSetupSection = () => {
  const doneCount = TWIN_SETUP_STEPS.filter((step) => step.status === 'done').length

  return (
    <section className="w-full flex flex-col gap-y-6">
      <div className="flex items-center gap-x-3">
        <h3 className="heading-section">Build your digital twin</h3>
        <Badge variant="default">
          {doneCount} of {TWIN_SETUP_STEPS.length} done
        </Badge>
      </div>

      <Card className="bg-background/25 overflow-hidden">
        <CardContent className="p-0">
          <div className="grid grid-cols-1 xl:grid-cols-6 divide-y xl:divide-y-0 xl:divide-x border-muted">
            {TWIN_SETUP_STEPS.map((step, index) => (
              <div
                key={step.id}
                className={cn(
                  'flex items-center gap-3 p-4 min-h-[72px]',
                  'xl:min-h-32 xl:flex-col xl:justify-center xl:p-6 xl:text-center',
                  step.status === 'current' && 'bg-surface-100',
                  step.status === 'locked' && 'opacity-50'
                )}
              >
                <span
                  className={cn(
                    'flex size-7 shrink-0 items-center justify-center rounded-full border text-xs',
                    step.status === 'done' && 'bg-brand text-background border-brand',
                    step.status === 'current' && 'border-brand text-brand-link',
                    step.status === 'locked' && 'text-foreground-lighter'
                  )}
                >
                  {step.status === 'done' && <Check size={14} />}
                  {step.status === 'locked' && <Lock size={12} />}
                  {step.status === 'current' && index + 1}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1 xl:flex-initial">
                  <p className="text-sm">{step.heading}</p>
                  <p className="text-sm text-foreground-lighter">{step.subheading}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-y-3 py-10 text-center">
          <FileUp size={28} strokeWidth={1.5} className="text-brand-link" />
          <div className="flex flex-col gap-y-1">
            <p className="text-base">Drag and drop your 3D model here</p>
            <p className="text-sm text-foreground-lighter">GLB, glTF or IFC, up to 500 MB</p>
          </div>
          <Button type="primary" icon={<Upload size={14} />}>
            Browse files
          </Button>
        </CardContent>
      </Card>
    </section>
  )
}
