import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogSection,
  DialogSectionSeparator,
  DialogTitle,
  Form,
  FormControl,
  FormField,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from 'ui'
import { FormItemLayout } from 'ui-patterns/form/FormItemLayout/FormItemLayout'
import { z } from 'zod'

const formId = 'create-dashboard-form'

const TEMPLATES = [
  { value: 'blank', label: 'Blank dashboard' },
  { value: 'pumping-station', label: 'Pumping station overview' },
]

const schema = z.object({
  name: z.string().trim().min(1, 'Please enter a dashboard name'),
  description: z.string().trim(),
  template: z.string().min(1, 'Choose a blank dashboard or a template'),
  view: z.string(),
})

export type CreateDashboardValues = z.infer<typeof schema>

type CreateDashboardDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (values: CreateDashboardValues) => void
}

export const CreateDashboardDialog = ({
  open,
  onOpenChange,
  onCreate,
}: CreateDashboardDialogProps) => {
  const form = useForm<CreateDashboardValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', description: '', template: '', view: 'all' },
  })

  const handleSubmit = (values: CreateDashboardValues) => {
    onCreate(values)
    form.reset()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="medium" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Create dashboard</DialogTitle>
        </DialogHeader>
        <DialogSectionSeparator />
        <Form {...form}>
          <form id={formId} onSubmit={form.handleSubmit(handleSubmit)}>
            <DialogSection className="flex flex-col gap-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItemLayout label="Name" layout="vertical">
                    <FormControl>
                      <Input {...field} placeholder="Dashboard name" autoFocus />
                    </FormControl>
                  </FormItemLayout>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItemLayout label="Description" layout="vertical" description="Optional">
                    <FormControl>
                      <Textarea {...field} placeholder="What does this dashboard monitor?" rows={2} />
                    </FormControl>
                  </FormItemLayout>
                )}
              />
              <FormField
                control={form.control}
                name="template"
                render={({ field }) => (
                  <FormItemLayout label="Start with" layout="vertical">
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose blank dashboard or a template" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TEMPLATES.map((template) => (
                          <SelectItem key={template.value} value={template.value}>
                            {template.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItemLayout>
                )}
              />
              <FormField
                control={form.control}
                name="view"
                render={({ field }) => (
                  <FormItemLayout
                    label="View"
                    layout="vertical"
                    description="Make sure this view includes all elements you want to monitor."
                  >
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="all">All twin data</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItemLayout>
                )}
              />
            </DialogSection>
            <DialogSectionSeparator />
            <DialogFooter>
              <Button variant="default" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button form={formId} type="submit" variant="primary">
                Create
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
