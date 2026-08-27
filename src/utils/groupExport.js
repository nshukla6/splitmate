import * as storage from '../data/storage.js'
import { formatAmount } from './money.js'

export async function exportGroupHistory(groupId) {
  const [group, expenses] = await Promise.all([
    storage.getGroup(groupId),
    storage.getExpenses(groupId),
  ])

  const nameByEmail = new Map((group?.members ?? []).map((member) => [member.email, member.name]))
  const resolveName = (email) => nameByEmail.get(email) ?? email

  return expenses
    .slice()
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .map((expense) => ({
      date: expense.date,
      description: expense.description,
      category: expense.category,
      amount: formatAmount(expense.amount),
      paidBy: resolveName(expense.paidBy),
      splitBetween: expense.participants.map(resolveName).join(', '),
      notes: expense.notes ?? '',
    }))
}

function csvField(value) {
  const str = String(value ?? '')
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
}

function toCsv(rows) {
  const header = ['Date', 'Description', 'Category', 'Amount', 'Paid By', 'Split Between', 'Notes']
  const lines = rows.map((row) =>
    [row.date, row.description, row.category, row.amount, row.paidBy, row.splitBetween, row.notes]
      .map(csvField)
      .join(',')
  )
  return [header.join(','), ...lines].join('\n')
}

function slugify(name) {
  const slug = String(name ?? '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
  return slug || 'group'
}

export async function downloadGroupHistory(groupId, groupName) {
  const rows = await exportGroupHistory(groupId)
  const csv = toCsv(rows)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = `splitmate-${slugify(groupName)}-history.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
