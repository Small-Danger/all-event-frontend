import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { adminApi } from '../../../services/adminApi'
import './AdminDashboardPage.css'

function money(value) {
  return `${Number(value || 0).toLocaleString('fr-FR')} MAD`
}

function num(value) {
  return Number(value ?? 0).toLocaleString('fr-FR')
}

const initialStats = {
  utilisateurs_total: 0,
  prestataires_en_attente: 0,
  signalements_en_attente: 0,
  litiges_actifs: 0,
  reservations_total: 0,
  reservations_payees: 0,
  chiffre_affaires_total: 0,
  campagnes_validees: 0,
  evenements_stats: 0,
}

export function AdminDashboardPage() {
  const [stats, setStats] = useState(initialStats)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isExporting, setIsExporting] = useState(false)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let active = true
    setError('')
    setIsLoading(true)
    adminApi
      .getDashboardStats()
      .then((data) => {
        if (!active) return
        setStats({ ...initialStats, ...data })
      })
      .catch((e) => {
        if (!active) return
        setError(e instanceof Error ? e.message : 'Chargement impossible.')
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => {
      active = false
    }
  }, [tick])

  const onExport = async () => {
    setIsExporting(true)
    try {
      await adminApi.downloadStatsExport()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export impossible.')
    } finally {
      setIsExporting(false)
    }
  }

  const urgent =
    stats.prestataires_en_attente > 0 ||
    stats.signalements_en_attente > 0 ||
    stats.litiges_actifs > 0

  return (
    <section className="admin-dashboard-page" aria-busy={isLoading}>
      <header className="admin-dash-hero">
        <div className="admin-dash-hero-text">
          <p className="admin-dash-kicker">Console opérations</p>
          <h1 className="admin-dash-title">Pilotage ALL EVENT</h1>
          <p className="admin-dash-lead">
            Indicateurs issus de la base de données en temps réel : comptes, modération, réservations
            et flux financiers. Chaque carte renvoie vers le module métier correspondant.
          </p>
        </div>
        <div className="admin-dash-hero-actions">
          <button
            type="button"
            className="admin-dash-btn admin-dash-btn--ghost"
            onClick={() => setTick((n) => n + 1)}
            disabled={isLoading}
          >
            Actualiser
          </button>
          <button
            type="button"
            className="admin-dash-btn"
            onClick={onExport}
            disabled={isExporting || isLoading}
          >
            {isExporting ? 'Export…' : 'Exporter CSV'}
          </button>
        </div>
      </header>

      {error ? (
        <div className="admin-dash-alert" role="alert">
          {error}
        </div>
      ) : null}

      {urgent && !isLoading ? (
        <p className="admin-dash-priority" role="status">
          Actions prioritaires : file d’attente prestataires, signalements ou litiges ouverts.
        </p>
      ) : null}

      <details className="admin-dash-details">
        <summary>Sources données et logique métier</summary>
        <div className="admin-dash-details-body">
          <p>
            Les totaux proviennent des tables Laravel suivantes :{' '}
            <code>users</code> (comptes), <code>prestataires</code> (statut{' '}
            <code>en_attente_validation</code>), <code>signalements_avis</code> (file{' '}
            <code>en_attente</code>), <code>litiges</code> (dossiers <code>ouvert</code> /{' '}
            <code>en_cours</code>), <code>reservations</code>, <code>paiements</code> (CA sur
            statuts réussis), <code>campagnes_publicitaires</code> (validées),{' '}
            <code>evenements_statistiques</code> (mesure d’audience publicitaire).
          </p>
        </div>
      </details>

      <div className="admin-dash-section">
        <h2 className="admin-dash-section-title">File d’attente et conformité</h2>
        <div className="admin-kpi-grid">
          <NavLink
            to="/admin/users"
            className={`admin-kpi-card ${isLoading ? 'admin-kpi-card--skeleton' : ''}`}
          >
            <span className="admin-kpi-label">Utilisateurs enregistrés</span>
            <strong className="admin-kpi-value">
              {isLoading ? '—' : num(stats.utilisateurs_total)}
            </strong>
            <span className="admin-kpi-hint">Table users — tous rôles</span>
          </NavLink>
          <NavLink
            to="/admin/prestataires"
            className={`admin-kpi-card admin-kpi-card--alert ${
              stats.prestataires_en_attente > 0 ? 'admin-kpi-card--pulse' : ''
            } ${isLoading ? 'admin-kpi-card--skeleton' : ''}`}
          >
            <span className="admin-kpi-label">Prestataires à valider</span>
            <strong className="admin-kpi-value">
              {isLoading ? '—' : num(stats.prestataires_en_attente)}
            </strong>
            <span className="admin-kpi-hint">prestataires.statut = en_attente_validation</span>
          </NavLink>
          <NavLink
            to="/admin/reviews?tab=signalements"
            className={`admin-kpi-card admin-kpi-card--alert ${
              stats.signalements_en_attente > 0 ? 'admin-kpi-card--pulse' : ''
            } ${isLoading ? 'admin-kpi-card--skeleton' : ''}`}
          >
            <span className="admin-kpi-label">Signalements en attente</span>
            <strong className="admin-kpi-value">
              {isLoading ? '—' : num(stats.signalements_en_attente)}
            </strong>
            <span className="admin-kpi-hint">signalements_avis en file modération</span>
          </NavLink>
          <NavLink
            to="/admin/reviews?tab=litiges"
            className={`admin-kpi-card admin-kpi-card--alert ${
              stats.litiges_actifs > 0 ? 'admin-kpi-card--pulse' : ''
            } ${isLoading ? 'admin-kpi-card--skeleton' : ''}`}
          >
            <span className="admin-kpi-label">Litiges actifs</span>
            <strong className="admin-kpi-value">
              {isLoading ? '—' : num(stats.litiges_actifs)}
            </strong>
            <span className="admin-kpi-hint">ouvert ou en_cours (non fermé)</span>
          </NavLink>
        </div>
      </div>

      <div className="admin-dash-section">
        <h2 className="admin-dash-section-title">Réservations et activité commerciale</h2>
        <div className="admin-kpi-grid admin-kpi-grid--wide">
          <NavLink
            to="/admin/statistics"
            className={`admin-kpi-card ${isLoading ? 'admin-kpi-card--skeleton' : ''}`}
          >
            <span className="admin-kpi-label">Réservations (total)</span>
            <strong className="admin-kpi-value">
              {isLoading ? '—' : num(stats.reservations_total)}
            </strong>
            <span className="admin-kpi-hint">Tous statuts confondus</span>
          </NavLink>
          <NavLink
            to="/admin/statistics"
            className={`admin-kpi-card ${isLoading ? 'admin-kpi-card--skeleton' : ''}`}
          >
            <span className="admin-kpi-label">Réservations payées</span>
            <strong className="admin-kpi-value">
              {isLoading ? '—' : num(stats.reservations_payees)}
            </strong>
            <span className="admin-kpi-hint">reservations.statut = payee</span>
          </NavLink>
          <NavLink
            to="/admin/commissions"
            className={`admin-kpi-card admin-kpi-card--accent ${isLoading ? 'admin-kpi-card--skeleton' : ''}`}
          >
            <span className="admin-kpi-label">Chiffre d’affaires encaissé</span>
            <strong className="admin-kpi-value admin-kpi-value--money">
              {isLoading ? '—' : money(stats.chiffre_affaires_total)}
            </strong>
            <span className="admin-kpi-hint">Somme paiements réussis / payés</span>
          </NavLink>
          <NavLink
            to="/admin/ads"
            className={`admin-kpi-card ${isLoading ? 'admin-kpi-card--skeleton' : ''}`}
          >
            <span className="admin-kpi-label">Campagnes validées</span>
            <strong className="admin-kpi-value">
              {isLoading ? '—' : num(stats.campagnes_validees)}
            </strong>
            <span className="admin-kpi-hint">Mise en avant opérationnelle</span>
          </NavLink>
          <NavLink
            to="/admin/ads"
            className={`admin-kpi-card ${isLoading ? 'admin-kpi-card--skeleton' : ''}`}
          >
            <span className="admin-kpi-label">Événements de mesure</span>
            <strong className="admin-kpi-value">
              {isLoading ? '—' : num(stats.evenements_stats)}
            </strong>
            <span className="admin-kpi-hint">Interactions suivies (stats pub)</span>
          </NavLink>
        </div>
      </div>

      <nav className="admin-dash-shortcuts" aria-label="Raccourcis modules">
        <NavLink to="/admin/activities" className="admin-dash-shortcut">
          <span className="admin-dash-shortcut-title">Contenu</span>
          <span className="admin-dash-shortcut-desc">Activités et catalogue</span>
        </NavLink>
        <NavLink to="/admin/reviews" className="admin-dash-shortcut">
          <span className="admin-dash-shortcut-title">Avis</span>
          <span className="admin-dash-shortcut-desc">Modération des commentaires</span>
        </NavLink>
        <NavLink to="/admin/notifications" className="admin-dash-shortcut">
          <span className="admin-dash-shortcut-title">Notifications</span>
          <span className="admin-dash-shortcut-desc">Messages globaux</span>
        </NavLink>
      </nav>
    </section>
  )
}
