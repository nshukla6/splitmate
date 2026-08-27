import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../context/auth-context.js'
import * as storage from '../data/storage.js'
import Avatar from '../components/Avatar.jsx'
import { colorsForMembers } from '../utils/palette.js'
import { Alert, Button, Field, inputClass, PendingTag } from '../components/ui.jsx'

export default function GroupSettings() {
  const { id } = useParams()
  const { user } = useAuth()

  const [group, setGroup] = useState(null)
  const [loaded, setLoaded] = useState(false)

  const [name, setName] = useState('')
  const [nameError, setNameError] = useState('')
  const [nameSaved, setNameSaved] = useState(false)

  const [memberErrors, setMemberErrors] = useState({})
  const [removingEmail, setRemovingEmail] = useState(null)

  useEffect(() => {
    let active = true
    async function load() {
      const nextGroup = await storage.getGroup(id)
      if (!active) return
      setGroup(nextGroup)
      setName(nextGroup?.name ?? '')
      setLoaded(true)
    }
    load().catch(console.error)
    return () => {
      active = false
    }
  }, [id])

  if (!loaded) return null

  const isCreator = group && group.createdBy === user.email

  if (!group || !isCreator) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-surface/60 px-6 py-16 text-center">
        <h1 className="display text-2xl">Only the group's creator can change these settings</h1>
        <p className="mt-2 text-[15px] text-ink-soft">
          {group ? 'You are not the creator of this group.' : 'It may have been removed, or the link is wrong.'}
        </p>
        <Link to={group ? `/group/${id}` : '/dashboard'} className="mt-6 inline-block">
          <Button>{group ? 'Back to group' : 'Back to groups'}</Button>
        </Link>
      </div>
    )
  }

  const colors = colorsForMembers(group.members)
  const otherMembers = group.members.filter((member) => member.email !== user.email)

  async function handleRename(event) {
    event.preventDefault()
    setNameSaved(false)
    if (!name.trim()) return setNameError('Give the group a name.')

    try {
      setNameError('')
      await storage.renameGroup(group.id, name)
      setGroup((current) => ({ ...current, name: name.trim() }))
      setName(name.trim())
      setNameSaved(true)
    } catch (err) {
      setNameError(err.message || 'Could not rename the group.')
    }
  }

  async function handleRemove(email) {
    setMemberErrors((current) => ({ ...current, [email]: '' }))
    setRemovingEmail(email)
    try {
      await storage.removeMember(group.id, email)
      setGroup((current) => ({
        ...current,
        members: current.members.filter((member) => member.email !== email),
      }))
    } catch (err) {
      setMemberErrors((current) => ({
        ...current,
        [email]: err.message || 'Could not remove that member.',
      }))
    } finally {
      setRemovingEmail(null)
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <Link
        to={`/group/${id}`}
        className="label inline-flex items-center gap-1.5 text-ink-faint transition-colors hover:text-ink"
      >
        <span aria-hidden="true">←</span> Group
      </Link>

      <h1 className="display mt-5 text-4xl">Group settings</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
        Manage {group.name}. Only you, as the creator, can see this page.
      </p>

      <form onSubmit={handleRename} className="mt-9 space-y-4">
        <Field label="Group name" htmlFor="group-name">
          <input
            id="group-name"
            className={inputClass}
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setNameSaved(false)
            }}
            autoComplete="off"
          />
        </Field>

        <Alert>{nameError}</Alert>
        {nameSaved && !nameError && <p className="text-sm text-owed">Saved.</p>}

        <Button type="submit">Save name</Button>
      </form>

      <div className="mt-10">
        <p className="label text-ink-faint">Members · {otherMembers.length}</p>
        <ul className="mt-2 divide-y divide-line-soft overflow-hidden rounded-2xl border border-line bg-surface">
          {otherMembers.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-ink-faint">
              You are the only member of this group.
            </li>
          )}
          {otherMembers.map((member) => (
            <li key={member.email} className="flex items-center gap-3 px-4 py-3">
              <Avatar member={member} size="md" muted={member.status === 'pending'} colors={colors} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{member.name}</p>
                <p className="truncate text-xs text-ink-faint">{member.email}</p>
                {memberErrors[member.email] && (
                  <p className="mt-1 text-xs text-owe">{memberErrors[member.email]}</p>
                )}
              </div>
              {member.status === 'pending' && <PendingTag />}
              <button
                type="button"
                onClick={() => handleRemove(member.email)}
                disabled={removingEmail === member.email}
                className="label rounded-md px-1 py-1 text-ink-faint transition-colors hover:text-owe disabled:opacity-40"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
