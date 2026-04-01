import { useEffect, useMemo, useState } from 'react'
import { NavLink, useSearchParams } from 'react-router-dom'
import { PrestataireGreenBand } from '../../../layouts/PrestataireGreenBand'
import { prestataireApi } from '../../../services/prestataireApi'
import { PrestataireStatisticsPanel } from '../statistics/PrestataireStatisticsPanel'
import './PrestataireDashboardPage.css'

const TAB_TODAY = 'today'
const TAB_ANALYSES = 'analyses'

function money(value) {
  return `${Number(value || 0).toLocaleString('fr-FR')} MAD`
}

export function PrestataireDashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const activeTab = tabParam === TAB_ANALYSES ? TAB_ANALYSES : TAB_TODAY

  const setTab = (next) => {
    if (next === TAB_TODAY) {
      setSearchParams({}, { replace: true })
    } else {
      setSearchParams({ tab: TAB_ANALYSES }, { replace: true })
    }
  }

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [activitiesCount, setActivitiesCount] = useState(0)
  const [pendingCount, setPendingCount] = useState(0)
  const [monthlyNet, setMonthlyNet] = useState(0)

  useEffect(() => {
    let active = true
    Promise.all([
      prestataireApi.getActivities(),
      prestataireApi.getReservations(),
      prestataireApi.getStats(),
    ])
      .then(([activities, reservations, stats]) => {
        if (!active) return
        setActivitiesCount(Array.isArray(activities) ? activities.length : 0)
        setPendingCount(
          Array.isArray(reservations)
            ? reservations.filter(
                (item) => item.status === 'awaiting_payment' || item.status === 'paid',
              ).length
            : 0,
        )
        if (Number.isFinite(stats?.chiffre_affaires)) {
          setMonthlyNet(stats.chiffre_affaires)
        }
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

  const quickLinks = useMemo(
    () => [
      { to: '/prestataire/reservations', label: 'Réservations', hint: 'Confirmer ou annuler' },
      { to: '/prestataire/availability', label: 'Disponibilités', hint: 'Créneaux & capacités' },
      { to: '/prestataire/reviews', label: 'Avis', hint: 'Répondre aux clients' },
      { to: '/prestataire/ads', label: 'Mise en avant', hint: 'Campagnes publicitaires' },
    ],
    [],
  )

  return (
    <section className="pro-dashboard-page">
      <div className="pro-dashboard-tabs" role="tablist" aria-label="Vue d’ensemble du dashboard">
        <button
          type="button"
          role="tab"
          id="tab-today"
          aria-selected={activeTab === TAB_TODAY}
          aria-controls="panel-today"
          className={`pro-dashboard-tab ${activeTab === TAB_TODAY ? 'active' : ''}`}
          onClick={() => setTab(TAB_TODAY)}
        >
          Aujourd’hui
        </button>
        <button
          type="button"
          role="tab"
          id="tab-analyses"
          aria-selected={activeTab === TAB_ANALYSES}
          aria-controls="panel-analyses"
          className={`pro-dashboard-tab ${activeTab === TAB_ANALYSES ? 'active' : ''}`}
          onClick={() => setTab(TAB_ANALYSES)}
        >
          Analyses
        </button>
      </div>

      {activeTab === TAB_TODAY && (
        <div
          id="panel-today"
          role="tabpanel"
          aria-labelledby="tab-today"
          className="pro-dashboard-panel"
        >
          <PrestataireGreenBand
            kicker="Vue d’ensemble"
            title="Bonjour"
            subtitle="Suivez l’activité en cours : réservations à traiter, chiffre d’affaires agrégé, et accès rapides vers les pages métier."
          />

          {isLoading && (
            <div className="pro-kpis">
              <article>
                <span>Chargement…</span>
                <strong>…</strong>
              </article>
            </div>
          )}
          {!isLoading && error && (
            <div className="pro-dashboard-error" role="alert">
              {error}
            </div>
          )}
          {!isLoading && !error && (
            <>
              <div className="pro-kpis">
                <article>
                  <span>Activités</span>
                  <strong>{activitiesCount}</strong>
                </article>
                <article>
                  <span>Réservations à traiter</span>
                  <strong>{pendingCount}</strong>
                </article>
                <article>
                  <span>Chiffre d’affaires (payées)</span>
                  <strong>{money(monthlyNet)}</strong>
                </article>
              </div>

              <nav className="pro-dashboard-quick" aria-label="Accès rapides">
                <h2 className="pro-dashboard-quick-title">Accès rapides</h2>
                <ul className="pro-dashboard-quick-list">
                  {quickLinks.map((link) => (
                    <li key={link.to}>
                      <NavLink to={link.to} className="pro-dashboard-quick-link">
                        <span className="pro-dashboard-quick-label">{link.label}</span>
                        <span className="pro-dashboard-quick-hint">{link.hint}</span>
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </nav>
            </>
          )}
        </div>
      )}

      {activeTab === TAB_ANALYSES && (
        <div
          id="panel-analyses"
          role="tabpanel"
          aria-labelledby="tab-analyses"
          className="pro-dashboard-panel"
        >
          <PrestataireStatisticsPanel />
        </div>
      )}
    </section>
  )
}
