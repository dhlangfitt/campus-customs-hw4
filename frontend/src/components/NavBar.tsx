import { NavLink } from 'react-router-dom'
import { useAuth } from '../auth'
import BulldogMark from './BulldogMark'
import { THEME_ORDER, THEMES, useTheme } from '../theme'

const PUBLIC_LINKS = [
  { to: '/', label: 'home', end: true },
  { to: '/products', label: 'products', end: false },
  { to: '/about', label: 'about us', end: false },
]

const AUTH_LINKS = [
  { to: '/login', label: 'log in', end: false },
  { to: '/create-account', label: 'create account', end: false },
]

export default function NavBar() {
  const { user, logOut } = useAuth()
  const { theme, setTheme } = useTheme()

  return (
    <header className="nav">
      <NavLink to="/" className="nav__brand">
        <BulldogMark size={52} className="nav__dog" />
        campus<span>customs</span>
      </NavLink>
      <nav className="nav__links" aria-label="Main">
        {PUBLIC_LINKS.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) => (isActive ? 'nav__link nav__link--active' : 'nav__link')}
          >
            {l.label}
          </NavLink>
        ))}

        {/* Signed in, the two auth links are replaced by the shopper's name. */}
        {user ? (
          <>
            <span className="nav__who">{user.first_name || user.name}</span>
            <button className="nav__link nav__link--btn" onClick={logOut}>
              log out
            </button>
          </>
        ) : (
          AUTH_LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) => (isActive ? 'nav__link nav__link--active' : 'nav__link')}
            >
              {l.label}
            </NavLink>
          ))
        )}
        {/* three readings of the same brief — switch and the paint changes too */}
        <div className="themebar" role="group" aria-label="lighting">
          <span className="themebar__label">lighting</span>
          {THEME_ORDER.map((id) => (
            <button
              key={id}
              className={theme.id === id ? 'themebtn themebtn--on' : 'themebtn'}
              style={{ ['--sw' as string]: THEMES[id].vars['--brass'] }}
              onClick={() => setTheme(id)}
              title={`${THEMES[id].name} — ${THEMES[id].tagline}`}
              aria-label={THEMES[id].name}
              aria-pressed={theme.id === id}
            />
          ))}
        </div>
      </nav>
    </header>
  )
}
