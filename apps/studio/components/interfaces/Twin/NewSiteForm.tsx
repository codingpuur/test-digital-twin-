import { zodResolver } from '@hookform/resolvers/zod'
import { useParams } from 'common'
import { useRouter } from 'next/router'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Button, Card, CardContent, CardFooter, Form, FormControl, FormField, Input } from 'ui'
import { FormItemLayout } from 'ui-patterns/form/FormItemLayout/FormItemLayout'
import { z } from 'zod'

import { useProjectCreateMutation } from '@/data/projects/project-create-mutation'

const formId = 'new-site-form'

const schema = z.object({
  name: z.string().trim().min(1, 'Please enter a site name'),
})

export const NewSiteForm = () => {
  const router = useRouter()
  const { slug } = useParams()
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: '' },
  })

  const { mutate: createSite, isPending } = useProjectCreateMutation({
    onSuccess: (data) => {
      if (data && 'ref' in data) router.push(`/project/${data.ref}`)
    },
  })

  const onSubmit = ({ name }: z.infer<typeof schema>) => {
    if (!slug) return toast.error('Select an account first')
    createSite({ name, organizationSlug: slug, dbPass: '' })
  }

  return (
    <Form {...form}>
      <form id={formId} onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardContent className="flex flex-col gap-y-2">
            <h1 className="text-xl">Create a site</h1>
            <p className="text-sm text-foreground-light">
              A site is one facility, such as a pumping station. Its digital twin lives inside it.
            </p>
          </CardContent>
          <CardContent>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItemLayout label="Site name" layout="vertical">
                  <FormControl>
                    <Input {...field} placeholder="Pumping Station A" autoFocus />
                  </FormControl>
                </FormItemLayout>
              )}
            />
          </CardContent>
          <CardFooter className="justify-end">
            <Button form={formId} htmlType="submit" type="primary" loading={isPending}>
              Create site
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  )
}
