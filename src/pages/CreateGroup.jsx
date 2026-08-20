import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/auth-context.js'
import * as storage from '../data/storage.js'
import Avatar from '../components/Avatar.jsx'
import { colorsForMembers } from '../utils/palette.js'
import { Alert, Button, Field, inputClass, PendingTag } from '../components/ui.jsx'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function CreateGroup() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [emailDraft, setEmailDraft] = useState('')
  const [invites, setInvites] = useState([])
  const [inviteError, setInviteError] = useState('')
  const [formError, setFormError] = useState('')

  /** Resolve the email against the user list so the invite shows its real status now. */
  function addInvite() {
    const email = storage.normalizeEmail(emailDraft)
    setInviteError('')

    if (!email) return
    if (!EMAIL_PATTERN.test(email)) return setInviteError('That does not look like an email address.')
    if (email === user.email) return setInviteError('You are already in the group.')
    if (invites.some((invite) => invite.email === email)) {
      return setInviteError('That person is already on the list.')
    }

    const existing = storage.findUserByEmail(email)
    setInvites((current) => [
      ...current,
      {
        email,
        name: existing ? existing.name : storage.nameFromEmail(email),
        status: existing ? 'active' : 'pending',
      },
    ])
    setEmailDraft('')
  }

  function removeInvite(email) {
    setInvites((current) => current.filter((invite) => invite.email !== email))
  }

  function handleSubmit(event) {
    event.preventDefault()
    if (!name.trim()) return setFormError('Give the group a name.')

    const group = storage.createGroup({
      name,
      creatorEmail: user.email,
      memberEmails: invites.map((invite) => invite.email),
    })
    navigate(`/group/${group.id}`, { replace: true })
  }

  const members = [{ email: user.email, name: user.name, status: 'active', isYou: true }, ...invites]
  const colors = colorsForMembers(members)

  return (
    <div className="mx-auto max-w-xl">
      <Link to="/dashboard" className="label inline-flex items-center gap-1.5 text-ink-faint transition-colors hover:text-ink">
        <span aria-hidden="true">←</span> Groups
      </Link>

      <h1 className="display mt-5 text-4xl">Create a group</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
        Add people by email. Anyone who has not signed up yet joins as pending — they pick
        up their share the moment they register.
      </p>

      <form onSubmit={handleSubmit} className="mt-9 space-y-7">
        <Field label="Group name" htmlFor="group-name">
          <input
            id="group-name"
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Goa trip"
            autoComplete="off"
          />
        </Field>

        <div>
          <Field label="Add members by email" htmlFor="member-email">
            <div className="flex gap-2">
              <input
                id="member-email"
                type="email"
                className={inputClass}
                value={emailDraft}
                onChange={(e) => setEmailDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addInvite()
                  }
                }}
                placeholder="bob@test.com"
                autoComplete="off"
              />
              <Button type="button" variant="secondary" onClick={addInvite} className="shrink-0 gap-1">
                <PlusIcon />
                Add
              </Button>
            </div>
          </Field>
          {inviteError && <p className="mt-2 text-sm text-owe">{inviteError}</p>}
        </div>

        <div>
          <p className="label text-ink-faint">
            Members · {members.length}
          </p>
          <ul className="mt-2 divide-y divide-line-soft overflow-hidden rounded-2xl border border-line bg-surface">
            {members.map((member) => (
              <li key={member.email} className="flex items-center gap-3 px-4 py-3">
                <Avatar member={member} size="md" muted={member.status === 'pending'} colors={colors} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {member.name}
                    {member.isYou && <span className="ml-1.5 font-normal text-ink-faint">(you)</span>}
                  </p>
                  <p className="truncate text-xs text-ink-faint">{member.email}</p>
                </div>
                {member.status === 'pending' && <PendingTag />}
                {!member.isYou && (
                  <button
                    type="button"
                    onClick={() => removeInvite(member.email)}
                    className="label rounded-md px-1 py-1 text-ink-faint transition-colors hover:text-owe"
                  >
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>

        <Alert>{formError}</Alert>

        <div className="flex gap-2">
          <Button type="submit" className="gap-2 px-6 py-3">
            <PlusIcon />
            Create group
          </Button>
          <Link to="/dashboard">
            <Button type="button" variant="ghost" className="px-4 py-3">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  )
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M8 3.5v9M3.5 8h9" strokeLinecap="round" />
    </svg>
  )
}
