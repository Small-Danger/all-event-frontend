import { useCallback, useEffect, useMemo, useState } from 'react'
import { clientApi } from '../../../services/clientApi'
import './ClientReviewsPage.css'

function avisStatutLabel(s) {
  if (s === 'visible') return 'Visible sur le catalogue'
  if (s === 'masque') return 'Masqué par la modération'
  if (s === 'en_attente_moderation') return 'En cours de modération'
  return s || '—'
}

function avisStatutClass(s) {
  if (s === 'visible') return 'client-rev-statut client-rev-statut--ok'
  if (s === 'masque') return 'client-rev-statut client-rev-statut--bad'
  return 'client-rev-statut client-rev-statut--wait'
}

async function collectAllReviewedReservationIds() {
  const ids = new Set()
  let page = 1
  let lastPage = 1
  do {
    const res = await clientApi.getReviews({ page })
    for (const it of res.items) {
      if (it.reservationId != null) ids.add(Number(it.reservationId))
    }
    lastPage = res.last_page || 1
    page += 1
  } while (page <= lastPage)
  return [...ids]
}

export function ClientReviewsPage() {
  const [reviews, setReviews] = useState([])
  const [reviewMeta, setReviewMeta] = useState({ current_page: 1, last_page: 1, total: 0 })
  const [reviewPage, setReviewPage] = useState(1)
  const [reservations, setReservations] = useState([])
  const [reviewedReservationIds, setReviewedReservationIds] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [listLoading, setListLoading] = useState(false)
  const [error, setError] = useState('')
  const [newReview, setNewReview] = useState({
    reservationId: '',
    score: 5,
    text: '',
  })
  const [editingReviewId, setEditingReviewId] = useState(null)
  const [editingReview, setEditingReview] = useState({ score: 5, text: '' })

  const loadReviewsPage = useCallback(async (page) => {
    const res = await clientApi.getReviews({ page })
    setReviews(res.items)
    setReviewMeta({
      current_page: res.current_page ?? 1,
      last_page: res.last_page ?? 1,
      total: res.total ?? 0,
    })
    setReviewPage(res.current_page ?? 1)
  }, [])

  const refreshReviewedIds = useCallback(async () => {
    const ids = await collectAllReviewedReservationIds()
    setReviewedReservationIds(ids)
  }, [])

  useEffect(() => {
    let active = true
    setIsLoading(true)
    setError('')
    ;(async () => {
      try {
        const reservs = await clientApi.getReservations()
        if (!active) return
        setReservations(reservs)
        const ids = await collectAllReviewedReservationIds()
        if (!active) return
        setReviewedReservationIds(ids)
        await loadReviewsPage(1)
      } catch (apiError) {
        if (!active) return
        setError(apiError instanceof Error ? apiError.message : 'Chargement impossible.')
      } finally {
        if (active) setIsLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [loadReviewsPage])

  const reviewableReservations = useMemo(
    () =>
      reservations.filter(
        (reservation) =>
          reservation.canLeaveReview && !reviewedReservationIds.includes(Number(reservation.id)),
      ),
    [reservations, reviewedReservationIds],
  )

  const onSubmitReview = async (event) => {
    event.preventDefault()
    setError('')
    const selectedReservation = reservations.find(
      (reservation) => String(reservation.id) === String(newReview.reservationId),
    )
    if (!selectedReservation?.activityId) {
      setError('Sélectionnez une réservation éligible.')
      return
    }
    const text = newReview.text.trim()
    if (text.length > 0 && text.length < 3) {
      setError('Le commentaire doit faire au moins 3 caractères, ou laissez-le vide.')
      return
    }
    try {
      await clientApi.createReview({
        reservationId: newReview.reservationId,
        activityId: selectedReservation.activityId,
        score: Number(newReview.score),
        text: text || null,
      })
      await refreshReviewedIds()
      setReviewPage(1)
      await loadReviewsPage(1)
      setNewReview({ reservationId: '', score: 5, text: '' })
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : 'Envoi impossible.')
    }
  }

  const startEditReview = (review) => {
    setEditingReviewId(review.id)
    setEditingReview({ score: review.score, text: review.text })
    setError('')
  }

  const cancelEditReview = () => {
    setEditingReviewId(null)
    setEditingReview({ score: 5, text: '' })
  }

  const saveEditReview = async () => {
    if (!editingReviewId) return
    try {
      await clientApi.updateReview(editingReviewId, editingReview)
      await loadReviewsPage(reviewPage)
      cancelEditReview()
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : 'Mise à jour impossible.')
    }
  }

  const removeReview = async (reviewId) => {
    const confirmed = window.confirm('Supprimer cet avis ?')
    if (!confirmed) return
    try {
      await clientApi.deleteReview(reviewId)
      await refreshReviewedIds()
      await loadReviewsPage(reviewPage)
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : 'Suppression impossible.')
    }
  }

  const changeReviewPage = async (nextPage) => {
    setError('')
    setListLoading(true)
    try {
      await loadReviewsPage(nextPage)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chargement impossible.')
    } finally {
      setListLoading(false)
    }
  }

  return (
    <section className="client-reviews-page">
      <header>
        <h1>Mes avis</h1>
        <p>
          Vous pouvez noter une activité après une réservation payée et une fois le créneau terminé. Les avis visibles
          apparaissent sur la fiche publique ; la modération peut masquer un contenu. Pour signaler l&apos;avis d&apos;un
          autre utilisateur, passez par la page publique de l&apos;activité (à brancher côté catalogue).
        </p>
      </header>

      {isLoading && <div className="review-card">Chargement des avis…</div>}
      {!isLoading && error && <div className="client-rev-error">{error}</div>}

      <form className="review-form" onSubmit={onSubmitReview}>
        <h2>Laisser un nouvel avis</h2>
        <p className="client-rev-form-hint">
          Réservations éligibles : payées et dont la date de fin de créneau est passée. Un seul avis par réservation et par
          activité.
        </p>
        <select
          value={newReview.reservationId}
          onChange={(event) =>
            setNewReview((current) => ({ ...current, reservationId: event.target.value }))
          }
        >
          <option value="">Choisir une réservation éligible</option>
          {reviewableReservations.map((reservation) => (
            <option key={reservation.id} value={reservation.id}>
              {reservation.title} — {reservation.date} (#{reservation.id})
            </option>
          ))}
        </select>
        {reviewableReservations.length === 0 && !isLoading ? (
          <p className="client-rev-form-hint muted">Aucune réservation éligible pour le moment.</p>
        ) : null}
        <select
          value={newReview.score}
          onChange={(event) =>
            setNewReview((current) => ({ ...current, score: event.target.value }))
          }
        >
          {[5, 4, 3, 2, 1].map((score) => (
            <option key={score} value={score}>
              {score} étoile{score > 1 ? 's' : ''}
            </option>
          ))}
        </select>
        <textarea
          rows={4}
          placeholder="Décrivez votre expérience (optionnel, max. 5000 caractères)…"
          value={newReview.text}
          maxLength={5000}
          onChange={(event) =>
            setNewReview((current) => ({ ...current, text: event.target.value }))
          }
        />
        <button type="submit" disabled={!newReview.reservationId}>
          Publier mon avis
        </button>
      </form>

      <div className="review-list">
        <h2 className="client-rev-list-title">Mes avis publiés ({reviewMeta.total})</h2>
        {listLoading && <p className="client-rev-form-hint">Actualisation de la liste…</p>}
        {reviews.map((review) => (
          <article key={review.id} className="review-card">
            <div className="review-top">
              <h3>{review.activity}</h3>
              <strong>{'★'.repeat(review.score)}</strong>
            </div>
            <span className={avisStatutClass(review.statut)}>{avisStatutLabel(review.statut)}</span>
            {editingReviewId === review.id ? (
              <div className="review-edit-box">
                <select
                  value={editingReview.score}
                  onChange={(event) =>
                    setEditingReview((current) => ({
                      ...current,
                      score: Number(event.target.value),
                    }))
                  }
                >
                  {[5, 4, 3, 2, 1].map((score) => (
                    <option key={score} value={score}>
                      {score} étoiles
                    </option>
                  ))}
                </select>
                <textarea
                  rows={3}
                  maxLength={5000}
                  value={editingReview.text}
                  onChange={(event) =>
                    setEditingReview((current) => ({
                      ...current,
                      text: event.target.value,
                    }))
                  }
                />
                <div className="review-crud-actions">
                  <button type="button" onClick={saveEditReview}>
                    Enregistrer
                  </button>
                  <button type="button" className="ghost" onClick={cancelEditReview}>
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <p>{review.text || <em className="muted">Pas de commentaire.</em>}</p>
            )}
            <small>
              Réservation #{review.reservationId} — {review.date}
            </small>
            {editingReviewId !== review.id && (
              <div className="review-crud-actions">
                <button type="button" onClick={() => startEditReview(review)}>
                  Modifier
                </button>
                <button type="button" className="danger" onClick={() => removeReview(review.id)}>
                  Supprimer
                </button>
              </div>
            )}
          </article>
        ))}
      </div>

      {reviewMeta.last_page > 1 && (
        <div className="client-rev-pager">
          <button
            type="button"
            disabled={reviewPage <= 1 || listLoading}
            onClick={() => changeReviewPage(Math.max(1, reviewPage - 1))}
          >
            Précédent
          </button>
          <span>
            Page {reviewMeta.current_page} / {reviewMeta.last_page}
          </span>
          <button
            type="button"
            disabled={reviewPage >= reviewMeta.last_page || listLoading}
            onClick={() => changeReviewPage(reviewPage + 1)}
          >
            Suivant
          </button>
        </div>
      )}
    </section>
  )
}
