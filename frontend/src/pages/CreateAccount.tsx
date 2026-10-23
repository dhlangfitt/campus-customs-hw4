import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'

export default function CreateAccount() {
  const { user, signUp, logOut } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) {
    return (
      <div className="page page--narrow">
        <h1>you already have an account</h1>
        <p className="lead">signed in as {user.email}.</p>
        <button className="btn" onClick={logOut}>
          log out
        </button>
      </div>
    )
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value })

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await signUp(form)
      navigate('/products')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'could not create the account.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page page--narrow">
      <h1>create an account</h1>
      <p className="lead">one account, so the shop remembers what you asked it last time.</p>

      {/* No confirm-password field by design — password managers make it noise. */}
      <form className="form" onSubmit={submit}>
        <div className="field-row">
          <label className="field">
            <span>first name</span>
            <input value={form.first_name} onChange={set('first_name')} autoComplete="given-name" required />
          </label>
          <label className="field">
            <span>last name</span>
            <input value={form.last_name} onChange={set('last_name')} autoComplete="family-name" required />
          </label>
        </div>
        <label className="field">
          <span>email</span>
          <input type="email" value={form.email} onChange={set('email')} autoComplete="username" required />
        </label>
        <label className="field">
          <span>password</span>
          <input
            type="password"
            value={form.password}
            onChange={set('password')}
            autoComplete="new-password"
            minLength={8}
            required
          />
          <small className="hint">at least 8 characters.</small>
        </label>
        <button className="btn" type="submit" disabled={busy}>
          {busy ? 'creating' : 'create account'}
        </button>
      </form>

      {error && <p className="notice notice--error">{error}</p>}

      <p className="muted">
        already have one? <Link to="/login">log in</Link>
      </p>
    </div>
  )
}
