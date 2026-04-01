import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { usePrestataireFlash } from '../../../context/PrestataireFlashContext'
import { PrestataireGreenBand } from '../../../layouts/PrestataireGreenBand'
import { normalizeMediaDisplayUrl, prestataireApi } from '../../../services/prestataireApi'
import './PrestataireAvailabilityPage.css'

function formatDateLabel(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function dateKeyFromDebut(iso) {
  return iso ? iso.slice(0, 10) : ''
}

function durationMinutes(debutIso, finIso) {
  if (!debutIso || !finIso) return null
  const a = new Date(debutIso).getTime()
  const b = new Date(finIso).getTime()
  if (Number.isNaN(a) || Number.isNaN(b)) return null
  return Math.max(0, Math.round((b - a) / 60000))
}

function mapSlotFromApi(slot) {
  const debut = slot.debut_at
  const fin = slot.fin_at
  const total = Number(slot.capacite_totale ?? 0)
  const restant = Number(slot.capacite_restante ?? 0)
  return {
    id: slot.id,
    dateKey: dateKeyFromDebut(debut),
    dateLabel: formatDateLabel(debut),
    timeRange: `${debut?.slice(11, 16)} – ${fin?.slice(11, 16)}`,
    durationMin: durationMinutes(debut, fin),
    capacityTotal: total,
    capacityRemaining: restant,
    reserved: Math.max(0, total - restant),
    fillRatio: total > 0 ? Math.min(100, Math.round(((total - restant) / total) * 100)) : 0,
    prixApplique: slot.prix_applique != null ? Number(slot.prix_applique) : null,
    active: slot.statut === 'ouvert',
    statut: slot.statut || 'ouvert',
    raw: slot,
  }
}

const CRENEAU_STATUT_OPTIONS = [
  { value: 'ouvert', label: 'Ouvert aux reservations' },
  { value: 'ferme', label: 'Ferme (non reservable)' },
]

export function PrestataireAvailabilityPage() {
  const { showFlash } = usePrestataireFlash()
  const { pathname } = useLocation()
  const [activityId, setActivityId] = useState('')
  const [activities, setActivities] = useState([])
  const [slots, setSlots] = useState([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [activitiesLoading, setActivitiesLoading] = useState(true)
  const [error, setError] = useState('')
  const [newSlot, setNewSlot] = useState({
    date: '',
    start: '09:00',
    end: '11:00',
    capacity: 10,
    prixApplique: '',
  })
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState(null)
  const [deleteCandidate, setDeleteCandidate] = useState(null)

  useEffect(() => {
    let active = true
    setActivitiesLoading(true)
    prestataireApi
      .getActivities()
      .then((items) => {
        if (!active) return
        setActivities(items)
        setActivityId((current) => {
          if (current && items.some((a) => String(a.id) === String(current))) return current
          return items.length ? String(items[0].id) : ''
        })
        setError('')
      })
      .catch((apiError) => {
        if (!active) return
        setError(apiError.message)
      })
      .finally(() => {
        if (active) setActivitiesLoading(false)
      })
    return () => {
      active = false
    }
  }, [pathname])

  useEffect(() => {
    let active = true
    if (!activityId) {
      setSlots([])
      setSlotsLoading(false)
      return undefined
    }
    setSlotsLoading(true)
    prestataireApi
      .getActivityDetails(activityId)
      .then((activity) => {
        if (!active) return
        const list = (activity?.creneaux || [])
          .map(mapSlotFromApi)
          .sort((a, b) => String(a.raw.debut_at).localeCompare(String(b.raw.debut_at)))
        setSlots(list)
        setError('')
      })
      .catch((apiError) => {
        if (!active) return
        setError(apiError.message)
        setSlots([])
      })
      .finally(() => {
        if (active) setSlotsLoading(false)
      })
    return () => {
      active = false
    }
  }, [activityId])

  const selectedActivity = useMemo(
    () => activities.find((a) => String(a.id) === String(activityId)),
    [activities, activityId],
  )

  const basePriceLabel = useMemo(() => {
    if (!selectedActivity) return null
    return `${Number(selectedActivity.price || 0).toLocaleString('fr-FR')} MAD`
  }, [selectedActivity])

  const slotsByDate = useMemo(() => {
    const map = new Map()
    const orderedKeys = []
    slots.forEach((slot) => {
      const key = slot.dateKey || 'sans-date'
      if (!map.has(key)) {
        map.set(key, [])
        orderedKeys.push(key)
      }
      map.get(key).push(slot)
    })
    orderedKeys.sort()
    return orderedKeys.map((key) => ({
      key,
      label: key === 'sans-date' ? 'Date inconnue' : formatDateLabel(`${key}T12:00:00`),
      items: map.get(key),
    }))
  }, [slots])

  const kpis = useMemo(() => {
    const openSlots = slots.filter((s) => s.active)
    const placesRestantesOuvertes = openSlots.reduce((acc, s) => acc + s.capacityRemaining, 0)
    const placesReserveesOuvertes = openSlots.reduce((acc, s) => acc + s.reserved, 0)
    return {
      total: slots.length,
      ouverts: openSlots.length,
      fermes: slots.length - openSlots.length,
      placesRestantesOuvertes,
      placesReserveesOuvertes,
    }
  }, [slots])

  const reloadSlots = async () => {
    if (!activityId) return
    const activity = await prestataireApi.getActivityDetails(activityId)
    const list = (activity?.creneaux || [])
      .map(mapSlotFromApi)
      .sort((a, b) => String(a.raw.debut_at).localeCompare(String(b.raw.debut_at)))
    setSlots(list)
  }

  const toggleSlot = async (slotId, event) => {
    event.stopPropagation()
    const current = slots.find((slot) => slot.id === slotId)
    if (!current) return
    const nextStatus = current.active ? 'ferme' : 'ouvert'
    try {
      setError('')
      await prestataireApi.updateCreneau(activityId, slotId, { statut: nextStatus })
      setSlots((rows) =>
        rows.map((row) =>
          row.id === slotId
            ? {
                ...row,
                active: !row.active,
                statut: nextStatus,
              }
            : row,
        ),
      )
      showFlash(nextStatus === 'ouvert' ? 'Créneau rouvert aux réservations.' : 'Créneau fermé : plus réservable.')
    } catch (apiError) {
      const msg = apiError.message
      setError(msg)
      showFlash(msg, 'error')
    }
  }

  const openEdit = (slot) => {
    const debut = slot.raw.debut_at
    const fin = slot.raw.fin_at
    setEditForm({
      slotId: slot.id,
      date: debut?.slice(0, 10) || '',
      start: debut?.slice(11, 16) || '09:00',
      end: fin?.slice(11, 16) || '11:00',
      capacite_totale: String(slot.capacityTotal),
      capacite_restante: String(slot.capacityRemaining),
      prixApplique: slot.prixApplique != null ? String(slot.prixApplique) : '',
      statut: slot.statut === 'ferme' ? 'ferme' : 'ouvert',
    })
    setShowEditModal(true)
  }

  const saveEdit = async (event) => {
    event.preventDefault()
    if (!editForm || !activityId) return
    const {
      slotId,
      date,
      start,
      end,
      capacite_totale: ct,
      capacite_restante: cr,
      prixApplique: pa,
      statut,
    } = editForm
    const total = Number(ct)
    const restant = Number(cr)
    if (!date || Number.isNaN(total) || total < 1 || Number.isNaN(restant) || restant < 0) {
      setError('Capacités invalides.')
      return
    }
    if (restant > total) {
      setError('Les places restantes ne peuvent pas dépasser la capacité totale.')
      return
    }
    const debutAt = `${date}T${start}:00`
    const finAt = `${date}T${end}:00`
    if (new Date(finAt) <= new Date(debutAt)) {
      setError("L'heure de fin doit être après le début.")
      return
    }
    const payload = {
      debut_at: debutAt,
      fin_at: finAt,
      capacite_totale: total,
      capacite_restante: restant,
      statut,
    }
    if (pa !== '' && pa != null && !Number.isNaN(Number(pa))) {
      payload.prix_applique = Number(pa)
    } else {
      payload.prix_applique = null
    }
    try {
      setError('')
      await prestataireApi.updateCreneau(activityId, slotId, payload)
      await reloadSlots()
      setShowEditModal(false)
      setEditForm(null)
      showFlash('Créneau mis à jour.')
    } catch (apiError) {
      const msg = apiError.message
      setError(msg)
      showFlash(msg, 'error')
    }
  }

  const addSlot = async (event) => {
    event.preventDefault()
    if (!activityId || !newSlot.date) return
    const debutAt = `${newSlot.date}T${newSlot.start}:00`
    const finAt = `${newSlot.date}T${newSlot.end}:00`
    if (new Date(finAt) <= new Date(debutAt)) {
      setError("L'heure de fin doit être après le début.")
      return
    }
    const payload = {
      debut_at: debutAt,
      fin_at: finAt,
      capacite_totale: Number(newSlot.capacity),
      statut: 'ouvert',
    }
    const pa = newSlot.prixApplique
    if (pa !== '' && pa != null && !Number.isNaN(Number(pa))) {
      payload.prix_applique = Number(pa)
    }
    try {
      setError('')
      await prestataireApi.createCreneau(activityId, payload)
      await reloadSlots()
      setNewSlot((current) => ({
        ...current,
        date: '',
        prixApplique: '',
      }))
      setShowCreateModal(false)
      showFlash('Créneau créé : capacité restante = totale jusqu’aux réservations.')
    } catch (apiError) {
      const msg = apiError.message
      setError(msg)
      showFlash(msg, 'error')
    }
  }

  const removeSlot = async (slotId) => {
    try {
      setError('')
      await prestataireApi.deleteCreneau(activityId, slotId)
      setSlots((rows) => rows.filter((slot) => slot.id !== slotId))
      setDeleteCandidate(null)
      showFlash('Créneau supprimé.')
    } catch (apiError) {
      const msg = apiError.message
      setError(msg)
      showFlash(msg, 'error')
    }
  }

  const openCreate = () => {
    setError('')
    setShowCreateModal(true)
  }

  return (
    <section className="pro-availability-page">
      <PrestataireGreenBand
        kicker="Planning"
        title="Disponibilités"
        subtitle="Chaque créneau correspond à une ligne dans la table creneaux : plage horaire, capacité totale et restante, prix optionnel, statut ouvert ou fermé — ce que le catalogue et le panier client utilisent."
        action={
          <button
            type="button"
            className="prestataire-green-band-cta"
            onClick={openCreate}
            disabled={!activityId}
          >
            + Nouveau créneau
          </button>
        }
      />

      <details className="availability-schema">
        <summary>Rappel des champs en base (table creneaux)</summary>
        <ul>
          <li>
            <strong>debut_at / fin_at</strong> — fenêtre réservable (datetime).
          </li>
          <li>
            <strong>capacite_totale</strong> — places vendues sur ce créneau ;{' '}
            <strong>capacite_restante</strong> — stock temps réel (diminué au checkout).
          </li>
          <li>
            <strong>prix_applique</strong> — prix du créneau si renseigné, sinon le prix de base de l’activité.
          </li>
          <li>
            <strong>statut</strong> — <code>ouvert</code> = réservable ; <code>ferme</code> = masqué côté panier.
          </li>
        </ul>
      </details>

      {error && (
        <div className="availability-error" role="alert">
          {error}
        </div>
      )}

      <div className="availability-activity-section">
        <div className="availability-section-head">
          <h2 className="availability-section-title">Activité concernée</h2>
          {activitiesLoading && <span className="availability-inline-hint">Chargement…</span>}
        </div>
        <div className="activity-pick-strip" role="listbox" aria-label="Choisir une activité">
          {!activitiesLoading && activities.length === 0 && (
            <p className="muted">Aucune activité. Créez-en une dans Activités.</p>
          )}
          {activities.map((activity) => (
            <button
              key={activity.id}
              type="button"
              role="option"
              aria-selected={String(activity.id) === String(activityId)}
              className={
                String(activity.id) === String(activityId) ? 'activity-pick-card selected' : 'activity-pick-card'
              }
              onClick={() => setActivityId(String(activity.id))}
            >
              <span className="pick-thumb">
                {activity.coverUrl ? (
                  <img
                    src={normalizeMediaDisplayUrl(activity.coverUrl) || activity.coverUrl}
                    alt=""
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="pick-placeholder">{activity.title?.slice(0, 1) || '?'}</span>
                )}
              </span>
              <span className="pick-body">
                <strong>{activity.title}</strong>
                <span className="pick-meta">
                  {activity.city} · {Number(activity.price || 0).toLocaleString('fr-FR')} MAD
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {selectedActivity && (
        <div className="availability-kpi-grid" aria-live="polite">
          <article className="availability-kpi">
            <span className="availability-kpi-label">Créneaux</span>
            <strong className="availability-kpi-value">{kpis.total}</strong>
          </article>
          <article className="availability-kpi availability-kpi--accent">
            <span className="availability-kpi-label">Ouverts</span>
            <strong className="availability-kpi-value">{kpis.ouverts}</strong>
          </article>
          <article className="availability-kpi">
            <span className="availability-kpi-label">Fermés</span>
            <strong className="availability-kpi-value">{kpis.fermes}</strong>
          </article>
          <article className="availability-kpi availability-kpi--wide">
            <span className="availability-kpi-label">Places restantes (créneaux ouverts)</span>
            <strong className="availability-kpi-value">{kpis.placesRestantesOuvertes}</strong>
            <span className="availability-kpi-sub">
              {kpis.placesReserveesOuvertes} déjà réservées sur ces créneaux
            </span>
          </article>
        </div>
      )}

      <div className="availability-slots-area">
        {!activityId && <p className="muted">Sélectionnez une activité pour afficher les créneaux.</p>}
        {activityId && slotsLoading && (
          <div className="availability-skeleton" aria-hidden>
            {[1, 2, 3].map((i) => (
              <div key={i} className="availability-skeleton-card" />
            ))}
          </div>
        )}
        {activityId && !slotsLoading && slots.length === 0 && (
          <article className="slots-empty">
            <div className="slots-empty-icon" aria-hidden />
            <h3 className="slots-empty-title">Aucun créneau</h3>
            <p className="slots-empty-text">
              Les clients ne pourront pas réserver tant qu’il n’y a pas de plages ouvertes. Le premier créneau fixe
              aussi la capacité initiale (restante = totale).
            </p>
            <button type="button" className="slots-empty-cta" onClick={openCreate}>
              Ajouter le premier créneau
            </button>
          </article>
        )}

        {activityId &&
          !slotsLoading &&
          slotsByDate.map((group) => (
            <section key={group.key} className="slot-day-block">
              <header className="slot-day-header">
                <h3 className="slot-day-title">{group.label}</h3>
                <span className="slot-day-count">{group.items.length} créneau(x)</span>
              </header>
              <div className="slot-cards-grid">
                {group.items.map((slot) => (
                  <article
                    key={slot.id}
                    className={`slot-card ${slot.active ? 'slot-card--open' : 'slot-card--closed'}`}
                  >
                    <div className="slot-card-top">
                      <div className="slot-card-timeblock">
                        <span className="slot-card-time">{slot.timeRange}</span>
                        {slot.durationMin != null && (
                          <span className="slot-card-duration">{slot.durationMin} min</span>
                        )}
                      </div>
                      <span className={`slot-status-pill ${slot.active ? 'is-open' : 'is-closed'}`}>
                        {slot.active ? 'Ouvert' : 'Fermé'}
                      </span>
                    </div>

                    <div className="slot-card-capacity">
                      <div className="slot-capacity-head">
                        <span>Places</span>
                        <span className="slot-capacity-numbers">
                          <strong>{slot.capacityRemaining}</strong>
                          <span className="slot-capacity-sep">/</span>
                          {slot.capacityTotal}
                        </span>
                      </div>
                      <div
                        className="slot-capacity-bar"
                        role="progressbar"
                        aria-valuenow={slot.fillRatio}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label="Taux de réservation sur ce créneau"
                      >
                        <span className="slot-capacity-bar-fill" style={{ width: `${slot.fillRatio}%` }} />
                      </div>
                      <p className="slot-capacity-hint">
                        {slot.reserved} réservée(s) — le panier et le checkout mettent à jour le restant.
                      </p>
                    </div>

                    <div className="slot-card-price-row">
                      {slot.prixApplique != null ? (
                        <>
                          <span className="slot-price-label">Prix créneau</span>
                          <span className="slot-price-value">{slot.prixApplique.toLocaleString('fr-FR')} MAD</span>
                        </>
                      ) : (
                        <>
                          <span className="slot-price-label">Prix catalogue</span>
                          <span className="slot-price-value slot-price-value--muted">{basePriceLabel || '—'}</span>
                        </>
                      )}
                    </div>

                    <div className="slot-card-actions">
                      <button type="button" className="slot-btn slot-btn--primary" onClick={() => openEdit(slot)}>
                        Modifier
                      </button>
                      <button type="button" className="slot-btn" onClick={(e) => toggleSlot(slot.id, e)}>
                        {slot.active ? 'Fermer' : 'Rouvrir'}
                      </button>
                      <button
                        type="button"
                        className="slot-btn slot-btn--danger"
                        onClick={() => setDeleteCandidate(slot.id)}
                      >
                        Supprimer
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
      </div>

      {showCreateModal && (
        <div className="pro-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="create-slot-title">
          <section className="pro-modal-card availability-modal-card">
            <h2 id="create-slot-title">Nouveau créneau</h2>
            <p className="modal-lead">
              À l’enregistrement, la base initialise <strong>capacite_restante</strong> égale à la capacité totale.
            </p>
            <form className="slot-form-v2 availability-modal-form" onSubmit={addSlot}>
              <div className="availability-modal-body">
                <label className="slot-form-field">
                  <span className="slot-form-label">Date</span>
                  <input
                    type="date"
                    value={newSlot.date}
                    onChange={(event) =>
                      setNewSlot((current) => ({ ...current, date: event.target.value }))
                    }
                    required
                  />
                </label>
                <div className="slot-form-row">
                  <label className="slot-form-field">
                    <span className="slot-form-label">Début</span>
                    <input
                      type="time"
                      value={newSlot.start}
                      onChange={(event) =>
                        setNewSlot((current) => ({ ...current, start: event.target.value }))
                      }
                      required
                    />
                  </label>
                  <label className="slot-form-field">
                    <span className="slot-form-label">Fin</span>
                    <input
                      type="time"
                      value={newSlot.end}
                      onChange={(event) =>
                        setNewSlot((current) => ({ ...current, end: event.target.value }))
                      }
                      required
                    />
                  </label>
                </div>
                <label className="slot-form-field">
                  <span className="slot-form-label">Capacité totale</span>
                  <input
                    type="number"
                    min="1"
                    value={newSlot.capacity}
                    onChange={(event) =>
                      setNewSlot((current) => ({ ...current, capacity: event.target.value }))
                    }
                    required
                  />
                </label>
                <label className="slot-form-field">
                  <span className="slot-form-label">Prix appliqué (MAD, optionnel)</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={newSlot.prixApplique}
                    onChange={(event) =>
                      setNewSlot((current) => ({ ...current, prixApplique: event.target.value }))
                    }
                    placeholder="Vide = prix de base de l’activité"
                  />
                </label>
              </div>
              <div className="modal-actions availability-modal-footer">
                <button type="submit" className="btn-submit">
                  Créer
                </button>
                <button type="button" className="ghost" onClick={() => setShowCreateModal(false)}>
                  Annuler
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {showEditModal && editForm && (
        <div className="pro-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="edit-slot-title">
          <section className="pro-modal-card availability-modal-card availability-modal-card--wide">
            <h2 id="edit-slot-title">Modifier le créneau</h2>
            <p className="modal-lead">
              Ajustez les horaires, les capacités ou le statut. Attention : si vous augmentez la capacité totale, ajustez
              manuellement le restant si besoin.
            </p>
            <form className="slot-form-v2 availability-modal-form" onSubmit={saveEdit}>
              <div className="availability-modal-body">
                <label className="slot-form-field">
                  <span className="slot-form-label">Date</span>
                  <input
                    type="date"
                    value={editForm.date}
                    onChange={(event) => setEditForm((f) => ({ ...f, date: event.target.value }))}
                    required
                  />
                </label>
                <div className="slot-form-row">
                  <label className="slot-form-field">
                    <span className="slot-form-label">Début</span>
                    <input
                      type="time"
                      value={editForm.start}
                      onChange={(event) => setEditForm((f) => ({ ...f, start: event.target.value }))}
                      required
                    />
                  </label>
                  <label className="slot-form-field">
                    <span className="slot-form-label">Fin</span>
                    <input
                      type="time"
                      value={editForm.end}
                      onChange={(event) => setEditForm((f) => ({ ...f, end: event.target.value }))}
                      required
                    />
                  </label>
                </div>
                <div className="slot-form-row">
                  <label className="slot-form-field">
                    <span className="slot-form-label">Capacité totale</span>
                    <input
                      type="number"
                      min="1"
                      value={editForm.capacite_totale}
                      onChange={(event) =>
                        setEditForm((f) => ({ ...f, capacite_totale: event.target.value }))
                      }
                      required
                    />
                  </label>
                  <label className="slot-form-field">
                    <span className="slot-form-label">Places restantes</span>
                    <input
                      type="number"
                      min="0"
                      value={editForm.capacite_restante}
                      onChange={(event) =>
                        setEditForm((f) => ({ ...f, capacite_restante: event.target.value }))
                      }
                      required
                    />
                  </label>
                </div>
                <label className="slot-form-field">
                  <span className="slot-form-label">Prix appliqué (MAD)</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={editForm.prixApplique}
                    onChange={(event) =>
                      setEditForm((f) => ({ ...f, prixApplique: event.target.value }))
                    }
                    placeholder="Vide pour revenir au prix de base"
                  />
                </label>
                <label className="slot-form-field">
                  <span className="slot-form-label">Statut</span>
                  <select
                    value={editForm.statut}
                    onChange={(event) => setEditForm((f) => ({ ...f, statut: event.target.value }))}
                  >
                    {CRENEAU_STATUT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="modal-actions availability-modal-footer">
                <button type="submit" className="btn-submit">
                  Enregistrer
                </button>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => {
                    setShowEditModal(false)
                    setEditForm(null)
                  }}
                >
                  Annuler
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {deleteCandidate && (
        <div className="pro-modal-backdrop" role="dialog" aria-modal="true">
          <section className="pro-modal-card">
            <h2>Supprimer ce créneau ?</h2>
            <p className="modal-lead">Les lignes panier ou réservations liées peuvent empêcher la suppression selon les règles métier.</p>
            <div className="modal-actions">
              <button type="button" className="danger" onClick={() => removeSlot(deleteCandidate)}>
                Supprimer
              </button>
              <button type="button" className="ghost" onClick={() => setDeleteCandidate(null)}>
                Annuler
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  )
}
