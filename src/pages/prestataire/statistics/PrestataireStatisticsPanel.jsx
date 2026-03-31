import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePrestataireFlash } from '../../../context/PrestataireFlashContext'
import { PrestataireGreenBand } from '../../../layouts/PrestataireGreenBand'
import { prestataireApi } from '../../../services/prestataireApi'
import './PrestataireStatisticsPage.css'

function money(n, devise = 'MAD') {
  return `${Number(n || 0).toLocaleString('fr-FR')} ${devise}`
}

const defaultStats = {
  reservations_total: 0,
  reservations_payees: 0,
  reservations_confirmees: 0,
  reservations_annulees: 0,
  chiffre_affaires: 0,
  evenements_stats: 0,
  avis_total: 0,
  avis_note_moyenne: 0,
}

/** Contenu « Analyses » (ex-page Statistiques), intégré dans le Dashboard à onglets. */
export function PrestataireStatisticsPanel() {
  const { showFlash } = usePrestataireFlash()
  const [stats, setStats] = useState(defaultStats)
  const [statsLoading, setStatsLoading] = useState(true)
  const [monthlyRevenue, setMonthlyRevenue] = useState([])
  const [monthlyLoading, setMonthlyLoading] = useState(true)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)

  const loadStats = useCallback(() => {
    setStatsLoading(true)
    return prestataireApi
      .getStats()
      .then((data) => {
        if (data && typeof data === 'object') {
          setStats({ ...defaultStats, ...data })
        }
        setError('')
      })
      .catch((apiError) => {
        setError(apiError.message)
      })
      .finally(() => setStatsLoading(false))
  }, [])

  const loadMonthly = useCallback(() => {
    setMonthlyLoading(true)
    return prestataireApi
      .getReservations()
      .then((reservations) => {
        if (!Array.isArray(reservations) || !reservations.length) {
          setMonthlyRevenue([])
          return
        }
        const byMonth = new Map()
        reservations.forEach((row) => {
          if (row.backendStatus !== 'payee') return
          const key = row.date ? row.date.slice(0, 7) : 'inconnu'
          const previous = byMonth.get(key) || 0
          byMonth.set(key, previous + Number(row.amount || 0))
        })
        const computed = Array.from(byMonth.entries())
          .map(([month, gross], index) => {
            const commission = Math.round(gross * 0.125)
            return {
              id: `M-${index + 1}`,
              month,
              gross,
              commission,
              net: gross - commission,
            }
          })
          .sort((a, b) => (a.month < b.month ? 1 : -1))
        setMonthlyRevenue(computed)
      })
      .catch(() => {
        setMonthlyRevenue([])
      })
      .finally(() => setMonthlyLoading(false))
  }, [])

  useEffect(() => {
    loadStats()
    loadMonthly()
  }, [loadStats, loadMonthly])

  const partPayeesPct = useMemo(() => {
    const t = Number(stats.reservations_total || 0)
    const p = Number(stats.reservations_payees || 0)
    if (t <= 0) return 0
    return Math.round((p / t) * 100)
  }, [stats.reservations_total, stats.reservations_payees])

  const insight = useMemo(() => {
    if (partPayeesPct < 40) {
      return {
        title: 'Encaissement',
        text: 'Une part importante de réservations n’est pas encore au statut « payée ». Relancez les clients en attente de paiement ou vérifiez le tunnel de paiement.',
      }
    }
    if (Number(stats.reservations_confirmees || 0) < Number(stats.reservations_payees || 0) * 0.5) {
      return {
        title: 'Confirmation',
        text: 'Après paiement, confirmez rapidement les réservations côté prestataire pour rassurer les clients (page Réservations).',
      }
    }
    return {
      title: 'Pilotage',
      text: 'Vos indicateurs sont équilibrés. Surveillez le chiffre d’affaires et les avis pour ajuster l’offre.',
    }
  }, [partPayeesPct, stats.reservations_confirmees, stats.reservations_payees])

  const handleExport = async () => {
    try {
      setExporting(true)
      await prestataireApi.downloadStatsExport()
      showFlash('Export CSV téléchargé.')
    } catch (apiError) {
      showFlash(apiError.message || 'Export impossible.', 'error')
    } finally {
      setExporting(false)
    }
  }

  const noteLabel =
    Number(stats.avis_total || 0) > 0
      ? `${Number(stats.avis_note_moyenne || 0).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} / 5`
      : '—'

  return (
    <section className="pro-statistics-page">
      <PrestataireGreenBand
        kicker="Analyses"
        title="Indicateurs & rapports"
        subtitle="Indicateurs calculés sur vos réservations liées à vos activités (filtre prestataire), avis visibles et événements de tracking. Le CA agrège les réservations au statut « payée »."
        action={
          <button
            type="button"
            className="prestataire-green-band-cta"
            onClick={handleExport}
            disabled={exporting || statsLoading}
          >
            {exporting ? 'Export…' : 'Exporter CSV'}
          </button>
        }
      />

      <details className="stats-schema">
        <summary>Que contient le tableau de bord ?</summary>
        <ul>
          <li>
            <strong>Réservations</strong> : toutes les réservations dont au moins une ligne pointe vers une de vos
            activités (via créneau).
          </li>
          <li>
            <strong>Chiffre d’affaires</strong> : somme des <code>montant_total</code> des réservations au statut{' '}
            <code>payee</code> (aligné sur la colonne « brut » mensuelle ci-dessous).
          </li>
          <li>
            <strong>Avis</strong> : avis <code>visible</code> sur vos activités — note moyenne sur ces avis.
          </li>
          <li>
            <strong>Événements stats</strong> : lignes dans la table métier des événements de statistiques liés à votre
            prestataire.
          </li>
        </ul>
      </details>

      {error && (
        <div className="stats-error" role="alert">
          {error}
        </div>
      )}

      {statsLoading && (
        <div className="stats-skeleton-grid" aria-hidden>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="stats-skeleton-kpi" />
          ))}
        </div>
      )}

      {!statsLoading && (
        <div className="stats-kpi-grid">
          <article className="stats-kpi">
            <span className="stats-kpi-label">Réservations (total)</span>
            <strong className="stats-kpi-value">{stats.reservations_total}</strong>
          </article>
          <article className="stats-kpi stats-kpi--accent">
            <span className="stats-kpi-label">Payées</span>
            <strong className="stats-kpi-value">{stats.reservations_payees}</strong>
          </article>
          <article className="stats-kpi">
            <span className="stats-kpi-label">Confirmées</span>
            <strong className="stats-kpi-value">{stats.reservations_confirmees ?? 0}</strong>
          </article>
          <article className="stats-kpi">
            <span className="stats-kpi-label">Annulées</span>
            <strong className="stats-kpi-value">{stats.reservations_annulees ?? 0}</strong>
          </article>
          <article className="stats-kpi stats-kpi--wide">
            <span className="stats-kpi-label">Chiffre d’affaires (payées)</span>
            <strong className="stats-kpi-value">{money(stats.chiffre_affaires)}</strong>
          </article>
          <article className="stats-kpi">
            <span className="stats-kpi-label">Avis (visibles)</span>
            <strong className="stats-kpi-value">{stats.avis_total ?? 0}</strong>
          </article>
          <article className="stats-kpi">
            <span className="stats-kpi-label">Note moyenne</span>
            <strong className="stats-kpi-value">{noteLabel}</strong>
          </article>
          <article className="stats-kpi">
            <span className="stats-kpi-label">Événements (tracking)</span>
            <strong className="stats-kpi-value">{stats.evenements_stats ?? 0}</strong>
          </article>
          <article className="stats-kpi stats-kpi--highlight">
            <span className="stats-kpi-label">Part des réservations payées</span>
            <strong className="stats-kpi-value">{partPayeesPct}%</strong>
            <span className="stats-kpi-hint">Payées / total</span>
          </article>
        </div>
      )}

      <section className="stats-focus-grid">
        <article className="stats-focus-card">
          <h3>{insight.title}</h3>
          <p>{insight.text}</p>
        </article>
        <article className="stats-focus-card stats-focus-card--secondary">
          <h3>Objectif encaissement</h3>
          <p>
            {partPayeesPct >= 100
              ? 'Toutes les réservations listées sont payées sur la période couverte.'
              : `${100 - partPayeesPct}% des réservations ne sont pas encore au statut payé (hors remboursements).`}
          </p>
        </article>
      </section>

      <section className="stats-revenue-section">
        <div className="stats-section-head">
          <h2>Revenus mensuels (estimation)</h2>
          <p>
            Agrégation côté client des réservations <strong>payées</strong> par mois (sur la page courante API, max. 30
            réservations). Commission plateforme indicative : 12,5 %.
          </p>
        </div>
        {monthlyLoading && (
          <div className="stats-revenue-skeleton" aria-hidden>
            <div className="stats-revenue-skel-line" />
            <div className="stats-revenue-skel-line" />
          </div>
        )}
        {!monthlyLoading && monthlyRevenue.length === 0 && (
          <article className="stats-revenue-empty">
            Pas assez de données payées pour dessiner un historique mensuel. Vérifiez les réservations ou élargissez la
            pagination côté API plus tard.
          </article>
        )}
        {!monthlyLoading && monthlyRevenue.length > 0 && (
          <div className="stats-revenue-table">
            {monthlyRevenue.map((row) => {
              const netPct = row.gross > 0 ? Math.round((row.net / row.gross) * 100) : 0
              return (
                <article key={row.id} className="stats-revenue-line">
                  <div className="stats-revenue-line-top">
                    <strong className="stats-revenue-month">{row.month}</strong>
                    <span className="stats-revenue-net">Net : {money(row.net)}</span>
                  </div>
                  <div className="stats-revenue-line-meta">
                    <span>Brut : {money(row.gross)}</span>
                    <span>Commission (12,5 %) : {money(row.commission)}</span>
                  </div>
                  <div className="stats-revenue-progress" role="presentation">
                    <span className="stats-revenue-progress-fill" style={{ width: `${Math.max(8, Math.min(100, netPct))}%` }} />
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </section>
  )
}
