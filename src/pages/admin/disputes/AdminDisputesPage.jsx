import { useCallback, useEffect, useState } from 'react'
import { adminApi } from '../../../services/adminApi'
import './AdminDisputesPage.css'

const STATUT_FILTERS = [
  { value: '', label: 'Tous les statuts' },
  { value: 'ouvert', label: 'Ouvert' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'ferme', label: 'Ferme' },
]

function statutLabel(s) {
  if (s === 'en_cours') return 'En cours'
  if (s === 'ferme') return 'Ferme'
  return 'Ouvert'
}

function formatDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return '—'
  }
}

export function AdminDisputesPage() {
  const [rows, setRows] = useState([])
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 })
  const [page, setPage] = useState(1)
  const [statut, setStatut] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [messageText, setMessageText] = useState('')
  const [internalOnly, setInternalOnly] = useState(false)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [editForm, setEditForm] = useState({ statut: 'ouvert', priorite: 'normale', resolution: '' })

  const loadList = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await adminApi.getLitiges({ page, statut: statut || undefined })
      setRows(Array.isArray(res.data) ? res.data : [])
      setMeta({
        current_page: res.current_page ?? 1,
        last_page: res.last_page ?? 1,
        total: res.total ?? 0,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chargement des litiges impossible.')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [page, statut])

  useEffect(() => {
    loadList()
  }, [loadList])

  const openDetail = async (id) => {
    setDetailLoading(true)
    setError('')
    try {
      const data = await adminApi.getLitige(id)
      setDetail(data)
      setEditForm({
        statut: data.statut || 'ouvert',
        priorite: data.priorite || 'normale',
        resolution: data.resolution || '',
      })
      setMessageText('')
      setInternalOnly(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Detail indisponible.')
    } finally {
      setDetailLoading(false)
    }
  }

  const saveLitige = async () => {
    if (!detail) return
    setSaving(true)
    setError('')
    try {
      const updated = await adminApi.updateLitige(detail.id, editForm)
      setDetail((d) => ({ ...(d || {}), ...updated }))
      await loadList()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Mise a jour impossible.')
    } finally {
      setSaving(false)
    }
  }

  const sendMessage = async () => {
    if (!detail || !messageText.trim()) return
    setSendingMessage(true)
    setError('')
    try {
      if (internalOnly) {
        await adminApi.sendLitigeInternalMessage(detail.id, messageText.trim())
      } else {
        await adminApi.sendLitigeMessage(detail.id, messageText.trim())
      }
      const refreshed = await adminApi.getLitige(detail.id)
      setDetail(refreshed)
      setMessageText('')
      setInternalOnly(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Envoi du message impossible.')
    } finally {
      setSendingMessage(false)
    }
  }

  return (
    <section className="admin-disp-page">
      <header className="admin-disp-hero">
        <p className="admin-disp-kicker">Conformite</p>
        <h1 className="admin-disp-title">Litiges</h1>
        <p className="admin-disp-lead">
          Suivez les dossiers, changez leur statut/priorite et centralisez les echanges publics ou internes.
        </p>
      </header>

      <div className="admin-disp-toolbar">
        <label>
          Statut
          <select
            value={statut}
            onChange={(e) => {
              setStatut(e.target.value)
              setPage(1)
            }}
          >
            {STATUT_FILTERS.map((f) => (
              <option key={f.value || 'all'} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
        <span>{meta.total} litige(s)</span>
      </div>

      {error ? (
        <div className="admin-disp-error" role="alert">
          {error}
        </div>
      ) : null}

      <div className="admin-disp-table-wrap">
        <table className="admin-disp-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Sujet</th>
              <th>Client</th>
              <th>Prestataire</th>
              <th>Priorite</th>
              <th>Statut</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="admin-disp-empty">
                  Chargement...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="admin-disp-empty">
                  Aucun litige.
                </td>
              </tr>
            ) : (
              rows.map((item) => (
                <tr key={item.id}>
                  <td>{formatDate(item.created_at)}</td>
                  <td>{item.sujet || `Litige #${item.id}`}</td>
                  <td>
                    {item.client?.name || '—'}
                    {item.client?.email ? <small>{item.client.email}</small> : null}
                  </td>
                  <td>{item.prestataire?.nom || '—'}</td>
                  <td>{item.priorite || 'normale'}</td>
                  <td>
                    <span className={`admin-disp-pill admin-disp-pill--${item.statut || 'ouvert'}`}>
                      {statutLabel(item.statut)}
                    </span>
                  </td>
                  <td>
                    <button type="button" className="admin-disp-btn" onClick={() => openDetail(item.id)}>
                      Ouvrir
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {meta.last_page > 1 ? (
        <div className="admin-disp-pager">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            Precedent
          </button>
          <span>
            Page {meta.current_page} / {meta.last_page}
          </span>
          <button type="button" disabled={page >= meta.last_page} onClick={() => setPage((p) => p + 1)}>
            Suivant
          </button>
        </div>
      ) : null}

      {detail || detailLoading ? (
        <div className="admin-disp-modal-backdrop" role="presentation">
          <section className="admin-disp-modal" role="dialog" aria-modal="true">
            {detailLoading ? (
              <p>Chargement du dossier...</p>
            ) : detail ? (
              <>
                <div className="admin-disp-modal-head">
                  <h2>{detail.sujet || `Litige #${detail.id}`}</h2>
                  <button type="button" className="admin-disp-btn ghost" onClick={() => setDetail(null)}>
                    Fermer
                  </button>
                </div>
                <p className="admin-disp-modal-desc">{detail.description || 'Aucune description.'}</p>
                <div className="admin-disp-edit-grid">
                  <label>
                    Statut
                    <select value={editForm.statut} onChange={(e) => setEditForm((f) => ({ ...f, statut: e.target.value }))}>
                      <option value="ouvert">Ouvert</option>
                      <option value="en_cours">En cours</option>
                      <option value="ferme">Ferme</option>
                    </select>
                  </label>
                  <label>
                    Priorite
                    <select value={editForm.priorite} onChange={(e) => setEditForm((f) => ({ ...f, priorite: e.target.value }))}>
                      <option value="faible">Faible</option>
                      <option value="normale">Normale</option>
                      <option value="haute">Haute</option>
                    </select>
                  </label>
                </div>
                <label>
                  Resolution (optionnel)
                  <textarea
                    rows={3}
                    value={editForm.resolution}
                    onChange={(e) => setEditForm((f) => ({ ...f, resolution: e.target.value }))}
                  />
                </label>
                <div className="admin-disp-actions">
                  <button type="button" className="admin-disp-btn" disabled={saving} onClick={saveLitige}>
                    {saving ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                </div>

                <h3>Messages</h3>
                <div className="admin-disp-messages">
                  {(detail.messages || []).map((m) => (
                    <article key={m.id} className={m.interne_admin ? 'admin-disp-msg is-internal' : 'admin-disp-msg'}>
                      <header>
                        <strong>{m.auteur?.name || 'Auteur'}</strong>
                        <span>{m.auteur?.role || '—'}</span>
                        <time>{formatDate(m.created_at)}</time>
                      </header>
                      <p>{m.message}</p>
                    </article>
                  ))}
                  {!(detail.messages || []).length ? <p className="admin-disp-empty">Aucun message.</p> : null}
                </div>
                <label>
                  Ajouter un message
                  <textarea rows={3} value={messageText} onChange={(e) => setMessageText(e.target.value)} />
                </label>
                <label className="admin-disp-check">
                  <input type="checkbox" checked={internalOnly} onChange={(e) => setInternalOnly(e.target.checked)} />
                  Message interne admin uniquement
                </label>
                <div className="admin-disp-actions">
                  <button type="button" className="admin-disp-btn" disabled={sendingMessage} onClick={sendMessage}>
                    {sendingMessage ? 'Envoi...' : 'Envoyer'}
                  </button>
                </div>
              </>
            ) : null}
          </section>
        </div>
      ) : null}
    </section>
  )
}
