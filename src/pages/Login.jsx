import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/auth-context.js'
import AuthLayout from '../components/AuthLayout.jsx'
import { Alert, Button, Field, inputClass } from '../components/ui.jsx'

/** Seeded accounts, offered as one-tap fills so testing does not mean typing. */
const TEST_EMAILS = ['shubham@test.com', 'bob@test.com', 'rahul@test.com', 'eva@test.com']

export default function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  if (user) return <Navigate to="/dashboard" replace />

  function handleSubmit(event) {
    event.preventDefault()
    const result = login(email, password)
    if (!result.ok) return setError(result.error)
    navigate(location.state?.from ?? '/dashboard', { replace: true })
  }

  function fillTestAccount(testEmail) {
    setEmail(testEmail)
    setPassword('password')
    setError('')
  }

  return (
    <AuthLayout
      eyebrow="Welcome back"
      title="Sign in"
      subtitle="Pick up wherever your groups left off."
      footer={
        <>
          New here?{' '}
          <Link to="/register" className="font-semibold text-violet hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <Field label="Email" htmlFor="login-email">
          <input
            id="login-email"
            type="email"
            className={inputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </Field>

        <Field label="Password" htmlFor="login-password">
          <input
            id="login-password"
            type="password"
            className={inputClass}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </Field>

        <Alert>{error}</Alert>

        <Button type="submit" className="w-full gap-2 py-3">
          <SignInIcon />
          Sign in
        </Button>
      </form>

      <div className="mt-8 rounded-2xl border border-dashed border-line bg-surface/70 p-4">
        <p className="label text-ink-faint">Test accounts · password is “password”</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {TEST_EMAILS.map((testEmail) => (
            <button
              key={testEmail}
              type="button"
              onClick={() => fillTestAccount(testEmail)}
              className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:border-violet hover:text-violet"
            >
              {testEmail}
            </button>
          ))}
        </div>
      </div>
    </AuthLayout>
  )
}

function SignInIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M2 8h8M9 5l3 3-3 3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 2v12" strokeLinecap="round" />
    </svg>
  )
}
