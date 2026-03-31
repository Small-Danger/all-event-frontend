import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/useAuth'
import './ClientComptePage.css'

function ChevronRight() {
  return (
    <svg className="client-compte-chevron" viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path
        fill="currentColor"
        d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"
      />
    </svg>
  )
}

export function ClientComptePage() {
  const navigate = useNavigate()
  const { auth, logout } = useAuth()
  const user = auth.user
  const displayName = user?.name?.trim() || user?.email || 'Membre'
  const initial = displayName.charAt(0).toUpperCase()

  return (
    <main className="client-compte-page">
      <header className="client-compte-head">
        <div className="client-compte-avatar" aria-hidden>
          {initial}
        </div>
        <div>
          <h1 className="client-compte-title">Compte</h1>
          <p className="client-compte-sub">{displayName}</p>
        </div>
        <Link to="/profile" className="client-compte-settings" aria-label="Paramètres du profil">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
            <path
              fill="currentColor"
              d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.52-.4-1.08-.73-1.69-.98l-.36-2.54a.484.484 0 0 0-.48-.42h-3.84c-.24 0-.43.17-.47.42l-.36 2.54c-.61.25-1.17.59-1.69.98l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.07.63-.07.94 0 .31.02.63.06.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.52.4 1.08.73 1.69.98l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.48-.41l.36-2.54c.61-.25 1.17-.59 1.69-.98l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"
            />
          </svg>
        </Link>
      </header>

      <section className="client-compte-section">
        <h2 className="client-compte-section-title">Mon activité</h2>
        <ul className="client-compte-list">
          <li>
            <Link to="/panier" className="client-compte-row">
              <span className="client-compte-row-label">Panier</span>
              <ChevronRight />
            </Link>
          </li>
          <li>
            <Link to="/reservations" className="client-compte-row">
              <span className="client-compte-row-label">Mes billets & réservations</span>
              <ChevronRight />
            </Link>
          </li>
          <li>
            <Link to="/favorites" className="client-compte-row">
              <span className="client-compte-row-label">Favoris</span>
              <ChevronRight />
            </Link>
          </li>
          <li>
            <Link to="/reviews" className="client-compte-row">
              <span className="client-compte-row-label">Mes avis</span>
              <ChevronRight />
            </Link>
          </li>
          <li>
            <Link to="/messages" className="client-compte-row">
              <span className="client-compte-row-label">Messages</span>
              <ChevronRight />
            </Link>
          </li>
          <li>
            <Link to="/payments" className="client-compte-row">
              <span className="client-compte-row-label">Paiements</span>
              <ChevronRight />
            </Link>
          </li>
        </ul>
      </section>

      <section className="client-compte-section">
        <h2 className="client-compte-section-title">Aide</h2>
        <ul className="client-compte-list">
          <li>
            <Link to="/faq" className="client-compte-row">
              <span className="client-compte-row-label">FAQ & support</span>
              <ChevronRight />
            </Link>
          </li>
        </ul>
      </section>

      <section className="client-compte-section">
        <h2 className="client-compte-section-title">Légal</h2>
        <ul className="client-compte-list">
          <li>
            <Link to="/terms" className="client-compte-row">
              <span className="client-compte-row-label">Conditions d&apos;utilisation</span>
              <ChevronRight />
            </Link>
          </li>
          <li>
            <Link to="/privacy" className="client-compte-row">
              <span className="client-compte-row-label">Confidentialité</span>
              <ChevronRight />
            </Link>
          </li>
        </ul>
      </section>

      <div className="client-compte-footer-actions">
        <button
          type="button"
          className="client-compte-logout"
          onClick={async () => {
            await logout()
            navigate('/', { replace: true })
          }}
        >
          Déconnexion
        </button>
      </div>
    </main>
  )
}
