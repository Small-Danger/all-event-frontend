import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { clientProfile, favoritesSeed, reservationsSeed } from '../clientMockData'
import { clientApi } from '../../../services/clientApi'
import './ClientDashboardPage.css'

function formatAmount(value) {
  return `${value.toLocaleString('fr-FR')} MAD`
}

export function ClientDashboardPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [profile, setProfile] = useState(clientProfile)
  const [reservations, setReservations] = useState(reservationsSeed)
  const [favorites, setFavorites] = useState(favoritesSeed)

  useEffect(() => {
    let active = true
    clientApi
      .getDashboardData()
      .then((data) => {
        if (!active) return
        setProfile((current) => ({
          ...current,
          firstName: data.profile?.prenom || current.firstName,
          avatar: data.profile?.avatar || current.avatar,
        }))
        setReservations(data.reservations.length ? data.reservations : reservationsSeed)
        setFavorites(data.favorites.length ? data.favorites : favoritesSeed)
      })
      .catch((apiError) => {
        if (!active) return
        setError(apiError.message)
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const upcoming = reservations.filter((item) => item.status === 'upcoming')
  const completed = reservations.filter((item) => item.status === 'done')
  const totalSpent = completed.reduce((sum, current) => sum + current.amount, 0)

  return (
    <section className="client-dashboard-page">
      <header className="client-hero-card">
        <div>
          <p className="client-kicker">Espace client</p>
          <h1>Bonjour {profile.firstName}, pret(e) pour votre prochaine experience ?</h1>
          <p>
            Retrouvez vos reservations, messages et paiements en un seul endroit.
          </p>
          <div className="client-hero-actions">
            <Link to="/search" className="client-btn primary">
              Explorer des activites
            </Link>
            <Link to="/reservations" className="client-btn ghost">
              Voir mes reservations
            </Link>
          </div>
        </div>
        <img src={profile.avatar} alt={profile.firstName} />
      </header>

      {isLoading && <div className="state-card">Chargement des donnees client...</div>}
      {error && <div className="state-card">{error}</div>}

      <div className="client-kpi-grid">
        <article className="client-kpi-card">
          <span>Reservations a venir</span>
          <strong>{upcoming.length}</strong>
        </article>
        <article className="client-kpi-card">
          <span>Favoris sauvegardes</span>
          <strong>{favorites.length}</strong>
        </article>
        <article className="client-kpi-card">
          <span>Budget depense</span>
          <strong>{formatAmount(totalSpent)}</strong>
        </article>
      </div>

      <div className="client-grid-two">
        <article className="client-panel">
          <div className="client-panel-head">
            <h2>Prochaines reservations</h2>
            <Link to="/reservations">Tout voir</Link>
          </div>
          <div className="client-list">
            {upcoming.map((item) => (
              <div key={item.id} className="client-list-row">
                <div>
                  <h3>{item.title}</h3>
                  <p>
                    {item.city} - {item.date} - {item.hour}
                  </p>
                </div>
                <strong>{formatAmount(item.amount)}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="client-panel">
          <div className="client-panel-head">
            <h2>Actions rapides</h2>
          </div>
          <div className="client-quick-grid">
            <Link className="client-quick-card" to="/favorites">
              Gerer mes favoris
            </Link>
            <Link className="client-quick-card" to="/messages">
              Contacter un prestataire
            </Link>
            <Link className="client-quick-card" to="/reviews">
              Laisser un avis
            </Link>
            <Link className="client-quick-card" to="/payments">
              Historique paiements
            </Link>
          </div>
        </article>
      </div>
    </section>
  )
}
