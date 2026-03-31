import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { adminApi } from '../../../services/adminApi'
import './AdminReviewsPage.css'

const AVIS_STATUTS = [
  { value: '', label: 'Tous les statuts' },
  { value: 'visible', label: 'Visible' },
  { value: 'masque', label: 'Masqué' },
  { value: 'en_attente_moderation', label: 'En attente modération' },
]

const SIGNAL_STATUTS = [
  { value: '', label: 'Tous' },
  { value: 'en_attente', label: 'En attente' },
]

const LITIGE_STATUTS = [
  { value: '', label: 'Tous' },
  { value: 'ouvert', label: 'Ouvert' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'ferme', label: 'Fermé' },
]

function avisStatutLabel(s) {
  if (s === 'visible') return 'Visible'
  if (s === 'masque') return 'Masqué'
  if (s === 'en_attente_moderation') return 'Att. modération'
  return s || '—'
}

function signalStatutLabel(s) {
  if (s === 'en_attente') return 'En attente'
  return s || '—'
}

function formatDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return '—'
  }
}

export function AdminReviewsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const tab =
    tabParam === 'signalements' || tabParam === 'litiges' ? tabParam : 'avis'
  const setTab = (value) => {
    if (value === 'signalements' || value === 'litiges') {
      setSearchParams({ tab: value }, { replace: true })
    } else {
      setSearchParams({}, { replace: true })
    }
  }
  const [avisList, setAvisList] = useState([])
  const [avisMeta, setAvisMeta] = useState({ current_page: 1, last_page: 1, total: 0 })
  const [avisPage, setAvisPage] = useState(1)
  const [avisStatutFilter, setAvisStatutFilter] = useState('')

  const [sigList, setSigList] = useState([])
  const [sigMeta, setSigMeta] = useState({ current_page: 1, last_page: 1, total: 0 })
  const [sigPage, setSigPage] = useState(1)
  const [sigStatutFilter, setSigStatutFilter] = useState('en_attente')

  const [litList, setLitList] = useState([])
  const [litMeta, setLitMeta] = useState({ current_page: 1, last_page: 1, total: 0 })
  const [litPage, setLitPage] = useState(1)
  const [litStatutFilter, setLitStatutFilter] = useState('')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionId, setActionId] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)
  const [pendingSigTotal, setPendingSigTotal] = useState(0)

  const loadAvis = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const res = await adminApi.getReviews({
        page: avisPage,
        statut: avisStatutFilter || undefined,
      })
      setAvisList(Array.isArray(res.data) ? res.data : [])
      setAvisMeta({
        current_page: res.current_page ?? 1,
        last_page: res.last_page ?? 1,
        total: res.total ?? 0,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chargement impossible.')
      setAvisList([])
    } finally {
      setLoading(false)
    }
  }, [avisPage, avisStatutFilter])

  const loadSignalements = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const res = await adminApi.getReviewSignalements({
        page: sigPage,
        statut: sigStatutFilter || undefined,
      })
      setSigList(Array.isArray(res.data) ? res.data : [])
      setSigMeta({
        current_page: res.current_page ?? 1,
        last_page: res.last_page ?? 1,
        total: res.total ?? 0,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chargement impossible.')
      setSigList([])
    } finally {
      setLoading(false)
    }
  }, [sigPage, sigStatutFilter])

  const loadLitiges = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const res = await adminApi.getLitiges({
        page: litPage,
        statut: litStatutFilter || undefined,
      })
      setLitList(Array.isArray(res.data) ? res.data : [])
      setLitMeta({
        current_page: res.current_page ?? 1,
        last_page: res.last_page ?? 1,
        total: res.total ?? 0,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chargement impossible.')
      setLitList([])
    } finally {
      setLoading(false)
    }
  }, [litPage, litStatutFilter])

  useEffect(() => {
    if (tab === 'avis') loadAvis()
    else if (tab === 'signalements') loadSignalements()
    else loadLitiges()
  }, [tab, loadAvis, loadSignalements, loadLitiges])

  useEffect(() => {
    let active = true
    adminApi
      .getReviewSignalements({ page: 1, statut: 'en_attente' })
      .then((res) => {
        if (!active) return
        setPendingSigTotal(res.total ?? 0)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  const patchStatut = async (avisId, statut, reload = null) => {
    const reloadTab = reload ?? tab
    setActionId(avisId)
    setError('')
    try {
      await adminApi.updateReviewStatut(avisId, statut)
      if (reloadTab === 'signalements') {
        await loadSignalements()
        const res = await adminApi.getReviewSignalements({ page: 1, statut: 'en_attente' })
        setPendingSigTotal(res.total ?? 0)
      } else await loadAvis()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Mise à jour impossible.')
    } finally {
      setActionId(null)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    const id = deleteTarget.id
    setDeleteSubmitting(true)
    setError('')
    try {
      await adminApi.deleteReview(id)
      setDeleteTarget(null)
      await loadAvis()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Suppression impossible.')
    } finally {
      setDeleteSubmitting(false)
    }
  }

  const masquerDepuisSignalement = async (avisId) => {
    if (!avisId) return
    setActionId(avisId)
    setError('')
    try {
      await adminApi.updateReviewStatut(avisId, 'masque')
      await loadSignalements()
      const res = await adminApi.getReviewSignalements({ page: 1, statut: 'en_attente' })
      setPendingSigTotal(res.total ?? 0)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action impossible.')
    } finally {
      setActionId(null)
    }
  }

  const onTabAvis = () => {
    setTab('avis')
    setAvisPage(1)
  }

  const onTabSig = () => {
    setTab('signalements')
    setSigPage(1)
  }

  const onTabLit = () => {
    setTab('litiges')
    setLitPage(1)
  }

  const patchLitigeStatut = async (litigeId, statutNext) => {
    setActionId(litigeId)
    setError('')
    try {
      await adminApi.updateLitige(litigeId, { statut: statutNext })
      await loadLitiges()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Mise à jour du litige impossible.')
    } finally {
      setActionId(null)
    }
  }

  return (
    <section className="admin-rev-page">
      <header className="admin-rev-hero">
        <div>
          <p className="admin-rev-kicker">Modération</p>
          <h1 className="admin-rev-title">Avis clients</h1>
          <p className="admin-rev-lead">
            Consultez les avis, ajustez le statut d’affichage catalogue (
            <code className="admin-rev-code">visible</code> /{' '}
            <code className="admin-rev-code">masque</code> /{' '}
            <code className="admin-rev-code">en_attente_moderation</code>) et traitez la file des signalements.
            Le public ne voit que les avis <strong>visibles</strong>.
          </p>
        </div>
      </header>

      <div className="admin-rev-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'avis'}
          className={tab === 'avis' ? 'admin-rev-tab active' : 'admin-rev-tab'}
          onClick={onTabAvis}
        >
          Tous les avis
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'signalements'}
          className={tab === 'signalements' ? 'admin-rev-tab active' : 'admin-rev-tab'}
          onClick={onTabSig}
        >
          Signalements
          {pendingSigTotal > 0 && tab !== 'signalements' ? (
            <span className="admin-rev-tab-badge">{pendingSigTotal}</span>
          ) : null}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'litiges'}
          className={tab === 'litiges' ? 'admin-rev-tab active' : 'admin-rev-tab'}
          onClick={onTabLit}
        >
          Litiges
        </button>
      </div>

      {tab === 'avis' && (
        <div className="admin-rev-toolbar">
          <label className="admin-rev-filter">
            <span>Filtrer</span>
            <select
              value={avisStatutFilter}
              onChange={(e) => {
                setAvisStatutFilter(e.target.value)
                setAvisPage(1)
              }}
            >
              {AVIS_STATUTS.map((o) => (
                <option key={o.value || 'all'} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <span className="admin-rev-count">{avisMeta.total} avis</span>
        </div>
      )}

      {tab === 'signalements' && (
        <div className="admin-rev-toolbar">
          <label className="admin-rev-filter">
            <span>Statut signalement</span>
            <select
              value={sigStatutFilter}
              onChange={(e) => {
                setSigStatutFilter(e.target.value)
                setSigPage(1)
              }}
            >
              {SIGNAL_STATUTS.map((o) => (
                <option key={o.value || 'all'} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <span className="admin-rev-count">{sigMeta.total} signalement(s)</span>
        </div>
      )}

      {tab === 'litiges' && (
        <div className="admin-rev-toolbar">
          <label className="admin-rev-filter">
            <span>Statut litige</span>
            <select
              value={litStatutFilter}
              onChange={(e) => {
                setLitStatutFilter(e.target.value)
                setLitPage(1)
              }}
            >
              {LITIGE_STATUTS.map((o) => (
                <option key={o.value || 'all'} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <span className="admin-rev-count">{litMeta.total} litige(s)</span>
        </div>
      )}

      {error && (
        <div className="admin-rev-error" role="alert">
          {error}
        </div>
      )}

      {loading && <p className="admin-rev-loading">Chargement…</p>}

      {!loading && tab === 'avis' && (
        <>
          <div className="admin-rev-table-wrap">
            <table className="admin-rev-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Activité</th>
                  <th>Client</th>
                  <th>Note</th>
                  <th>Commentaire</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {avisList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="admin-rev-empty">
                      Aucun avis pour ce filtre.
                    </td>
                  </tr>
                ) : (
                  avisList.map((row) => (
                    <tr key={row.id}>
                      <td>{formatDate(row.created_at)}</td>
                      <td>{row.activite?.titre || '—'}</td>
                      <td>
                        <div className="admin-rev-user">
                          <span>{row.user?.name || '—'}</span>
                          {row.user?.email && (
                            <small className="admin-rev-mail">{row.user.email}</small>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="admin-rev-stars" aria-label={`${row.note} sur 5`}>
                          {'★'.repeat(Number(row.note) || 0)}
                          <span className="admin-rev-stars-off">{'★'.repeat(5 - (Number(row.note) || 0))}</span>
                        </span>
                      </td>
                      <td className="admin-rev-comment">{row.commentaire?.slice(0, 160) || '—'}</td>
                      <td>
                        <span className={`admin-rev-pill admin-rev-pill--${row.statut || 'visible'}`}>
                          {avisStatutLabel(row.statut)}
                        </span>
                      </td>
                      <td>
                        <div className="admin-rev-actions">
                          <select
                            className="admin-rev-select-statut"
                            value={row.statut || 'visible'}
                            disabled={actionId === row.id}
                            onChange={(e) => {
                              const v = e.target.value
                              if (v !== row.statut) patchStatut(row.id, v)
                            }}
                          >
                            <option value="visible">Visible</option>
                            <option value="masque">Masqué</option>
                            <option value="en_attente_moderation">Att. modération</option>
                          </select>
                          <button
                            type="button"
                            className="admin-rev-btn danger"
                            disabled={actionId === row.id}
                            onClick={() => setDeleteTarget(row)}
                          >
                            Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {avisMeta.last_page > 1 && (
            <div className="admin-rev-pager">
              <button
                type="button"
                className="admin-rev-pager-btn"
                disabled={avisPage <= 1}
                onClick={() => setAvisPage((p) => Math.max(1, p - 1))}
              >
                Précédent
              </button>
              <span className="admin-rev-pager-info">
                Page {avisMeta.current_page} / {avisMeta.last_page}
              </span>
              <button
                type="button"
                className="admin-rev-pager-btn"
                disabled={avisPage >= avisMeta.last_page}
                onClick={() => setAvisPage((p) => p + 1)}
              >
                Suivant
              </button>
            </div>
          )}
        </>
      )}

      {!loading && tab === 'signalements' && (
        <>
          <ul className="admin-rev-sig-list">
            {sigList.length === 0 ? (
              <li className="admin-rev-empty">Aucun signalement.</li>
            ) : (
              sigList.map((s) => (
                <li key={s.id} className="admin-rev-sig-card">
                  <div className="admin-rev-sig-head">
                    <span className={`admin-rev-pill admin-rev-pill--sig-${s.statut || 'en_attente'}`}>
                      {signalStatutLabel(s.statut)}
                    </span>
                    <time>{formatDate(s.created_at)}</time>
                  </div>
                  <p className="admin-rev-sig-motif">
                    <strong>Motif :</strong> {s.motif}
                  </p>
                  {s.details ? <p className="admin-rev-sig-details">{s.details}</p> : null}
                  <p className="admin-rev-sig-meta">
                    Signalé par <strong>{s.user?.name || '—'}</strong>
                    {s.user?.email ? ` · ${s.user.email}` : ''}
                  </p>
                  {s.avis ? (
                    <div className="admin-rev-sig-avis">
                      <p>
                        <strong>Avis ciblé</strong> — {s.avis.activite?.titre || 'Activité'} — note{' '}
                        {s.avis.note}/5
                      </p>
                      <p className="admin-rev-sig-avis-text">{s.avis.commentaire || '—'}</p>
                      <div className="admin-rev-sig-actions">
                        <button
                          type="button"
                          className="admin-rev-btn"
                          disabled={actionId === s.avis.id}
                          onClick={() => masquerDepuisSignalement(s.avis.id)}
                        >
                          Masquer l&apos;avis
                        </button>
                        <button
                          type="button"
                          className="admin-rev-btn ghost"
                          disabled={actionId === s.avis.id}
                          onClick={() => patchStatut(s.avis.id, 'visible', 'signalements')}
                        >
                          Laisser visible
                        </button>
                      </div>
                    </div>
                  ) : null}
                </li>
              ))
            )}
          </ul>
          {sigMeta.last_page > 1 && (
            <div className="admin-rev-pager">
              <button
                type="button"
                className="admin-rev-pager-btn"
                disabled={sigPage <= 1}
                onClick={() => setSigPage((p) => Math.max(1, p - 1))}
              >
                Précédent
              </button>
              <span className="admin-rev-pager-info">
                Page {sigMeta.current_page} / {sigMeta.last_page}
              </span>
              <button
                type="button"
                className="admin-rev-pager-btn"
                disabled={sigPage >= sigMeta.last_page}
                onClick={() => setSigPage((p) => p + 1)}
              >
                Suivant
              </button>
            </div>
          )}
        </>
      )}

      {!loading && tab === 'litiges' && (
        <>
          <div className="admin-rev-table-wrap">
            <table className="admin-rev-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Sujet</th>
                  <th>Client</th>
                  <th>Prestataire</th>
                  <th>Priorité</th>
                  <th>Statut</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {litList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="admin-rev-empty">
                      Aucun litige.
                    </td>
                  </tr>
                ) : (
                  litList.map((row) => (
                    <tr key={row.id}>
                      <td>{formatDate(row.created_at)}</td>
                      <td>{row.sujet || `Litige #${row.id}`}</td>
                      <td>
                        <div className="admin-rev-user">
                          <span>{row.client?.name || '—'}</span>
                          {row.client?.email ? <small className="admin-rev-mail">{row.client.email}</small> : null}
                        </div>
                      </td>
                      <td>{row.prestataire?.nom || '—'}</td>
                      <td>{row.priorite || 'normale'}</td>
                      <td>
                        <span className={`admin-rev-pill admin-rev-pill--lit-${row.statut || 'ouvert'}`}>
                          {row.statut === 'en_cours' ? 'En cours' : row.statut === 'ferme' ? 'Fermé' : 'Ouvert'}
                        </span>
                      </td>
                      <td>
                        <div className="admin-rev-actions">
                          <select
                            className="admin-rev-select-statut"
                            value={row.statut || 'ouvert'}
                            disabled={actionId === row.id}
                            onChange={(e) => {
                              const next = e.target.value
                              if (next !== row.statut) patchLitigeStatut(row.id, next)
                            }}
                          >
                            <option value="ouvert">Ouvert</option>
                            <option value="en_cours">En cours</option>
                            <option value="ferme">Fermé</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {litMeta.last_page > 1 && (
            <div className="admin-rev-pager">
              <button
                type="button"
                className="admin-rev-pager-btn"
                disabled={litPage <= 1}
                onClick={() => setLitPage((p) => Math.max(1, p - 1))}
              >
                Précédent
              </button>
              <span className="admin-rev-pager-info">
                Page {litMeta.current_page} / {litMeta.last_page}
              </span>
              <button
                type="button"
                className="admin-rev-pager-btn"
                disabled={litPage >= litMeta.last_page}
                onClick={() => setLitPage((p) => p + 1)}
              >
                Suivant
              </button>
            </div>
          )}
        </>
      )}

      {deleteTarget ? (
        <div className="admin-rev-modal-backdrop" role="presentation">
          <div className="admin-rev-modal" role="dialog" aria-modal="true" aria-labelledby="del-rev-title">
            <h2 id="del-rev-title">Supprimer l&apos;avis</h2>
            <p className="admin-rev-modal-text">
              L&apos;avis sur <strong>{deleteTarget.activite?.titre || 'cette activité'}</strong> sera supprimé
              définitivement (signalements liés en cascade selon la base).
            </p>
            <div className="admin-rev-modal-actions">
              <button
                type="button"
                className="admin-rev-btn ghost"
                disabled={deleteSubmitting}
                onClick={() => setDeleteTarget(null)}
              >
                Annuler
              </button>
              <button
                type="button"
                className="admin-rev-btn danger"
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
