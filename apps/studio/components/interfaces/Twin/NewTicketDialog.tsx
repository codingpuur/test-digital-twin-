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

import { TICKET_PRIORITIES, type TicketInput } from '@/lib/twin/workspace'

const formId = 'new-ticket-form'
/** Radix Select cannot hold an empty value, so "none" is a sentinel mapped to '' on submit. */
const NONE = '__none'

const schema = z.object({
  title: z.string().trim().min(1, 'Add a short title'),
  description: z.string(),
  assetTag: z.string(),
  priority: z.enum(['low', 'medium', 'high']),
  assignee: z.string(),
})

type NewTicketValues = z.infer<typeof schema>

type NewTicketDialogProps = {
  open: boolean
  assetTags: string[]
  members: string[]
  /** Asset the ticket starts out linked to, e.g. when created from the properties panel. */
  initialAssetTag: string
  isSaving: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (input: TicketInput) => void
}

export const NewTicketDialog = ({
  open,
  assetTags,
  members,
  initialAssetTag,
  isSaving,
  onOpenChange,
  onCreate,
}: NewTicketDialogProps) => {
  const form = useForm<NewTicketValues>({
    resolver: zodResolver(schema),
    values: {
      title: '',
      description: '',
      assetTag: initialAssetTag || NONE,
      priority: 'medium',
      assignee: NONE,
    },
  })

  const handleSubmit = (values: NewTicketValues) => {
    onCreate({
      ...values,
      assetTag: values.assetTag === NONE ? '' : values.assetTag,
      assignee: values.assignee === NONE ? '' : values.assignee,
    })
    form.reset()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="medium" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>New ticket</DialogTitle>
        </DialogHeader>
        <DialogSectionSeparator />
        <Form {...form}>
          <form id={formId} onSubmit={form.handleSubmit(handleSubmit)}>
            <DialogSection className="flex flex-col gap-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItemLayout label="Title" layout="vertical">
                    <FormControl>
                      <Input {...field} placeholder="e.g. Check P-101 bearing" autoFocus />
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
                      <Textarea {...field} rows={3} />
                    </FormControl>
                  </FormItemLayout>
                )}
              />
              <FormField
                control={form.control}
                name="assetTag"
                render={({ field }) => (
                  <FormItemLayout label="Asset" layout="vertical">
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue>
                            {field.value === NONE ? 'No asset' : field.value}
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NONE}>No asset</SelectItem>
                        {assetTags.map((tag) => (
                          <SelectItem key={tag} value={tag}>
                            {tag}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItemLayout>
                )}
              />
              <div className="grid grid-cols-2 gap-x-4">
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItemLayout label="Priority" layout="vertical">
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="capitalize">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TICKET_PRIORITIES.map((priority) => (
                            <SelectItem key={priority} value={priority} className="capitalize">
                              {priority}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItemLayout>
                  )}
                />
                <FormField
                  control={form.control}
                  name="assignee"
                  render={({ field }) => (
                    <FormItemLayout label="Assign to" layout="vertical">
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue>
                              {field.value === NONE ? 'Unassigned' : field.value}
                            </SelectValue>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={NONE}>Unassigned</SelectItem>
                          {members.map((email) => (
                            <SelectItem key={email} value={email}>
                              {email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItemLayout>
                  )}
                />
              </div>
            </DialogSection>
            <DialogSectionSeparator />
            <DialogFooter>
              <Button variant="default" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button form={formId} type="submit" variant="primary" loading={isSaving}>
                Create ticket
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
