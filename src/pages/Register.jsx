import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/auth-context.js'
import AuthLayout from '../components/AuthLayout.jsx'
import { Alert, Button, Field, inputClass } from '../components/ui.jsx'

export default function Register() {
  const { user, register } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  if (user) return <Navigate to="/dashboard" replace />

  function handleSubmit(event) {
    event.preventDefault()
    const result = register({ name, email, password })
    if (!result.ok) return setError(result.error)
    navigate('/dashboard', { replace: true })
  }

  return (
    <AuthLayout
      eyebrow="Get started"
      title="Create your account"
      subtitle="If friends have already added you to a group, it will be waiting once you sign up."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-violet hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <Field label="Name" htmlFor="register-name">
          <input
            id="register-name"
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Priya Sharma"
            autoComplete="name"
          />
        </Field>

        <Field label="Email" htmlFor="register-email">
          <input
            id="register-email"
            type="email"
            className={inputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </Field>

        <Field label="Password" htmlFor="register-password" hint="Stored in this browser only.">
          <input
            id="register-password"
            type="password"
            className={inputClass}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Choose a password"
            autoComplete="new-password"
          />
        </Field>

        <Alert>{error}</Alert>

        <Button type="submit" className="w-full gap-2 py-3">
          <CreateIcon />
          Create account
        </Button>
      </form>
    </AuthLayout>
  )
}

function CreateIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M8 3.5v9M3.5 8h9" strokeLinecap="round" />
    </svg>
  )
}
