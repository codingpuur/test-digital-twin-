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
} from 'ui'
import { FormItemLayout } from 'ui-patterns/form/FormItemLayout/FormItemLayout'
import { z } from 'zod'

const formId = 'save-view-form'

const schema = z.object({ name: z.string().trim().min(1, 'Give the view a name') })

type SaveViewValues = z.infer<typeof schema>

type SaveViewDialogProps = {
  open: boolean
  title: string
  confirmLabel: string
  initialName: string
  onOpenChange: (open: boolean) => void
  onSubmit: (name: string) => void
}

export const SaveViewDialog = ({
  open,
  title,
  confirmLabel,
  initialName,
  onOpenChange,
  onSubmit,
}: SaveViewDialogProps) => {
  const form = useForm<SaveViewValues>({
    resolver: zodResolver(schema),
    // `values` follows the prop, so reopening the dialog for another view shows that view's name.
    values: { name: initialName },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="small" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <DialogSectionSeparator />
        <Form {...form}>
          <form id={formId} onSubmit={form.handleSubmit((values) => onSubmit(values.name))}>
            <DialogSection>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItemLayout label="Name" layout="vertical">
                    <FormControl>
                      <Input {...field} placeholder="e.g. 01_Pump 1" autoFocus />
                    </FormControl>
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
                {confirmLabel}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
