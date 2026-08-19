import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../context/auth-context.js'
import Avatar from './Avatar.jsx'
import Wordmark from './Wordmark.jsx'

export default function AppShell({ children }) {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-line bg-paper/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-5">
          <Link to="/dashboard" className="rounded-md">
            <Wordmark />
          </Link>

          <div className="flex items-center gap-4">
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `label rounded-md px-1 py-1 transition-colors ${
                  isActive ? 'text-ink' : 'text-ink-faint hover:text-ink-soft'
                }`
              }
            >
              Groups
            </NavLink>

            {user && (
              <div className="flex items-center gap-3 border-l border-line pl-4">
                <Avatar member={{ name: user.name, email: user.email }} size="sm" />
                <span className="hidden text-sm font-medium sm:inline">{user.name}</span>
                <button
                  type="button"
                  onClick={logout}
                  className="label cursor-pointer rounded-md px-1 py-1 text-ink-faint transition-colors hover:text-owe"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-24 pt-10">{children}</main>
    </div>
  )
}
