import { useCallback, useEffect, useRef, useState } from 'react'
import { adminApi } from '../../../services/adminApi'
import './AdminPrestatairesPage.css'

function formatBytes(n) {
  if (n == null || Number.isNaN(Number(n))) return '—'
  const v = Number(n)
  if (v < 1024) return `${v} o`
  if (v < 1024 * 1024) return `${(v / 1024).toFixed(1)} Ko`
  return `${(v / 1024 / 1024).toFixed(1)} Mo`
}

const STATUT_FILTERS = [
  { value: '', label: 'Tous les statuts' },
  { value: 'en_attente_validation', label: 'En attente de validation' },
  { value: 'valide', label: 'Validé' },
  { value: 'rejete', label: 'Rejeté' },
]

function statutLabel(s) {
  const m = {
    en_attente_validation: 'En attente',
    valide: 'Validé',
    rejete: 'Rejeté',
  }
  return m[s] || s
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

export function AdminPrestatairesPage() {
  const [list, setList] = useState([])
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 })
  const [page, setPage] = useState(1)
  const [statutFilter, setStatutFilter] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [statutSubmitting, setStatutSubmitting] = useState(false)
  const [rejectTarget, setRejectTarget] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [downloadingId, setDownloadingId] = useState(null)
  const detailReqId = useRef(0)

  const loadList = useCallback(async () => {
    setError('')
    setIsLoading(true)
    try {
      const res = await adminApi.getPrestataires({
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
      const full = await adminApi.getPrestataire(row.id)
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

  const applyStatut = async (prestataireId, nextStatut) => {
    setStatutSubmitting(true)
    setError('')
    try {
      await adminApi.updatePrestataireStatut(
        prestataireId,
        nextStatut,
        nextStatut === 'rejete' ? rejectReason : '',
      )
      setRejectTarget(null)
      setRejectReason('')
      await loadList()
      if (detail && Number(detail.id) === Number(prestataireId)) {
        const refreshed = await adminApi.getPrestataire(prestataireId)
        setDetail(refreshed)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Mise à jour impossible.')
    } finally {
      setStatutSubmitting(false)
    }
  }

  const onFilterStatut = (value) => {
    setStatutFilter(value)
    setPage(1)
  }

  const docCount = (row) => {
    const fromCount = Number(row?.documents_count ?? 0)
    const fromEmbedded = Array.isArray(row?.documents) ? row.documents.length : 0
    return Number.isFinite(fromCount) && fromCount > 0
      ? fromCount
      : fromEmbedded
  }

  const canValidateWithDocs = (row) =>
    row?.statut === 'en_attente_validation' ? docCount(row) > 0 : true

  /** Exige au moins une pièce seulement pour les dossiers « en attente ». */
  const canValidateDetail = (d) => {
    if (!d) return false
    if (d.statut === 'en_attente_validation') return (d.documents?.length ?? 0) > 0
    return true
  }

  const onDownloadDoc = async (prestataireId, doc) => {
    setDownloadingId(doc.id)
    setError('')
    try {
      await adminApi.downloadPrestataireDocument(prestataireId, doc.id, doc.nom_original || 'document')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Téléchargement impossible.')
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <section className="admin-presta-page">
      <header className="admin-presta-hero">
        <div>
          <p className="admin-presta-kicker">Structures et validation</p>
          <h1 className="admin-presta-title">Prestataires</h1>
          <p className="admin-presta-lead">
            Organisations enregistrées sur la plateforme. Les prestataires déposent des{' '}
            <strong>pièces de vérification</strong> (PDF ou images) : consultez-les depuis la fiche
            avant de valider. Le <strong>bouton Valider</strong> (dossier en attente) n’est actif que
            si au moins une pièce est présente. Le statut métier vit dans la table{' '}
            <code className="admin-presta-code">prestataires</code> ; les fichiers sont stockés de
            façon privée sur le serveur.
          </p>
        </div>
      </header>

      {error ? (
        <div className="admin-presta-alert" role="alert">
          {error}
        </div>
      ) : null}

      <div className="admin-presta-toolbar">
        <label className="admin-presta-field">
          <span>Statut</span>
          <select
            value={statutFilter}
            onChange={(e) => onFilterStatut(e.target.value)}
            aria-label="Filtrer par statut prestataire"
          >
            {STATUT_FILTERS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <p className="admin-presta-count" role="status">
          {isLoading ? 'Chargement…' : `${meta.total} structure(s)`}
        </p>
      </div>

      <div className="admin-presta-table-wrap">
        <table className="admin-presta-table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Raison sociale</th>
              <th>Statut</th>
              <th>Activités</th>
              <th>Pièces</th>
              <th>Membres</th>
              <th>Créé le</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} className="admin-presta-empty">
                  Chargement…
                </td>
              </tr>
            ) : list.length === 0 ? (
              <tr>
                <td colSpan={8} className="admin-presta-empty">
                  Aucun prestataire pour ce filtre.
                </td>
              </tr>
            ) : (
              list.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.nom}</strong>
                  </td>
                  <td className="admin-presta-muted">{row.raison_sociale || '—'}</td>
                  <td>
                    <span
                      className={`admin-presta-pill admin-presta-pill--${row.statut || 'en_attente_validation'}`}
                    >
                      {statutLabel(row.statut)}
                    </span>
                  </td>
                  <td>{row.activites_count ?? 0}</td>
                  <td>
                    {docCount(row) === 0 ? (
                      <span
                        className={
                          row.statut === 'en_attente_validation'
                            ? 'admin-presta-docs-warn'
                            : 'admin-presta-muted'
                        }
                      >
                        Rien à télécharger
                      </span>
                    ) : (
                      <span>{docCount(row)}</span>
                    )}
                  </td>
                  <td>{row.users_count ?? 0}</td>
                  <td>{formatDate(row.created_at)}</td>
                  <td className="admin-presta-actions">
                    {row.statut === 'en_attente_validation' ? (
                      <>
                        <button
                          type="button"
                          className="admin-presta-btn success"
                          disabled={statutSubmitting || !canValidateWithDocs(row)}
                          title={
                            !canValidateWithDocs(row)
                              ? 'Au moins une pièce de vérification est requise avant validation.'
                              : undefined
                          }
                          onClick={() => applyStatut(row.id, 'valide')}
                        >
                          Valider
                        </button>
                        <button
                          type="button"
                          className="admin-presta-btn danger"
                          disabled={statutSubmitting}
                          onClick={() => {
                            setRejectTarget(row)
                            setRejectReason('')
                          }}
                        >
                          Rejeter
                        </button>
                      </>
                    ) : null}
                    <button
                      type="button"
                      className="admin-presta-btn ghost"
                      onClick={() => openDetail(row)}
                    >
                      Fiche
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {meta.last_page > 1 ? (
        <nav className="admin-presta-pagination" aria-label="Pagination">
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
        <div className="admin-presta-drawer-backdrop" role="presentation" onClick={closeDetail}>
          <aside
            className="admin-presta-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="presta-detail-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" className="admin-presta-drawer-close" onClick={closeDetail}>
              Fermer
            </button>
            {detailLoading ? (
              <p>Chargement…</p>
            ) : detail ? (
              <>
                <h2 id="presta-detail-title">{detail.nom}</h2>
                <dl className="admin-presta-dl">
                  <div>
                    <dt>Raison sociale</dt>
                    <dd>{detail.raison_sociale || '—'}</dd>
                  </div>
                  <div>
                    <dt>Numéro fiscal</dt>
                    <dd>{detail.numero_fiscal || '—'}</dd>
                  </div>
                  <div>
                    <dt>Statut</dt>
                    <dd>
                      <span
                        className={`admin-presta-pill admin-presta-pill--${detail.statut || 'en_attente_validation'}`}
                      >
                        {statutLabel(detail.statut)}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt>Validé le</dt>
                    <dd>{formatDate(detail.valide_le)}</dd>
                  </div>
                  <div>
                    <dt>Motif de rejet</dt>
                    <dd>{detail.motif_rejet || '—'}</dd>
                  </div>
                  <div>
                    <dt>Activités</dt>
                    <dd>{detail.activites_count ?? 0}</dd>
                  </div>
                  <div>
                    <dt>Membres</dt>
                    <dd>{detail.users?.length ?? detail.users_count ?? 0}</dd>
                  </div>
                </dl>
                {detail.users?.length ? (
                  <div className="admin-presta-members">
                    <h3>Comptes liés</h3>
                    <ul>
                      {detail.users.map((u) => (
                        <li key={u.id}>
                          {u.name}{' '}
                          <span className="admin-presta-muted">
                            ({u.email})
                            {u.pivot?.role_membre ? ` — ${u.pivot.role_membre}` : ''}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <div className="admin-presta-docs">
                  <h3>Pièces de vérification</h3>
                  {detail.statut === 'en_attente_validation' &&
                  (detail.documents?.length ?? 0) === 0 ? (
                    <p className="admin-presta-docs-hint">
                      Aucune pièce jointe pour l’instant. Le prestataire doit en déposer depuis ses
                      paramètres avant que vous puissiez valider le dossier.
                    </p>
                  ) : null}
                  {detail.documents?.length ? (
                    <ul className="admin-presta-docs-list">
                      {detail.documents.map((doc) => (
                        <li key={doc.id}>
                          <div className="admin-presta-docs-meta">
                            <span className="admin-presta-docs-name">
                              {doc.libelle ? `${doc.libelle} — ` : ''}
                              {doc.nom_original}
                            </span>
                            <span className="admin-presta-muted">
                              {formatBytes(doc.taille_octets)} · {formatDate(doc.created_at)}
                            </span>
                          </div>
                          <button
                            type="button"
                            className="admin-presta-btn ghost"
                            disabled={downloadingId === doc.id}
                            onClick={() => onDownloadDoc(detail.id, doc)}
                          >
                            {downloadingId === doc.id ? '…' : 'Télécharger'}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="admin-presta-docs-empty" role="status">
                      Rien à télécharger
                    </p>
                  )}
                </div>
                <div className="admin-presta-drawer-actions">
                  {detail.statut !== 'valide' ? (
                    <button
                      type="button"
                      className="admin-presta-btn success"
                      disabled={statutSubmitting || !canValidateDetail(detail)}
                      title={
                        !canValidateDetail(detail)
                          ? 'Au moins une pièce de vérification est requise avant validation.'
                          : undefined
                      }
                      onClick={() => applyStatut(detail.id, 'valide')}
                    >
                      Valider le dossier
                    </button>
                  ) : null}
                  {detail.statut !== 'rejete' ? (
                    <button
                      type="button"
                      className="admin-presta-btn danger"
                      disabled={statutSubmitting}
                      onClick={() => {
                        setRejectTarget(detail)
                        setRejectReason('')
                      }}
                    >
                      Rejeter
                    </button>
                  ) : null}
                  {detail.statut !== 'en_attente_validation' ? (
                    <button
                      type="button"
                      className="admin-presta-btn ghost"
                      disabled={statutSubmitting}
                      onClick={() => applyStatut(detail.id, 'en_attente_validation')}
                    >
                      Remettre en attente
                    </button>
                  ) : null}
                </div>
              </>
            ) : null}
          </aside>
        </div>
      ) : null}

      {rejectTarget ? (
        <div className="admin-presta-modal-backdrop" role="presentation">
          <div className="admin-presta-modal" role="dialog" aria-modal="true" aria-labelledby="reject-title">
            <h2 id="reject-title">Rejeter le dossier</h2>
            <p className="admin-presta-modal-text">
              Le prestataire <strong>{rejectTarget.nom}</strong> passera au statut{' '}
              <strong>rejeté</strong>. Les membres en seront informés via le journal de notifications.
            </p>
            <label className="admin-presta-field">
              <span>Motif de rejet (obligatoire)</span>
              <textarea
                rows={4}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Expliquez les corrections attendues (documents, incohérences, etc.)."
              />
            </label>
            <div className="admin-presta-modal-actions">
              <button
                type="button"
                className="admin-presta-btn ghost"
                disabled={statutSubmitting}
                onClick={() => {
                  setRejectTarget(null)
                  setRejectReason('')
                }}
              >
                Annuler
              </button>
              <button
                type="button"
                className="admin-presta-btn danger"
                disabled={statutSubmitting || !rejectReason.trim()}
                onClick={() => applyStatut(rejectTarget.id, 'rejete')}
              >
                {statutSubmitting ? 'Envoi…' : 'Confirmer le refus'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
