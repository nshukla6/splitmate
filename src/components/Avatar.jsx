import { colorForEmail, initialsFor } from '../utils/palette.js'

const SIZES = {
  sm: 'h-6 w-6 text-[9px]',
  md: 'h-9 w-9 text-[11px]',
  lg: 'h-12 w-12 text-sm',
}

export default function Avatar({ member, size = 'md', muted = false, className = '', colors }) {
  const color = colors?.[member.email] ?? colorForEmail(member.email)
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold tracking-wide text-white ring-2 ring-surface ${SIZES[size]} ${className}`}
      style={{ backgroundColor: color, opacity: muted ? 0.45 : 1 }}
      title={member.name}
      aria-hidden="true"
    >
      {initialsFor(member.name, member.email)}
    </span>
  )
}

/** Overlapping row of faces, used wherever a group is summarised. */
export function AvatarStack({ members, max = 4, size = 'sm', colors }) {
  const shown = members.slice(0, max)
  const overflow = members.length - shown.length
  return (
    <span className="flex items-center">
      {shown.map((member, index) => (
        <Avatar
          key={member.email}
          member={member}
          size={size}
          colors={colors}
          muted={member.status === 'pending'}
          className={index === 0 ? '' : '-ml-2'}
        />
      ))}
      {overflow > 0 && (
        <span className="-ml-2 inline-flex h-6 items-center rounded-full bg-line px-2 text-[10px] font-semibold text-ink-soft ring-2 ring-surface">
          +{overflow}
        </span>
      )}
    </span>
  )
}
