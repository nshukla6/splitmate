/**
 * Each member gets a stable colour derived from their email, so the same person
 * reads as the same colour in every split bar, avatar, and settlement row.
 */
const MEMBER_COLORS = [
  '#EA580C', // orange
  '#0E8F86', // teal
  '#E4572E', // coral
  '#2563C9', // blue
  '#B5299B', // magenta
  '#C98A0A', // amber
  '#3E8E41', // green
  '#5A6B8C', // slate
]

export function colorForEmail(email) {
  const key = String(email ?? '')
  let hash = 0
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) % 100000
  }
  return MEMBER_COLORS[hash % MEMBER_COLORS.length]
}

/**
 * Colours for one group's members. A hash alone collides once a group has a
 * handful of people, which ruins the split bar — so a member whose hashed
 * colour is already taken moves to the next free one. Same list in, same
 * colours out, and no two members of a group ever share a colour.
 */
export function colorsForMembers(members) {
  const taken = new Set()
  const colors = {}

  for (const member of members) {
    const email = typeof member === 'string' ? member : member.email
    if (colors[email]) continue

    let color = colorForEmail(email)
    if (taken.has(color)) {
      color = MEMBER_COLORS.find((candidate) => !taken.has(candidate)) ?? color
    }
    taken.add(color)
    colors[email] = color
  }
  return colors
}

export function initialsFor(name, email) {
  const source = String(name || email || '?').trim()
  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return source.slice(0, 2).toUpperCase()
}
