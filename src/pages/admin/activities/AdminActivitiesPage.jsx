import { useCallback, useEffect, useRef, useState } from 'react'
import { adminApi } from '../../../services/adminApi'
import { normalizeMediaDisplayUrl } from '../../../services/prestataireApi'
import './AdminActivitiesPage.css'

const STATUT_FILTERS = [
  { value: '', label: 'Tous les statuts' },
  { value: 'en_attente_validation', label: 'En attente de validation' },
  { value: 'brouillon', label: 'Brouillon' },
  { value: 'publiee', label: 'Publiée' },
]

function statutLabel(s) {
  if (s === 'publiee') return 'Publiée'
  if (s === 'brouillon') return 'Brouillon'
  if (s === 'en_attente_validation') return 'En attente'
  return s || '—'
}

function money(value) {
  return `${Number(value || 0).toLocaleString('fr-FR')} MAD`
}

function formatDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  } catch {
    return '—'
  }
}

function plainText(html, max = 140) {
  if (!html) return '—'
  const s = String(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  if (s.length <= max) return s
  return `${s.slice(0, max)}…`
}

export function AdminActivitiesPage() {
  const [list, setList] = useState([])
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 })
  const [page, setPage] = useState(1)
  const [statutFilter, setStatutFilter] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)
  const [rejectTarget, setRejectTarget] = useState(null)
  const [rejectSubmitting, setRejectSubmitting] = useState(false)
  const detailReqId = useRef(0)

  const loadList = useCallback(async () => {
    setError('')
    setIsLoading(true)
    try {
      const res = await adminApi.getActivities({
        page,
        statut: statutFilter || undefined,
      })
      setList(Array.isArray(res.data) ? res.data : [])
      setMeta({
        current_page: res.current_page ?? 1,
        last_page: res.last_page ?? 1,
        total: res.total ?? 0,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chargement impossible.')
      setList([])
    } finally {
      setIsLoading(false)
    }
  }, [page, statutFilter])

  useEffect(() => {
    loadList()
  }, [loadList])

  const openDetail = async (row) => {
    const req = ++detailReqId.current
    setDetail(null)
    setDetailLoading(true)
    try {
      const full = await adminApi.getActivity(row.id)
      if (detailReqId.current === req) setDetail(full)
    } catch (e) {
      if (detailReqId.current === req) {
        setError(e instanceof Error ? e.message : 'Fiche indisponible.')
      }
    } finally {
      if (detailReqId.current === req) setDetailLoading(false)
    }
  }

  const closeDetail = () => {
    detailReqId.current += 1
    setDetail(null)
    setDetailLoading(false)
  }

  const patchActivity = async (activityId, payload) => {
    setActionLoading(true)
    setError('')
    try {
      await adminApi.updateActivity(activityId, payload)
      setRejectTarget(null)
      await loadList()
      if (detail && Number(detail.id) === Number(activityId)) {
        const refreshed = await adminApi.getActivity(activityId)
        setDetail(refreshed)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Mise à jour impossible.')
    } finally {
      setActionLoading(false)
    }
  }

  const confirmReject = async () => {
    if (!rejectTarget) return
    const activityId = rejectTarget.id
    setRejectSubmitting(true)
    setError('')
    try {
      await adminApi.updateActivity(activityId, { statut: 'brouillon' })
      setRejectTarget(null)
      await loadList()
      if (detail && Number(detail.id) === Number(activityId)) {
        const refreshed = await adminApi.getActivity(activityId)
        setDetail(refreshed)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action impossible.')
    } finally {
      setRejectSubmitting(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleteSubmitting(true)
    setError('')
    try {
      await adminApi.deleteActivity(deleteTarget.id)
      setDeleteTarget(null)
      if (detail && Number(detail.id) === Number(deleteTarget.id)) closeDetail()
      await loadList()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Suppression impossible.')
    } finally {
      setDeleteSubmitting(false)
    }
  }

  const onFilterStatut = (value) => {
    setStatutFilter(value)
    setPage(1)
  }

  return (
    <section className="admin-act-page">
      <header className="admin-act-hero">
        <div>
          <p className="admin-act-kicker">Catalogue global</p>
          <h1 className="admin-act-title">Activités</h1>
          <p className="admin-act-lead">
            Vue transverse de la table <code className="admin-act-code">activites</code>. Le prestataire ne
            peut pas mettre une fiche en ligne seul : il la place en{' '}
            <strong>en attente de validation</strong> ; seul l’admin passe au statut <code>publiee</code>{' '}
            (catalogue public et client). <code>brouillon</code> = travail interne ou demande refusée. Vous
            pouvez <strong>valider</strong>, <strong>refuser</strong> (retour brouillon), retirer du catalogue
            ou <strong>supprimer</strong> (cascades métier).
          </p>
        </div>
      </header>

      {error ? (
        <div className="admin-act-alert" role="alert">
          {error}
        </div>
      ) : null}

      <div className="admin-act-toolbar">
        <label className="admin-act-field">
          <span>Statut</span>
          <select
            value={statutFilter}
            onChange={(e) => onFilterStatut(e.target.value)}
            aria-label="Filtrer par statut d’activité"
          >
            {STATUT_FILTERS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <p className="admin-act-count" role="status">
          {isLoading ? 'Chargement…' : `${meta.total} activité(s)`}
        </p>
      </div>

      <div className="admin-act-table-wrap">
        <table className="admin-act-table">
          <thead>
            <tr>
              <th>Titre</th>
              <th>Prestataire</th>
              <th>Catégorie</th>
              <th>Ville</th>
              <th>Statut</th>
              <th>Prix</th>
              <th>Créneaux</th>
              <th>Médias</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={9} className="admin-act-empty">
                  Chargement…
                </td>
              </tr>
            ) : list.length === 0 ? (
              <tr>
                <td colSpan={9} className="admin-act-empty">
                  Aucune activité pour ce filtre.
                </td>
              </tr>
            ) : (
              list.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.titre}</strong>
                    <div className="admin-act-muted admin-act-preview">{plainText(row.description, 72)}</div>
                  </td>
                  <td>{row.prestataire?.nom || '—'}</td>
                  <td>{row.categorie?.nom || '—'}</td>
                  <td>{row.ville?.nom || '—'}</td>
                  <td>
                    <span className={`admin-act-pill admin-act-pill--${row.statut || 'brouillon'}`}>
                      {statutLabel(row.statut)}
                    </span>
                  </td>
                  <td>{money(row.prix_base)}</td>
                  <td>{row.creneaux_count ?? 0}</td>
                  <td>{row.medias_count ?? 0}</td>
                  <td className="admin-act-actions">
                    {row.statut === 'en_attente_validation' ? (
                      <>
                        <button
                          type="button"
                          className="admin-act-btn success"
                          disabled={actionLoading}
                          onClick={() => patchActivity(row.id, { statut: 'publiee' })}
                        >
                          Valider
                        </button>
                        <button
                          type="button"
                          className="admin-act-btn danger"
                          disabled={actionLoading}
                          onClick={() => setRejectTarget(row)}
                        >
                          Refuser
                        </button>
                      </>
                    ) : null}
                    {row.statut === 'brouillon' ? (
                      <button
                        type="button"
                        className="admin-act-btn success"
                        disabled={actionLoading}
                        title="Publication sans demande explicite (cas exceptionnel)"
                        onClick={() => patchActivity(row.id, { statut: 'publiee' })}
                      >
                        Mettre en ligne
                      </button>
                    ) : null}
                    {row.statut === 'publiee' ? (
                      <button
                        type="button"
                        className="admin-act-btn ghost"
                        disabled={actionLoading}
                        onClick={() => patchActivity(row.id, { statut: 'brouillon' })}
                      >
                        Brouillon
                      </button>
                    ) : null}
                    <button type="button" className="admin-act-btn ghost" onClick={() => openDetail(row)}>
                      Fiche
                    </button>
                    <button
                      type="button"
                      className="admin-act-btn danger"
                      disabled={actionLoading}
                      onClick={() => setDeleteTarget(row)}
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {meta.last_page > 1 ? (
        <nav className="admin-act-pagination" aria-label="Pagination">
          <button
            type="button"
            disabled={page <= 1 || isLoading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Précédent
          </button>
          <span>
            Page {meta.current_page} / {meta.last_page}
          </span>
          <button
            type="button"
            disabled={page >= meta.last_page || isLoading}
            onClick={() => setPage((p) => p + 1)}
          >
            Suivant
          </button>
        </nav>
      ) : null}

      {detail || detailLoading ? (
        <div className="admin-act-drawer-backdrop" role="presentation" onClick={closeDetail}>
          <aside
            className="admin-act-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="act-detail-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" className="admin-act-drawer-close" onClick={closeDetail}>
              Fermer
            </button>
            {detailLoading ? (
              <p>Chargement…</p>
            ) : detail ? (
              <>
                <h2 id="act-detail-title">{detail.titre}</h2>
                <dl className="admin-act-dl">
                  <div>
                    <dt>Prestataire</dt>
                    <dd>
                      {detail.prestataire?.nom || '—'}
                      {detail.prestataire?.statut ? (
                        <span className="admin-act-muted"> ({detail.prestataire.statut})</span>
                      ) : null}
                    </dd>
                  </div>
                  <div>
                    <dt>Catégorie</dt>
                    <dd>{detail.categorie?.nom || '—'}</dd>
                  </div>
                  <div>
                    <dt>Ville</dt>
                    <dd>{detail.ville?.nom || '—'}</dd>
                  </div>
                  <div>
                    <dt>Lieu</dt>
                    <dd>{detail.lieu?.nom || '—'}</dd>
                  </div>
                  <div>
                    <dt>Statut</dt>
                    <dd>
                      <span className={`admin-act-pill admin-act-pill--${detail.statut || 'brouillon'}`}>
                        {statutLabel(detail.statut)}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt>Prix de base</dt>
                    <dd>{money(detail.prix_base)}</dd>
                  </div>
                  <div>
                    <dt>Créneaux / médias</dt>
                    <dd>
                      {detail.creneaux_count ?? 0} créneaux · {detail.medias_count ?? 0} média(s)
                    </dd>
                  </div>
                  <div>
                    <dt>Mise à jour</dt>
                    <dd>{formatDate(detail.updated_at)}</dd>
                  </div>
                </dl>
                <div className="admin-act-desc">
                  <h3>Description</h3>
                  <div className="admin-act-desc-body">{plainText(detail.description, 2000)}</div>
                </div>
                {detail.medias?.length ? (
                  <div className="admin-act-medias">
                    <h3>Visuels</h3>
                    <div className="admin-act-medias-grid">
                      {detail.medias.map((m) => {
                        const src = normalizeMediaDisplayUrl(m.url)
                        return src ? (
                          <img key={m.id} src={src} alt="" className="admin-act-thumb" loading="lazy" />
                        ) : null
                      })}
                    </div>
                  </div>
                ) : null}
                <div className="admin-act-drawer-actions">
                  {detail.statut === 'en_attente_validation' ? (
                    <>
                      <button
                        type="button"
                        className="admin-act-btn success"
                        disabled={actionLoading}
                        onClick={() => patchActivity(detail.id, { statut: 'publiee' })}
                      >
                        Valider et publier
                      </button>
                      <button
                        type="button"
                        className="admin-act-btn danger"
                        disabled={actionLoading}
                        onClick={() => setRejectTarget(detail)}
                      >
                        Refuser (brouillon)
                      </button>
                    </>
                  ) : null}
                  {detail.statut === 'brouillon' ? (
                    <button
                      type="button"
                      className="admin-act-btn success"
                      disabled={actionLoading}
                      onClick={() => patchActivity(detail.id, { statut: 'publiee' })}
                    >
                      Mettre en ligne (exception)
                    </button>
                  ) : null}
                  {detail.statut === 'publiee' ? (
                    <button
                      type="button"
                      className="admin-act-btn ghost"
                      disabled={actionLoading}
                      onClick={() => patchActivity(detail.id, { statut: 'brouillon' })}
                    >
                      Retirer du catalogue (brouillon)
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="admin-act-btn danger"
                    disabled={actionLoading}
                    onClick={() => setDeleteTarget(detail)}
                  >
                    Supprimer l’activité
                  </button>
                </div>
              </>
            ) : null}
          </aside>
        </div>
      ) : null}

      {rejectTarget ? (
        <div className="admin-act-modal-backdrop" role="presentation">
          <div className="admin-act-modal" role="dialog" aria-modal="true" aria-labelledby="reject-act-title">
            <h2 id="reject-act-title">Refuser la demande</h2>
            <p className="admin-act-modal-text">
              <strong>{rejectTarget.titre}</strong> repassera en <strong>brouillon</strong>. Le prestataire pourra
              corriger et soumettre à nouveau.
            </p>
            <div className="admin-act-modal-actions">
              <button
                type="button"
                className="admin-act-btn ghost"
                disabled={rejectSubmitting}
                onClick={() => setRejectTarget(null)}
              >
                Annuler
              </button>
              <button
                type="button"
                className="admin-act-btn danger"
                disabled={rejectSubmitting}
                onClick={confirmReject}
              >
                {rejectSubmitting ? 'Traitement…' : 'Confirmer le refus'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="admin-act-modal-backdrop" role="presentation">
          <div className="admin-act-modal" role="dialog" aria-modal="true" aria-labelledby="del-act-title">
            <h2 id="del-act-title">Supprimer l’activité</h2>
            <p className="admin-act-modal-text">
              <strong>{deleteTarget.titre}</strong> sera supprimée définitivement (créneaux, médias et liens
              associés selon les règles de la base). Cette action est irréversible.
            </p>
            <div className="admin-act-modal-actions">
              <button
                type="button"
                className="admin-act-btn ghost"
                disabled={deleteSubmitting}
                onClick={() => setDeleteTarget(null)}
              >
                Annuler
              </button>
              <button
                type="button"
                className="admin-act-btn danger"
                disabled={deleteSubmitting}
                onClick={confirmDelete}
              >
                {deleteSubmitting ? 'Suppression…' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
