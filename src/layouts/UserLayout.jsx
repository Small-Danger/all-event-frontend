import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import logoAllevent from '../assets/brand/logo-allevent.png'
import { useAuth } from '../context/useAuth'
import './user-layout.css'

export function UserLayout() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const links = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/reservations', label: 'Reservations' },
    { to: '/favorites', label: 'Favoris' },
    { to: '/messages', label: 'Messages' },
    { to: '/payments', label: 'Paiements' },
    { to: '/reviews', label: 'Avis' },
    { to: '/profile', label: 'Profil' },
  ]

  const onLogout = async () => {
    await logout()
    navigate('/', { replace: true })
  }

  return (
    <div className="user-shell">
      <header className="user-header">
        <NavLink to="/dashboard" className="user-brand">
          <img src={logoAllevent} alt="ALL EVENT" />
          <span>ALL EVENT Client</span>
        </NavLink>

        <nav className="user-nav" aria-label="Navigation client">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                isActive ? 'user-nav-link active' : 'user-nav-link'
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <button type="button" className="user-logout-btn" onClick={onLogout}>
          Deconnexion
        </button>
      </header>

      <main className="user-content">
        <Outlet />
      </main>

      <nav className="user-mobile-tabbar" aria-label="Navigation mobile client">
        {links.slice(0, 5).map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              isActive ? 'user-mobile-link active' : 'user-mobile-link'
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
