import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import logoAllevent from '../assets/brand/logo-allevent.png'
import { useAuth } from '../context/useAuth'
import { PrestataireFlashProvider } from '../context/PrestataireFlashContext'
import { prestataireApi } from '../services/prestataireApi'
import './prestataire-layout.css'

export function PrestataireLayout() {
  const { auth, logout } = useAuth()
  const navigate = useNavigate()
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showNotifMenu, setShowNotifMenu] = useState(false)
  const [notifications, setNotifications] = useState([])
  const profileMenuRef = useRef(null)
  const notifMenuRef = useRef(null)

  const links = [
    { to: '/prestataire/dashboard', label: 'Dashboard' },
    { to: '/prestataire/activities', label: 'Activites' },
    { to: '/prestataire/availability', label: 'Disponibilites' },
    { to: '/prestataire/reservations', label: 'Reservations' },
    { to: '/prestataire/reviews', label: 'Avis' },
    { to: '/prestataire/ads', label: 'Publicites' },
  ]

  useEffect(() => {
    let active = true
    Promise.all([prestataireApi.getReservations(), prestataireApi.getReviews({ page: 1 })])
      .then(([reservations, reviews]) => {
        if (!active) return
        const rows = []
        const urgentReservations = (reservations || [])
          .filter((r) => r.status === 'awaiting_payment' || r.status === 'paid')
          .slice(0, 3)
          .map((r) => ({
            id: `r-${r.id}`,
            label: `Reservation ${r.customer || 'client'} - ${r.activity || 'activite'}`,
            href: '/prestataire/reservations',
          }))
        const reviewRows = reviews?.items ?? []
        const pendingReviews = reviewRows
          .filter((r) => !r.replied)
          .slice(0, 2)
          .map((r) => ({
            id: `a-${r.id}`,
            label: `Avis sans reponse de ${r.client || 'client'}`,
            href: '/prestataire/reviews',
          }))
        rows.push(...urgentReservations, ...pendingReviews)
        setNotifications(rows)
      })
      .catch(() => {
        if (!active) return
        setNotifications([])
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const onGlobalClick = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false)
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(event.target)) {
        setShowNotifMenu(false)
      }
    }
    document.addEventListener('mousedown', onGlobalClick)
    return () => document.removeEventListener('mousedown', onGlobalClick)
  }, [])

  const userName = auth?.user?.name || 'Prestataire'
  const userEmail = auth?.user?.email || ''
  const initials = useMemo(() => {
    const parts = String(userName).trim().split(/\s+/).filter(Boolean)
    if (parts.length === 0) return 'P'
    return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase()
  }, [userName])

  const onLogout = async () => {
    await logout()
    navigate('/', { replace: true })
  }

  return (
    <PrestataireFlashProvider>
      <div className="prestataire-shell">
        <header className="prestataire-header">
          <NavLink to="/prestataire/dashboard" className="prestataire-brand">
            <img src={logoAllevent} alt="ALL EVENT" />
            <span>ALL EVENT Pro</span>
          </NavLink>
          <nav className="prestataire-nav" aria-label="Navigation prestataire">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  isActive ? 'prestataire-nav-link active' : 'prestataire-nav-link'
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
          <div className="prestataire-header-actions">
            <div className="prestataire-action-wrap" ref={notifMenuRef}>
              <button
                type="button"
                className="prestataire-icon-btn"
                aria-label="Notifications prestataire"
                onClick={() => {
                  setShowNotifMenu((v) => !v)
                  setShowProfileMenu(false)
                }}
              >
                <span aria-hidden>🔔</span>
                {notifications.length > 0 && (
                  <span className="prestataire-notif-badge">{notifications.length}</span>
                )}
              </button>
              {showNotifMenu && (
                <div className="prestataire-popover">
                  <p className="prestataire-popover-title">Notifications</p>
                  {notifications.length === 0 ? (
                    <p className="prestataire-popover-empty">Aucune notification pour le moment.</p>
                  ) : (
                    <ul className="prestataire-notif-list">
                      {notifications.map((n) => (
                        <li key={n.id}>
                          <NavLink
                            to={n.href}
                            className="prestataire-notif-link"
                            onClick={() => setShowNotifMenu(false)}
                          >
                            {n.label}
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div className="prestataire-action-wrap" ref={profileMenuRef}>
              <button
                type="button"
                className="prestataire-profile-btn"
                aria-label="Menu profil prestataire"
                onClick={() => {
                  setShowProfileMenu((v) => !v)
                  setShowNotifMenu(false)
                }}
              >
                <span className="prestataire-avatar" aria-hidden>
                  {initials}
                </span>
                <span className="prestataire-profile-name">{userName}</span>
              </button>
              {showProfileMenu && (
                <div className="prestataire-popover">
                  <p className="prestataire-popover-title">{userName}</p>
                  {userEmail && <p className="prestataire-popover-sub">{userEmail}</p>}
                  <div className="prestataire-popover-actions">
                    <NavLink
                      to="/prestataire/settings"
                      className="prestataire-popover-link"
                      onClick={() => setShowProfileMenu(false)}
                    >
                      Parametres
                    </NavLink>
                    <button
                      type="button"
                      className="prestataire-popover-danger"
                      onClick={onLogout}
                    >
                      Deconnexion
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="prestataire-content">
          <Outlet />
        </main>

        <nav className="prestataire-mobile-tabbar" aria-label="Navigation mobile prestataire">
          {links.slice(0, 5).map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                isActive ? 'prestataire-mobile-link active' : 'prestataire-mobile-link'
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </PrestataireFlashProvider>
  )
}
