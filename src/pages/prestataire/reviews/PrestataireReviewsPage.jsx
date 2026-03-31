import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { usePrestataireFlash } from '../../../context/PrestataireFlashContext'
import { PrestataireGreenBand } from '../../../layouts/PrestataireGreenBand'
import { prestataireApi } from '../../../services/prestataireApi'
import './PrestataireReviewsPage.css'

const FILTERS = [
  { value: 'all', label: 'Tous' },
  { value: 'replied', label: 'Avec réponse' },
  { value: 'pending', label: 'Sans réponse' },
]

function StarRow({ score, max = 5 }) {
  const n = Math.min(max, Math.max(0, Math.round(Number(score) || 0)))
  return (
    <span className="rev-stars" aria-label={`Note ${n} sur ${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={i < n ? 'rev-star is-on' : 'rev-star'} aria-hidden>
          ★
        </span>
      ))}
    </span>
  )
}

export function PrestataireReviewsPage() {
  const { showFlash } = usePrestataireFlash()
  const { pathname } = useLocation()
  const [reviews, setReviews] = useState([])
  const [page, setPage] = useState(1)
  const [listMeta, setListMeta] = useState({ current_page: 1, last_page: 1, total: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [replyingId, setReplyingId] = useState(null)
  const [replyText, setReplyText] = useState('')

  const loadReviews = (pageNum = page) => {
    setLoading(true)
    return prestataireApi
      .getReviews({ page: pageNum })
      .then((res) => {
        setReviews(Array.isArray(res.items) ? res.items : [])
        setListMeta({
          current_page: res.current_page ?? 1,
          last_page: res.last_page ?? 1,
          total: res.total ?? 0,
        })
        setPage(res.current_page ?? pageNum)
        setError('')
      })
      .catch((apiError) => {
        setError(apiError.message)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    let active = true
    setPage(1)
    prestataireApi
      .getReviews({ page: 1 })
      .then((res) => {
        if (!active) return
        setReviews(Array.isArray(res.items) ? res.items : [])
        setListMeta({
          current_page: res.current_page ?? 1,
          last_page: res.last_page ?? 1,
          total: res.total ?? 0,
        })
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

  const kpis = useMemo(() => {
    if (!reviews.length) {
      return { total: 0, avg: null, replied: 0, pending: 0 }
    }
    const sum = reviews.reduce((acc, r) => acc + Number(r.score || 0), 0)
    const replied = reviews.filter((r) => r.replied).length
    return {
      total: reviews.length,
      avg: Math.round((sum / reviews.length) * 10) / 10,
      replied,
      pending: reviews.length - replied,
    }
  }, [reviews])

  const visibleReviews = useMemo(() => {
    if (filter === 'all') return reviews
    if (filter === 'replied') return reviews.filter((item) => item.replied)
    return reviews.filter((item) => !item.replied)
  }, [reviews, filter])

  const startReply = (id, text = '') => {
    setReplyingId(id)
    setReplyText(text)
  }

  const cancelReply = () => {
    setReplyingId(null)
    setReplyText('')
  }

  const submitReply = async (id) => {
    if (!replyText.trim()) return
    const hadReply = reviews.find((r) => r.id === id)?.replied
    try {
      setError('')
      const updated = await prestataireApi.replyToReview(id, replyText.trim())
      if (updated) {
        setReviews((rows) => rows.map((r) => (r.id === id ? updated : r)))
        showFlash(hadReply ? 'Réponse mise à jour.' : 'Réponse publiée.')
      }
      cancelReply()
    } catch (apiError) {
      const msg = apiError.message
      setError(msg)
      showFlash(msg, 'error')
    }
  }

  const deleteReply = async (id) => {
    try {
      setError('')
      const updated = await prestataireApi.replyToReview(id, '')
      if (updated) {
        setReviews((rows) => rows.map((r) => (r.id === id ? updated : r)))
        showFlash('Réponse retirée.')
      }
    } catch (apiError) {
      const msg = apiError.message
      setError(msg)
      showFlash(msg, 'error')
    }
  }

  return (
    <section className="pro-reviews-page">
      <PrestataireGreenBand
        kicker="Réputation"
        title="Avis clients"
        subtitle="Chaque ligne correspond à la table avis : note, commentaire, statut de modération, réponse officielle du prestataire. Liste paginée (30 par page) via l’API."
        action={false}
      />

      <details className="rev-schema">
        <summary>Rappel base de données (table avis)</summary>
        <ul>
          <li>
            <strong>user_id / activite_id / reservation_id</strong> — lien client, activité notée, réservation d’origine
            (contrainte d’unicité).
          </li>
          <li>
            <strong>note</strong> (1–5), <strong>commentaire</strong>, <strong>statut</strong> (ex. visible, masqué côté
            modération).
          </li>
          <li>
            <strong>reponse_prestataire</strong>, <strong>repondu_le</strong> — réponse publique ; envoyer une chaîne vide
            retire la réponse.
          </li>
        </ul>
      </details>

      {error && (
        <div className="rev-error" role="alert">
          {error}
        </div>
      )}

      <div className="rev-kpi-grid" aria-live="polite">
        <article className="rev-kpi">
          <span className="rev-kpi-label">Sur cette page</span>
          <strong className="rev-kpi-value">{kpis.total}</strong>
        </article>
        <article className="rev-kpi rev-kpi--accent">
          <span className="rev-kpi-label">Note moy. (page)</span>
          <strong className="rev-kpi-value">{kpis.avg != null ? `${kpis.avg} / 5` : '—'}</strong>
        </article>
        <article className="rev-kpi">
          <span className="rev-kpi-label">Total avis</span>
          <strong className="rev-kpi-value">{listMeta.total}</strong>
        </article>
        <article className="rev-kpi">
          <span className="rev-kpi-label">Avec réponse</span>
          <strong className="rev-kpi-value">{kpis.replied}</strong>
        </article>
        <article className="rev-kpi">
          <span className="rev-kpi-label">Sans réponse</span>
          <strong className="rev-kpi-value">{kpis.pending}</strong>
        </article>
      </div>

      <div className="rev-filters" role="tablist" aria-label="Filtrer les avis">
        {FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={filter === item.value}
            className={filter === item.value ? 'rev-filter-btn active' : 'rev-filter-btn'}
            onClick={() => setFilter(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="rev-skeleton-wrap" aria-hidden>
          {[1, 2, 3].map((i) => (
            <div key={i} className="rev-skeleton-card" />
          ))}
        </div>
      )}

      {!loading && visibleReviews.length === 0 && (
        <article className="rev-empty">
          <div className="rev-empty-icon" aria-hidden />
          <h3 className="rev-empty-title">Aucun avis</h3>
          <p className="rev-empty-text">
            Aucun avis ne correspond à ce filtre, ou vous n’avez pas encore de retours clients sur vos activités.
          </p>
          <button type="button" className="rev-empty-cta" onClick={() => loadReviews(1)}>
            Actualiser
          </button>
        </article>
      )}

      {!loading && visibleReviews.length > 0 && (
        <ul className="rev-card-list">
          {visibleReviews.map((item) => (
            <li key={item.id}>
              <article className="rev-card">
                <header className="rev-card-head">
                  <div>
                    <p className="rev-card-activity">{item.activityTitle}</p>
                    {item.activityCity && (
                      <p className="rev-card-city">{item.activityCity}</p>
                    )}
                  </div>
                  <div className="rev-card-head-right">
                    <StarRow score={item.score} />
                    {item.statut && item.statut !== 'visible' && (
                      <span className="rev-statut-pill">{item.statut}</span>
                    )}
                  </div>
                </header>

                <div className="rev-client-row">
                  <strong className="rev-client-name">{item.client}</strong>
                  {item.clientEmail && (
                    <a className="rev-client-mail" href={`mailto:${item.clientEmail}`}>
                      {item.clientEmail}
                    </a>
                  )}
                  <time className="rev-date" dateTime={item.date}>
                    {item.date}
                  </time>
                </div>

                <blockquote className="rev-comment">{item.text || '—'}</blockquote>

                {item.replied && item.replyText && (
                  <div className="rev-reply-block">
                    <span className="rev-reply-label">Votre réponse</span>
                    <p className="rev-reply-text">{item.replyText}</p>
                    {item.reponduLe && (
                      <span className="rev-reply-meta">
                        {String(item.reponduLe).slice(0, 16).replace('T', ' ')}
                      </span>
                    )}
                  </div>
                )}

                <div className="rev-actions">
                  {item.replied ? (
                    <>
                      <button type="button" className="rev-btn rev-btn--primary" onClick={() => startReply(item.id, item.replyText)}>
                        Modifier la réponse
                      </button>
                      <button type="button" className="rev-btn rev-btn--danger" onClick={() => deleteReply(item.id)}>
                        Retirer la réponse
                      </button>
                    </>
                  ) : (
                    <button type="button" className="rev-btn rev-btn--primary" onClick={() => startReply(item.id)}>
                      Répondre
                    </button>
                  )}
                </div>

                {replyingId === item.id && (
                  <div className="rev-reply-editor">
                    <label className="rev-reply-editor-label" htmlFor={`reply-${item.id}`}>
                      Réponse au client (max. 5000 caractères)
                    </label>
                    <textarea
                      id={`reply-${item.id}`}
                      rows={4}
                      maxLength={5000}
                      placeholder="Merci pour votre retour…"
                      value={replyText}
                      onChange={(event) => setReplyText(event.target.value)}
                    />
                    <div className="rev-reply-editor-actions">
                      <button type="button" className="rev-btn-submit" onClick={() => submitReply(item.id)}>
                        {item.replied ? 'Enregistrer' : 'Publier la réponse'}
                      </button>
                      <button type="button" className="rev-btn-ghost" onClick={cancelReply}>
                        Annuler
                      </button>
                    </div>
                  </div>
                )}
              </article>
            </li>
          ))}
        </ul>
      )}

      {!loading && listMeta.last_page > 1 && (
        <div className="rev-pager">
          <button
            type="button"
            className="rev-pager-btn"
            disabled={page <= 1}
            onClick={() => loadReviews(Math.max(1, page - 1))}
          >
            Précédent
          </button>
          <span className="rev-pager-info">
            Page {listMeta.current_page} / {listMeta.last_page}
          </span>
          <button
            type="button"
            className="rev-pager-btn"
            disabled={page >= listMeta.last_page}
            onClick={() => loadReviews(page + 1)}
          >
            Suivant
          </button>
        </div>
      )}
    </section>
  )
}
