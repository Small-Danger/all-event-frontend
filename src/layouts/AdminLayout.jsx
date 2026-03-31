import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import logoAllevent from '../assets/brand/logo-allevent.png'
import { useAuth } from '../context/useAuth'
import { adminApi } from '../services/adminApi'
import './admin-layout.css'

export function AdminLayout() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [isAlertsOpen, setIsAlertsOpen] = useState(false)
  const [alerts, setAlerts] = useState([])
  const links = [
    { to: '/admin/dashboard', label: 'Dashboard' },
    { to: '/admin/users', label: 'Users' },
    { to: '/admin/prestataires', label: 'Prestataires' },
    { to: '/admin/activities', label: 'Activites' },
    { to: '/admin/reviews', label: 'Avis' },
    { to: '/admin/ads', label: 'Ads' },
    { to: '/admin/commissions', label: 'Commissions' },
    { to: '/admin/statistics', label: 'Stats' },
  ]

  useEffect(() => {
    if (!isAlertsOpen) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') setIsAlertsOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isAlertsOpen])

  useEffect(() => {
    let active = true
    adminApi
      .getDashboardStats()
      .then((stats) => {
        if (!active) return
        const next = []
        if ((stats?.prestataires_en_attente || 0) > 0) {
          next.push({
            id: 'prestataires',
            level: 'warning',
            text: `${stats.prestataires_en_attente} prestataire(s) en attente de validation`,
            to: '/admin/prestataires',
          })
        }
        if ((stats?.signalements_en_attente || 0) > 0) {
          next.push({
            id: 'signalements',
            level: 'critical',
            text: `${stats.signalements_en_attente} signalement(s) à modérer`,
            to: '/admin/reviews?tab=signalements',
          })
        }
        if ((stats?.litiges_actifs || 0) > 0) {
          next.push({
            id: 'litiges',
            level: 'critical',
            text: `${stats.litiges_actifs} litige(s) actif(s)`,
            to: '/admin/reviews?tab=litiges',
          })
        }
        setAlerts(next)
      })
      .catch(() => {
        if (!active) return
        setAlerts([])
      })
    return () => {
      active = false
    }
  }, [])

  const alertCount = useMemo(() => alerts.length, [alerts])

  const onLogout = async () => {
    await logout()
    navigate('/', { replace: true })
  }

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div className="admin-header-accent" aria-hidden />
        <div className="admin-header-inner">
          <NavLink
            to="/admin/dashboard"
            className="admin-brand"
            aria-label="ALL EVENT — tableau de bord administrateur"
          >
            <span className="admin-brand-mark">
              <img src={logoAllevent} alt="" width={36} height={36} />
            </span>
            <span className="admin-brand-text">
              <span className="admin-brand-title">ALL EVENT</span>
              <span className="admin-brand-kicker">Back-office</span>
            </span>
          </NavLink>
          <nav className="admin-nav-wrap" aria-label="Navigation administrateur">
            <div className="admin-nav">
              {links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === '/admin/dashboard'}
                  className={({ isActive }) =>
                    isActive ? 'admin-nav-link active' : 'admin-nav-link'
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </div>
          </nav>
          <div className="admin-header-actions">
            <button
              type="button"
              className="admin-alert-btn"
              aria-label="Alertes importantes"
              aria-expanded={isAlertsOpen}
              aria-haspopup="dialog"
              onClick={() => setIsAlertsOpen(true)}
            >
              <svg className="admin-alert-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden>
                <path
                  fill="currentColor"
                  d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22Zm6-5V11a6 6 0 1 0-12 0v6l-1.5 2h15L18 17Z"
                />
              </svg>
              {alertCount > 0 ? <span className="admin-alert-badge">{alertCount}</span> : null}
            </button>
            <button type="button" className="admin-logout-btn" onClick={onLogout}>
              Déconnexion
            </button>
          </div>
        </div>
      </header>
      <main className="admin-content">
        <Outlet />
      </main>
      <nav className="admin-mobile-tabbar" aria-label="Navigation mobile administrateur">
        {links.slice(0, 5).map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              isActive ? 'admin-mobile-link active' : 'admin-mobile-link'
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>

      {isAlertsOpen ? (
        <div
          className="admin-alert-modal-backdrop"
          role="presentation"
          onClick={() => setIsAlertsOpen(false)}
        >
          <div
            className="admin-alert-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-alert-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin-alert-modal-head">
              <h2 id="admin-alert-title">Alertes importantes</h2>
              <button type="button" className="admin-alert-close" onClick={() => setIsAlertsOpen(false)}>
                Fermer
              </button>
            </div>
            {alerts.length === 0 ? (
              <p className="admin-alert-empty">Aucune alerte critique pour le moment.</p>
            ) : (
              <ul className="admin-alert-list">
                {alerts.map((a) => (
                  <li key={a.id} className={`admin-alert-item admin-alert-item--${a.level}`}>
                    <p>{a.text}</p>
                    <button
                      type="button"
                      className="admin-alert-open"
                      onClick={() => {
                        setIsAlertsOpen(false)
                        navigate(a.to)
                      }}
                    >
                      Ouvrir
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
