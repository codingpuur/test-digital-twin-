import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/router'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Button, Card, CardContent, CardFooter, Form, FormControl, FormField, Input } from 'ui'
import { FormItemLayout } from 'ui-patterns/form/FormItemLayout/FormItemLayout'
import { z } from 'zod'

import { useOrganizationCreateMutation } from '@/data/organizations/organization-create-mutation'

const formId = 'new-account-form'

const schema = z.object({
  name: z.string().trim().min(1, 'Please enter an account name'),
})

export const NewAccountForm = () => {
  const router = useRouter()
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: '' },
  })

  const { mutate: createOrganization, isPending } = useOrganizationCreateMutation({
    onSuccess: (data) => {
      if (data && 'slug' in data) router.push(`/new/${data.slug}`)
    },
    onError: (error) => toast.error(`Failed to create account: ${error.message}`),
  })

  const onSubmit = ({ name }: z.infer<typeof schema>) => {
    createOrganization({ name, tier: 'tier_enterprise' })
  }

  return (
    <Form {...form}>
      <form id={formId} onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardContent className="flex flex-col gap-y-2">
            <h1 className="text-xl">Create your account</h1>
            <p className="text-sm text-foreground-light">
              An account holds all your sites and the people who work on them.
            </p>
          </CardContent>
          <CardContent>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItemLayout
                  label="Account name"
                  layout="vertical"
                  description="For example, your company or utility name."
                >
                  <FormControl>
                    <Input {...field} placeholder="ABC Water Utility" autoFocus />
                  </FormControl>
                </FormItemLayout>
              )}
            />
          </CardContent>
          <CardFooter className="justify-end">
            <Button form={formId} type="submit" variant="primary" loading={isPending}>
              Create account
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  )
}
