import { useEffect, useMemo, useState } from 'react'
import { adminApi } from '../../../services/adminApi'
import './AdminStatisticsPage.css'

const TABS = [
  { id: 'executive', label: 'Vue Exécutive' },
  { id: 'marketplace', label: 'Performance Marketplace' },
  { id: 'demand', label: 'Audience & Demande' },
  { id: 'risk', label: 'Qualité & Risque' },
  { id: 'data', label: 'Data Products' },
]

function money(value) {
  return `${Number(value || 0).toLocaleString('fr-FR')} MAD`
}

function number(value) {
  return Number(value || 0).toLocaleString('fr-FR')
}

function defaultDates() {
  const now = new Date()
  const from = new Date(now)
  from.setDate(from.getDate() - 30)
  return {
    from: from.toISOString().slice(0, 10),
    to: now.toISOString().slice(0, 10),
  }
}

export function AdminStatisticsPage() {
  const [tab, setTab] = useState('executive')
  const [filters, setFilters] = useState(defaultDates)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [payload, setPayload] = useState({})

  const query = useMemo(
    () => ({
      from: filters.from || undefined,
      to: filters.to || undefined,
      ville_id: filters.ville_id ? Number(filters.ville_id) : undefined,
      categorie_id: filters.categorie_id ? Number(filters.categorie_id) : undefined,
    }),
    [filters],
  )

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')

    const run =
      tab === 'executive'
        ? adminApi.getExecutiveStats(query)
        : tab === 'marketplace'
          ? adminApi.getMarketplaceStats(query)
          : tab === 'demand'
            ? adminApi.getDemandStats(query)
            : tab === 'risk'
              ? adminApi.getRiskStats(query)
              : adminApi.getDataProductsStats(query)

    run
      .then((data) => {
        if (!active) return
        setPayload(data || {})
      })
      .catch((e) => {
        if (!active) return
        setPayload({})
        setError(e instanceof Error ? e.message : 'Chargement des statistiques impossible.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [tab, query])

  const kpis = payload?.kpis || {}

  return (
    <section className="admin-stats-page">
      <header className="admin-stats-hero">
        <p className="admin-stats-kicker">Data Intelligence</p>
        <h1 className="admin-stats-title">Statistiques plateforme & produits data</h1>
        <p className="admin-stats-lead">
          Vue opérationnelle interne et indicateurs agrégés exploitables commercialement (anonymisés)
          pour les promoteurs d’activités.
        </p>
      </header>

      <div className="admin-stats-filters">
        <label>
          Du
          <input
            type="date"
            value={filters.from || ''}
            onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
          />
        </label>
        <label>
          Au
          <input
            type="date"
            value={filters.to || ''}
            onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
          />
        </label>
        <label>
          Ville ID (optionnel)
          <input
            type="number"
            min="1"
            placeholder="ex: 1"
            value={filters.ville_id || ''}
            onChange={(e) => setFilters((f) => ({ ...f, ville_id: e.target.value }))}
          />
        </label>
        <label>
          Catégorie ID (optionnel)
          <input
            type="number"
            min="1"
            placeholder="ex: 3"
            value={filters.categorie_id || ''}
            onChange={(e) => setFilters((f) => ({ ...f, categorie_id: e.target.value }))}
          />
        </label>
      </div>

      <div className="admin-stats-tabs" role="tablist">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={tab === item.id ? 'admin-stats-tab active' : 'admin-stats-tab'}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="admin-stats-error" role="alert">
          {error}
        </div>
      ) : null}

      {loading ? <p className="admin-stats-loading">Chargement...</p> : null}

      {!loading && (
        <>
          <div className="admin-stats-kpis">
            {tab === 'executive' && (
              <>
                <article><span>Utilisateurs</span><strong>{number(kpis.utilisateurs_total)}</strong></article>
                <article><span>Prestataires</span><strong>{number(kpis.prestataires_total)}</strong></article>
                <article><span>Réservations</span><strong>{number(kpis.reservations_total)}</strong></article>
                <article><span>Payées</span><strong>{number(kpis.reservations_payees)}</strong></article>
                <article><span>Taux conversion payée</span><strong>{number(kpis.taux_conversion_payee_pct)}%</strong></article>
                <article><span>CA</span><strong>{money(kpis.chiffre_affaires_total)}</strong></article>
                <article><span>Panier moyen</span><strong>{money(kpis.panier_moyen)}</strong></article>
              </>
            )}

            {tab === 'marketplace' && (
              <>
                <article><span>Réservations</span><strong>{number(kpis.reservations_total)}</strong></article>
                <article><span>Payées</span><strong>{number(kpis.reservations_payees)}</strong></article>
                <article><span>CA encaissé</span><strong>{money(kpis.ca_encaisse)}</strong></article>
                <article><span>Commission plateforme</span><strong>{money(kpis.commission_plateforme)}</strong></article>
                <article><span>Net prestataires</span><strong>{money(kpis.net_prestataires)}</strong></article>
              </>
            )}

            {tab === 'demand' && (
              <>
                <article><span>Événements</span><strong>{number(kpis.evenements_total)}</strong></article>
                <article><span>Sessions uniques</span><strong>{number(kpis.sessions_uniques)}</strong></article>
                <article><span>Utilisateurs uniques</span><strong>{number(kpis.utilisateurs_uniques)}</strong></article>
              </>
            )}

            {tab === 'risk' && (
              <>
                <article><span>Litiges ouverts</span><strong>{number(kpis.litiges_ouverts)}</strong></article>
                <article><span>Litiges en cours</span><strong>{number(kpis.litiges_en_cours)}</strong></article>
                <article><span>Litiges fermés</span><strong>{number(kpis.litiges_fermes)}</strong></article>
                <article><span>Signalements attente</span><strong>{number(kpis.signalements_en_attente)}</strong></article>
                <article><span>Remboursements attente</span><strong>{number(kpis.remboursements_en_attente)}</strong></article>
                <article><span>Remboursements acceptés</span><strong>{number(kpis.remboursements_acceptes)}</strong></article>
              </>
            )}

            {tab === 'data' && (
              <>
                <article><span>Demand events</span><strong>{number(kpis.demand_events_total)}</strong></article>
                <article><span>Réservations</span><strong>{number(kpis.reservations_total)}</strong></article>
                <article><span>Réservations payées</span><strong>{number(kpis.reservations_payees)}</strong></article>
              </>
            )}
          </div>

          {tab === 'demand' && (
            <div className="admin-stats-grid-2">
              <section className="admin-stats-card">
                <h3>Top villes (demande)</h3>
                <ul>
                  {(payload.top_villes || []).map((x) => (
                    <li key={`${x.ville_id}-${x.ville}`}>{x.ville}: {number(x.total)}</li>
                  ))}
                  {!(payload.top_villes || []).length ? <li>—</li> : null}
                </ul>
              </section>
              <section className="admin-stats-card">
                <h3>Top activités (demandes)</h3>
                <ul>
                  {(payload.top_activites || []).map((x) => (
                    <li key={`${x.activite_id}-${x.activite}`}>{x.activite}: {number(x.total)}</li>
                  ))}
                  {!(payload.top_activites || []).length ? <li>—</li> : null}
                </ul>
              </section>
            </div>
          )}

          {tab === 'data' && (
            <div className="admin-stats-grid-2">
              <section className="admin-stats-card">
                <h3>Saisonnalité demande (mois)</h3>
                <ul>
                  {(payload.monthly_demand || []).map((x) => (
                    <li key={x.periode}>{x.periode}: {number(x.volume)}</li>
                  ))}
                  {!(payload.monthly_demand || []).length ? <li>—</li> : null}
                </ul>
              </section>
              <section className="admin-stats-card">
                <h3>Demande observée par catégorie (période sélectionnée)</h3>
                <ul>
                  {(payload.top_categories || []).map((x) => (
                    <li key={x.categorie_id}>{x.categorie || `Catégorie #${x.categorie_id}`}: {number(x.total)}</li>
                  ))}
                  {!(payload.top_categories || []).length ? (
                    <li>
                      Aucun segment exploitable pour cette période (seuil mini: {payload.meta?.minimum_group_size_hint || 30}).
                    </li>
                  ) : null}
                </ul>
                <p className="admin-stats-note">
                  {payload.meta?.anonymized
                    ? `Données anonymisées activées (seuil minimum: ${payload.meta?.minimum_group_size_hint || 30}).`
                    : ''}
                </p>
              </section>
            </div>
          )}
        </>
      )}
    </section>
  )
}
