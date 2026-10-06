import { useParams } from 'common'
import { Trash2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import {
  Badge,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'ui'

import {
  useInviteTwinMemberMutation,
  useRemoveTwinMemberMutation,
  useTwinMembersQuery,
  useUpdateTwinMemberMutation,
} from '@/data/twin/twin-workspace-queries'
import { isValidEmail, MEMBER_ROLES, type MemberRole } from '@/lib/twin/workspace'

type InviteValues = { email: string; role: MemberRole }

export const UsersPanel = () => {
  const { ref } = useParams()
  const { data: members = [] } = useTwinMembersQuery(ref)
  const invite = useInviteTwinMemberMutation(ref)
  const updateMember = useUpdateTwinMemberMutation(ref)
  const removeMember = useRemoveTwinMemberMutation(ref)

  const { register, handleSubmit, setValue, watch, reset, setError, formState } =
    useForm<InviteValues>({ defaultValues: { email: '', role: 'viewer' } })
  const role = watch('role')

  const handleInvite = (values: InviteValues) => {
    if (!isValidEmail(values.email)) {
      return setError('email', { message: 'Enter a valid email address' })
    }
    invite.mutate(values, {
      onSuccess: () => {
        toast.success(`${values.email} now has access`)
        reset()
      },
      onError: (error) => setError('email', { message: error.message }),
    })
  }

  return (
    <div className="flex flex-col gap-y-4">
      <form className="flex flex-col gap-y-2" onSubmit={handleSubmit(handleInvite)}>
        <p className="text-xs text-foreground-light">Give someone access to this site</p>
        <Input
          size="tiny"
          placeholder="name@company.com"
          aria-label="Email"
          {...register('email')}
        />
        {formState.errors.email && (
          <p className="text-xs text-destructive">{formState.errors.email.message}</p>
        )}
        <Select value={role} onValueChange={(value) => setValue('role', value as MemberRole)}>
          <SelectTrigger size="tiny" aria-label="Role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MEMBER_ROLES.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.label} · {item.description}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit" variant="primary" loading={invite.isPending}>
          Add user
        </Button>
      </form>

      <div className="flex flex-col gap-y-2">
        <p className="text-xs uppercase tracking-wide text-foreground-lighter">
          {members.length} {members.length === 1 ? 'person' : 'people'}
        </p>
        {members.map((member) => (
          <div
            key={member.id}
            className="flex items-center gap-x-2 rounded-md border bg-surface-100 px-3 py-2"
          >
            <p className="min-w-0 flex-1 truncate text-sm">{member.email}</p>
            {member.isOwner && <Badge>Owner</Badge>}
            {!member.isOwner && (
              <>
                <Select
                  value={member.role}
                  onValueChange={(value) =>
                    updateMember.mutate({ id: member.id, role: value as MemberRole })
                  }
                >
                  <SelectTrigger
                    size="tiny"
                    aria-label={`Role of ${member.email}`}
                    className="w-24"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MEMBER_ROLES.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="text"
                  size="tiny"
                  aria-label={`Remove ${member.email}`}
                  icon={<Trash2 size={14} />}
                  onClick={() => removeMember.mutate(member.id)}
                />
              </>
            )}
          </div>
        ))}
      </div>
      <p className="text-xs text-foreground-lighter">
        Roles are shown for planning: access is not enforced yet.
      </p>
    </div>
  )
}
