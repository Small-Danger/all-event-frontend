import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { usePrestataireFlash } from '../../../context/PrestataireFlashContext'
import { PrestataireGreenBand } from '../../../layouts/PrestataireGreenBand'
import { prestataireApi } from '../../../services/prestataireApi'
import './PrestataireReservationsPage.css'

function money(value, devise = 'MAD') {
  const n = Number(value || 0)
  return `${n.toLocaleString('fr-FR')} ${devise}`
}

function formatDateFr(isoDate) {
  if (!isoDate || isoDate === '—') return '—'
  const d = new Date(`${isoDate}T12:00:00`)
  if (Number.isNaN(d.getTime())) return isoDate
  return d.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const STATUS_META = {
  awaiting_payment: { label: 'Attente paiement', pillClass: 'res-pill--wait' },
  paid: { label: 'Payée', pillClass: 'res-pill--paid' },
  confirmed: { label: 'Confirmée', pillClass: 'res-pill--ok' },
  cancelled: { label: 'Annulée', pillClass: 'res-pill--off' },
  refunded: { label: 'Remboursée', pillClass: 'res-pill--off' },
}

const FILTERS = [
  { value: 'all', label: 'Toutes' },
  { value: 'awaiting_payment', label: 'Attente paiement' },
  { value: 'paid', label: 'Payées' },
  { value: 'confirmed', label: 'Confirmées' },
  { value: 'cancelled', label: 'Annulées / remb.' },
]

export function PrestataireReservationsPage() {
  const { showFlash } = usePrestataireFlash()
  const { pathname } = useLocation()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState(null)

  const loadReservations = () => {
    setLoading(true)
    return prestataireApi
      .getReservations()
      .then((data) => {
        setRows(Array.isArray(data) ? data : [])
        setError('')
      })
      .catch((apiError) => {
        setError(apiError.message)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    let active = true
    prestataireApi
      .getReservations()
      .then((data) => {
        if (!active) return
        setRows(Array.isArray(data) ? data : [])
        setError('')
      })
      .catch((apiError) => {
        if (!active) return
        setError(apiError.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [pathname])

  const visible = useMemo(
    () =>
      rows.filter((r) => {
        if (filter === 'all') return true
        if (filter === 'cancelled') return r.status === 'cancelled' || r.status === 'refunded'
        return r.status === filter
      }),
    [rows, filter],
  )

  const kpis = useMemo(() => {
    const awaiting = rows.filter((r) => r.status === 'awaiting_payment').length
    const paid = rows.filter((r) => r.status === 'paid').length
    const confirmed = rows.filter((r) => r.status === 'confirmed').length
    const closed = rows.filter((r) => r.status === 'cancelled' || r.status === 'refunded').length
    return { total: rows.length, awaiting, paid, confirmed, closed }
  }, [rows])

  const selectedReservation = useMemo(
    () => rows.find((r) => String(r.id) === String(selectedId)) || null,
    [rows, selectedId],
  )

  const updateStatus = async (id, status) => {
    try {
      setError('')
      const updated = await prestataireApi.updateReservationStatus(id, status)
      if (!updated) return false
      setRows((current) => current.map((row) => (row.id === id ? updated : row)))
      showFlash(status === 'confirmed' ? 'Réservation confirmée.' : 'Réservation annulée.')
      return true
    } catch (apiError) {
      const msg = apiError.message
      setError(msg)
      showFlash(msg, 'error')
      return false
    }
  }

  const canConfirm = (s) => s === 'awaiting_payment' || s === 'paid'
  const canCancel = (s) => s === 'awaiting_payment' || s === 'paid' || s === 'confirmed'

  return (
    <section className="pro-reservations-page">
      <PrestataireGreenBand
        kicker="Relation client"
        title="Réservations"
        subtitle="Données issues des tables reservations, lignes_reservation, creneaux et paiements. Les 30 dernières commandes (pagination API). Vous pouvez passer le statut en confirmée ou annulée."
        action={false}
      />

      <details className="res-schema">
        <summary>Rappel métier (base de données)</summary>
        <ul>
          <li>
            <strong>reservations</strong> : statut (<code>en_attente_paiement</code>, <code>payee</code>,{' '}
            <code>confirmee</code>, <code>annulee</code>…), <code>montant_total</code>,{' '}
            <code>montant_reduction</code>, <code>devise</code>.
          </li>
          <li>
            <strong>lignes_reservation</strong> : lien <code>creneau_id</code>, <code>quantite</code>,{' '}
            <code>prix_unitaire_snapshot</code> (historique).
          </li>
          <li>
            <strong>paiements</strong> : état du flux de paiement ; la réservation passe en <code>payee</code> quand le
            paiement est réussi côté client.
          </li>
          <li>
            Ici, <strong>PATCH …/statut</strong> n’accepte que <code>confirmee</code> ou <code>annulee</code>.
          </li>
        </ul>
      </details>

      {error && (
        <div className="res-error" role="alert">
          {error}
        </div>
      )}

      <div className="res-kpi-grid" aria-live="polite">
        <article className="res-kpi">
          <span className="res-kpi-label">Total (page)</span>
          <strong className="res-kpi-value">{kpis.total}</strong>
        </article>
        <article className="res-kpi res-kpi--accent">
          <span className="res-kpi-label">Attente paiement</span>
          <strong className="res-kpi-value">{kpis.awaiting}</strong>
        </article>
        <article className="res-kpi">
          <span className="res-kpi-label">Payées</span>
          <strong className="res-kpi-value">{kpis.paid}</strong>
        </article>
        <article className="res-kpi">
          <span className="res-kpi-label">Confirmées</span>
          <strong className="res-kpi-value">{kpis.confirmed}</strong>
        </article>
        <article className="res-kpi">
          <span className="res-kpi-label">Annul. / remb.</span>
          <strong className="res-kpi-value">{kpis.closed}</strong>
        </article>
      </div>

      <div className="res-filters" role="tablist" aria-label="Filtrer les réservations">
        {FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={filter === item.value}
            className={filter === item.value ? 'res-filter-btn active' : 'res-filter-btn'}
            onClick={() => setFilter(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="res-skeleton-wrap" aria-hidden>
          {[1, 2, 3].map((i) => (
            <div key={i} className="res-skeleton-card" />
          ))}
        </div>
      )}

      {!loading && visible.length === 0 && (
        <article className="res-empty">
          <div className="res-empty-icon" aria-hidden />
          <h3 className="res-empty-title">Aucune réservation</h3>
          <p className="res-empty-text">
            Aucune entrée ne correspond à ce filtre, ou vous n’avez pas encore de réservations sur vos activités.
          </p>
          <button type="button" className="res-empty-cta" onClick={() => loadReservations()}>
            Actualiser
          </button>
        </article>
      )}

      {!loading && visible.length > 0 && (
        <ul className="res-card-list">
          {visible.map((item) => {
            const meta = STATUS_META[item.status] || STATUS_META.awaiting_payment
            return (
              <li key={item.id}>
                <article className="res-card">
                  <div className="res-card-main">
                    <div className="res-card-title-row">
                      <h2 className="res-card-activity">{item.activity}</h2>
                      <span className={`res-pill ${meta.pillClass}`}>{meta.label}</span>
                    </div>
                    {item.activitySubtitle && (
                      <p className="res-card-sub">{item.activitySubtitle}</p>
                    )}
                    <div className="res-card-meta-line">
                      <span className="res-meta-item">{item.customer}</span>
                      <span className="res-meta-dot" aria-hidden />
                      <span className="res-meta-item">{formatDateFr(item.date)}</span>
                      {item.timeRange && (
                        <>
                          <span className="res-meta-dot" aria-hidden />
                          <span className="res-meta-item">{item.timeRange}</span>
                        </>
                      )}
                      <span className="res-meta-dot" aria-hidden />
                      <span className="res-meta-item">
                        {item.people} place{item.people > 1 ? 's' : ''}
                      </span>
                    </div>
                    {item.lineCount > 1 && (
                      <p className="res-card-multi">
                        + {item.lineCount - 1} ligne(s) sur d’autres créneaux / activités
                      </p>
                    )}
                  </div>
                  <div className="res-card-side">
                    <strong className="res-card-amount">{money(item.amount, item.devise)}</strong>
                    {item.montantReduction != null && item.montantReduction > 0 && (
                      <span className="res-card-discount">
                        − {money(item.montantReduction, item.devise)} promo
                      </span>
                    )}
                    <div className="res-card-actions">
                      {canConfirm(item.status) && (
                        <button type="button" className="res-btn res-btn--primary" onClick={() => updateStatus(item.id, 'confirmed')}>
                          Confirmer
                        </button>
                      )}
                      {canCancel(item.status) && (
                        <button
                          type="button"
                          className="res-btn res-btn--danger"
                          onClick={() => updateStatus(item.id, 'cancelled')}
                        >
                          Annuler
                        </button>
                      )}
                      <button type="button" className="res-btn res-btn--ghost" onClick={() => setSelectedId(item.id)}>
                        Détails
                      </button>
                    </div>
                  </div>
                </article>
              </li>
            )
          })}
        </ul>
      )}

      {selectedReservation && (
        <div className="pro-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="res-detail-title">
          <section className="pro-modal-card res-modal">
            <h2 id="res-detail-title">Détail réservation #{selectedReservation.id}</h2>
            <dl className="res-dl">
              <div>
                <dt>Client</dt>
                <dd>{selectedReservation.customer}</dd>
              </div>
              {selectedReservation.customerEmail && (
                <div>
                  <dt>Email</dt>
                  <dd>
                    <a href={`mailto:${selectedReservation.customerEmail}`}>{selectedReservation.customerEmail}</a>
                  </dd>
                </div>
              )}
              <div>
                <dt>Montant total</dt>
                <dd>{money(selectedReservation.amount, selectedReservation.devise)}</dd>
              </div>
              {selectedReservation.montantReduction != null && selectedReservation.montantReduction > 0 && (
                <div>
                  <dt>Réduction</dt>
                  <dd>{money(selectedReservation.montantReduction, selectedReservation.devise)}</dd>
                </div>
              )}
              {selectedReservation.promotion && (
                <div>
                  <dt>Promotion</dt>
                  <dd>
                    {selectedReservation.promotion.libelle}
                    {selectedReservation.promotion.code ? ` (${selectedReservation.promotion.code})` : ''}
                  </dd>
                </div>
              )}
              <div>
                <dt>Statut réservation</dt>
                <dd>{STATUS_META[selectedReservation.status]?.label || selectedReservation.backendStatus}</dd>
              </div>
              {selectedReservation.paiement && (
                <div>
                  <dt>Paiement</dt>
                  <dd>
                    {selectedReservation.paiement.statut} — {money(selectedReservation.paiement.montant, selectedReservation.devise)}
                    {selectedReservation.paiement.payeLe && (
                      <span className="res-dl-sub"> · Payé le {selectedReservation.paiement.payeLe.slice(0, 10)}</span>
                    )}
                  </dd>
                </div>
              )}
              <div>
                <dt>Créée le</dt>
                <dd>{selectedReservation.createdAt?.slice(0, 19)?.replace('T', ' ') || '—'}</dd>
              </div>
            </dl>

            <h3 className="res-modal-lines-title">Lignes (lignes_reservation)</h3>
            <ul className="res-lines-list">
              {selectedReservation.linesDetail.map((line) => (
                <li key={line.id} className="res-line-item">
                  <div>
                    <strong>{line.activityTitle}</strong>
                    {line.ville && <span className="res-line-ville">{line.ville}</span>}
                  </div>
                  <div className="res-line-meta">
                    {line.debutAt && (
                      <span>
                        {String(line.debutAt).slice(0, 10)} {line.timeRange && `· ${line.timeRange}`}
                      </span>
                    )}
                    <span>
                      ×{line.quantite} @ {money(line.prixUnitaire, selectedReservation.devise)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>

            <div className="modal-actions">
              {canConfirm(selectedReservation.status) && (
                <button
                  type="button"
                  className="res-modal-action-primary"
                  onClick={async () => {
                    const ok = await updateStatus(selectedReservation.id, 'confirmed')
                    if (ok) setSelectedId(null)
                  }}
                >
                  Confirmer
                </button>
              )}
              {canCancel(selectedReservation.status) && (
                <button
                  type="button"
                  className="danger"
                  onClick={async () => {
                    const ok = await updateStatus(selectedReservation.id, 'cancelled')
                    if (ok) setSelectedId(null)
                  }}
                >
                  Annuler la réservation
                </button>
              )}
              <button type="button" className="ghost" onClick={() => setSelectedId(null)}>
                Fermer
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  )
}
