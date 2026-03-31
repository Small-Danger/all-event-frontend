import { useCallback, useEffect, useMemo, useState } from 'react'
import { adminApi } from '../../../services/adminApi'
import './AdminCommissionsPage.css'

function money(value) {
  return `${Number(value || 0).toLocaleString('fr-FR')} MAD`
}

function formatDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return '—'
  }
}

function remboursementLabel(statut) {
  if (statut === 'accepte') return 'Accepte'
  if (statut === 'refuse') return 'Refuse'
  return 'En attente'
}

export function AdminCommissionsPage() {
  const [tab, setTab] = useState('regles')
  const [regles, setRegles] = useState([])
  const [reglesMeta, setReglesMeta] = useState({ current_page: 1, last_page: 1, total: 0 })
  const [reglesPage, setReglesPage] = useState(1)
  const [commissions, setCommissions] = useState([])
  const [commMeta, setCommMeta] = useState({ current_page: 1, last_page: 1, total: 0 })
  const [commPage, setCommPage] = useState(1)
  const [remboursements, setRemboursements] = useState([])
  const [rembMeta, setRembMeta] = useState({ current_page: 1, last_page: 1, total: 0 })
  const [rembPage, setRembPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionId, setActionId] = useState(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [newRegle, setNewRegle] = useState({
    prestataire_id: '',
    taux_pourcent: '',
    debut_effet: '',
    fin_effet: '',
  })
  const [createSubmitting, setCreateSubmitting] = useState(false)

  const loadRegles = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await adminApi.getCommissionRegles({ page: reglesPage })
      setRegles(Array.isArray(res.data) ? res.data : [])
      setReglesMeta({
        current_page: res.current_page ?? 1,
        last_page: res.last_page ?? 1,
        total: res.total ?? 0,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chargement des regles impossible.')
      setRegles([])
    } finally {
      setLoading(false)
    }
  }, [reglesPage])

  const loadCommissions = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await adminApi.getCommissions({ page: commPage })
      setCommissions(Array.isArray(res.data) ? res.data : [])
      setCommMeta({
        current_page: res.current_page ?? 1,
        last_page: res.last_page ?? 1,
        total: res.total ?? 0,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chargement des commissions impossible.')
      setCommissions([])
    } finally {
      setLoading(false)
    }
  }, [commPage])

  const loadRemboursements = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await adminApi.getRemboursements({ page: rembPage })
      setRemboursements(Array.isArray(res.data) ? res.data : [])
      setRembMeta({
        current_page: res.current_page ?? 1,
        last_page: res.last_page ?? 1,
        total: res.total ?? 0,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chargement des remboursements impossible.')
      setRemboursements([])
    } finally {
      setLoading(false)
    }
  }, [rembPage])

  useEffect(() => {
    if (tab === 'regles') loadRegles()
    else if (tab === 'commissions') loadCommissions()
    else loadRemboursements()
  }, [tab, loadRegles, loadCommissions, loadRemboursements])

  const kpis = useMemo(() => {
    const totalCommissions = commissions.reduce((sum, c) => sum + Number(c.montant || 0), 0)
    const totalRemboursements = remboursements
      .filter((r) => r.statut === 'accepte')
      .reduce((sum, r) => sum + Number(r.montant || r.paiement?.montant || 0), 0)
    const rembPending = remboursements.filter((r) => r.statut === 'en_attente').length
    return { totalCommissions, totalRemboursements, rembPending }
  }, [commissions, remboursements])

  const submitNewRegle = async (event) => {
    event.preventDefault()
    const pid = Number(newRegle.prestataire_id)
    const taux = Number(newRegle.taux_pourcent)
    if (!pid || Number.isNaN(taux) || taux < 0 || taux > 100 || !newRegle.debut_effet) {
      setError('Prestataire, taux (0-100) et date de debut sont obligatoires.')
      return
    }
    setCreateSubmitting(true)
    setError('')
    try {
      await adminApi.createCommissionRegle({
        prestataire_id: pid,
        taux_pourcent: taux,
        debut_effet: newRegle.debut_effet,
        fin_effet: newRegle.fin_effet || null,
      })
      setCreateOpen(false)
      setNewRegle({ prestataire_id: '', taux_pourcent: '', debut_effet: '', fin_effet: '' })
      await loadRegles()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Creation de regle impossible.')
    } finally {
      setCreateSubmitting(false)
    }
  }

  const traiterRemboursement = async (id, statut) => {
    setActionId(id)
    setError('')
    try {
      await adminApi.traiterRemboursement(id, statut)
      await loadRemboursements()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Traitement impossible.')
    } finally {
      setActionId(null)
    }
  }

  return (
    <section className="admin-com-page">
      <header className="admin-com-hero">
        <p className="admin-com-kicker">Finance</p>
        <h1 className="admin-com-title">Commissions & remboursements</h1>
        <p className="admin-com-lead">
          Pilotez les regles de commission prestataire, suivez les montants preleves et traitez les
          remboursements clients.
        </p>
      </header>

      <div className="admin-com-kpis">
        <article>
          <span>Commissions (page)</span>
          <strong>{money(kpis.totalCommissions)}</strong>
        </article>
        <article>
          <span>Remboursements acceptes (page)</span>
          <strong>{money(kpis.totalRemboursements)}</strong>
        </article>
        <article>
          <span>Remboursements en attente</span>
          <strong>{kpis.rembPending}</strong>
        </article>
      </div>

      <div className="admin-com-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'regles'}
          className={tab === 'regles' ? 'admin-com-tab active' : 'admin-com-tab'}
          onClick={() => {
            setTab('regles')
            setReglesPage(1)
          }}
        >
          Regles
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'commissions'}
          className={tab === 'commissions' ? 'admin-com-tab active' : 'admin-com-tab'}
          onClick={() => {
            setTab('commissions')
            setCommPage(1)
          }}
        >
          Commissions
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'remboursements'}
          className={tab === 'remboursements' ? 'admin-com-tab active' : 'admin-com-tab'}
          onClick={() => {
            setTab('remboursements')
            setRembPage(1)
          }}
        >
          Remboursements
        </button>
      </div>

      {error ? (
        <div className="admin-com-error" role="alert">
          {error}
        </div>
      ) : null}

      {tab === 'regles' ? (
        <>
          <div className="admin-com-toolbar">
            <button type="button" className="admin-com-btn" onClick={() => setCreateOpen(true)}>
              + Nouvelle regle
            </button>
            <span>{reglesMeta.total} regle(s)</span>
          </div>
          <div className="admin-com-table-wrap">
            <table className="admin-com-table">
              <thead>
                <tr>
                  <th>Prestataire</th>
                  <th>Taux</th>
                  <th>Debut</th>
                  <th>Fin</th>
                  <th>Creation</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="admin-com-empty">
                      Chargement...
                    </td>
                  </tr>
                ) : regles.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="admin-com-empty">
                      Aucune regle commission.
                    </td>
                  </tr>
                ) : (
                  regles.map((r) => (
                    <tr key={r.id}>
                      <td>{r.prestataire?.nom || `Prestataire #${r.prestataire_id}`}</td>
                      <td>{Number(r.taux_pourcent || 0)}%</td>
                      <td>{formatDate(r.debut_effet)}</td>
                      <td>{formatDate(r.fin_effet)}</td>
                      <td>{formatDate(r.created_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {reglesMeta.last_page > 1 ? (
            <div className="admin-com-pager">
              <button type="button" disabled={reglesPage <= 1} onClick={() => setReglesPage((p) => Math.max(1, p - 1))}>
                Precedent
              </button>
              <span>
                Page {reglesMeta.current_page} / {reglesMeta.last_page}
              </span>
              <button type="button" disabled={reglesPage >= reglesMeta.last_page} onClick={() => setReglesPage((p) => p + 1)}>
                Suivant
              </button>
            </div>
          ) : null}
        </>
      ) : null}

      {tab === 'commissions' ? (
        <>
          <div className="admin-com-table-wrap">
            <table className="admin-com-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Prestataire</th>
                  <th>Montant commission</th>
                  <th>Taux applique</th>
                  <th>Paiement source</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="admin-com-empty">
                      Chargement...
                    </td>
                  </tr>
                ) : commissions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="admin-com-empty">
                      Aucune commission.
                    </td>
                  </tr>
                ) : (
                  commissions.map((c) => (
                    <tr key={c.id}>
                      <td>{formatDate(c.created_at)}</td>
                      <td>{c.prestataire?.nom || `Prestataire #${c.prestataire_id}`}</td>
                      <td>{money(c.montant)}</td>
                      <td>{Number(c.taux_applique || 0)}%</td>
                      <td>
                        {c.paiement?.id ? `Paiement #${c.paiement.id}` : '—'} ·{' '}
                        {money(c.paiement?.montant || 0)} · {c.paiement?.statut || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {commMeta.last_page > 1 ? (
            <div className="admin-com-pager">
              <button type="button" disabled={commPage <= 1} onClick={() => setCommPage((p) => Math.max(1, p - 1))}>
                Precedent
              </button>
              <span>
                Page {commMeta.current_page} / {commMeta.last_page}
              </span>
              <button type="button" disabled={commPage >= commMeta.last_page} onClick={() => setCommPage((p) => p + 1)}>
                Suivant
              </button>
            </div>
          ) : null}
        </>
      ) : null}

      {tab === 'remboursements' ? (
        <>
          <div className="admin-com-table-wrap">
            <table className="admin-com-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Demandeur</th>
                  <th>Montant</th>
                  <th>Reservation</th>
                  <th>Statut</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="admin-com-empty">
                      Chargement...
                    </td>
                  </tr>
                ) : remboursements.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="admin-com-empty">
                      Aucun remboursement.
                    </td>
                  </tr>
                ) : (
                  remboursements.map((r) => (
                    <tr key={r.id}>
                      <td>{formatDate(r.created_at)}</td>
                      <td>
                        {r.demandeur?.name || '—'}
                        {r.demandeur?.email ? <small>{r.demandeur.email}</small> : null}
                      </td>
                      <td>{money(r.montant || r.paiement?.montant || 0)}</td>
                      <td>
                        {r.reservation?.id ? `#${r.reservation.id}` : '—'} ·{' '}
                        {r.reservation?.statut || '—'}
                      </td>
                      <td>
                        <span className={`admin-com-pill admin-com-pill--${r.statut || 'en_attente'}`}>
                          {remboursementLabel(r.statut)}
                        </span>
                      </td>
                      <td>
                        {r.statut === 'en_attente' ? (
                          <div className="admin-com-actions">
                            <button
                              type="button"
                              disabled={actionId === r.id}
                              onClick={() => traiterRemboursement(r.id, 'accepte')}
                            >
                              Accepter
                            </button>
                            <button
                              type="button"
                              className="danger"
                              disabled={actionId === r.id}
                              onClick={() => traiterRemboursement(r.id, 'refuse')}
                            >
                              Refuser
                            </button>
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {rembMeta.last_page > 1 ? (
            <div className="admin-com-pager">
              <button type="button" disabled={rembPage <= 1} onClick={() => setRembPage((p) => Math.max(1, p - 1))}>
                Precedent
              </button>
              <span>
                Page {rembMeta.current_page} / {rembMeta.last_page}
              </span>
              <button type="button" disabled={rembPage >= rembMeta.last_page} onClick={() => setRembPage((p) => p + 1)}>
                Suivant
              </button>
            </div>
          ) : null}
        </>
      ) : null}

      {createOpen ? (
        <div className="admin-com-modal-backdrop" role="presentation">
          <form className="admin-com-modal" onSubmit={submitNewRegle}>
            <h2>Nouvelle regle de commission</h2>
            <label>
              Prestataire ID
              <input
                type="number"
                min="1"
                value={newRegle.prestataire_id}
                onChange={(e) => setNewRegle((f) => ({ ...f, prestataire_id: e.target.value }))}
                required
              />
            </label>
            <label>
              Taux (%)
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={newRegle.taux_pourcent}
                onChange={(e) => setNewRegle((f) => ({ ...f, taux_pourcent: e.target.value }))}
                required
              />
            </label>
            <label>
              Debut effet
              <input
                type="date"
                value={newRegle.debut_effet}
                onChange={(e) => setNewRegle((f) => ({ ...f, debut_effet: e.target.value }))}
                required
              />
            </label>
            <label>
              Fin effet (optionnel)
              <input
                type="date"
                value={newRegle.fin_effet}
                onChange={(e) => setNewRegle((f) => ({ ...f, fin_effet: e.target.value }))}
              />
            </label>
            <div className="admin-com-modal-actions">
              <button type="button" onClick={() => setCreateOpen(false)} disabled={createSubmitting}>
                Annuler
              </button>
              <button type="submit" disabled={createSubmitting}>
                {createSubmitting ? 'Creation...' : 'Creer'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  )
}
