import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { requestPasswordReset } from '../api'
import { useAuth } from '../auth'

export default function LogIn() {
  const { user, logIn, logOut } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) {
    return (
      <div className="page page--narrow">
        <h1>you are signed in</h1>
        <p className="lead">signed in as {user.email}.</p>
        <button className="btn" onClick={logOut}>
          log out
        </button>
      </div>
    )
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await logIn(email, password)
      navigate('/products')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'could not sign you in.')
    } finally {
      setBusy(false)
    }
  }

  async function reset() {
    setError('')
    if (!email.trim()) {
      setNotice('enter your email address first, then ask for a reset.')
      return
    }
    const res = await requestPasswordReset(email)
    setNotice(res.message)
  }

  return (
    <div className="page page--narrow">
      <h1>log in</h1>
      <p className="lead">your conversations with the shop assistant live in your account.</p>

      <form className="form" onSubmit={submit}>
        <label className="field">
          <span>email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label className="field">
          <span>password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        <button className="btn" type="submit" disabled={busy}>
          {busy ? 'checking' : 'log in'}
        </button>
      </form>

      <button className="linkbtn" type="button" onClick={reset}>
        reset password
      </button>

      {error && <p className="notice notice--error">{error}</p>}
      {notice && <p className="notice">{notice}</p>}

      <p className="muted">
        no account yet? <Link to="/create-account">create one</Link>
      </p>
    </div>
  )
}
