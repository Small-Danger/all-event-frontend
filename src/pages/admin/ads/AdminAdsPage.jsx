import { useCallback, useEffect, useMemo, useState } from 'react'
import { adminApi } from '../../../services/adminApi'
import { normalizeMediaDisplayUrl } from '../../../services/prestataireApi'
import './AdminAdsPage.css'

const CAMPAGNE_STATUTS = [
  'brouillon',
  'en_attente_validation',
  'validee',
  'active',
  'inactive',
  'refusee',
]

function statutLabel(s) {
  if (s === 'en_attente_validation') return 'En attente'
  if (s === 'validee') return 'Validee'
  if (s === 'active') return 'Active'
  if (s === 'inactive') return 'Inactive'
  if (s === 'refusee') return 'Refusee'
  return 'Brouillon'
}

function money(value, devise = 'MAD') {
  return `${Number(value || 0).toLocaleString('fr-FR')} ${devise || 'MAD'}`
}

function formatDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return '—'
  }
}

function paymentTone(statut) {
  const s = String(statut || '').toLowerCase()
  if (s.includes('pay') || s.includes('reussi') || s.includes('success')) return 'ok'
  if (s.includes('attente') || s.includes('pending')) return 'wait'
  if (s.includes('echou') || s.includes('fail') || s.includes('refus')) return 'bad'
  return 'neutral'
}

export function AdminAdsPage() {
  const [tab, setTab] = useState('campagnes')
  const [campagnes, setCampagnes] = useState([])
  const [campMeta, setCampMeta] = useState({ current_page: 1, last_page: 1, total: 0 })
  const [campPage, setCampPage] = useState(1)
  const [paiements, setPaiements] = useState([])
  const [payMeta, setPayMeta] = useState({ current_page: 1, last_page: 1, total: 0 })
  const [payPage, setPayPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionId, setActionId] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)
  const [detailCampaign, setDetailCampaign] = useState(null)

  const loadCampagnes = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await adminApi.getAdCampagnes({ page: campPage })
      setCampagnes(Array.isArray(res.data) ? res.data : [])
      setCampMeta({
        current_page: res.current_page ?? 1,
        last_page: res.last_page ?? 1,
        total: res.total ?? 0,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chargement des campagnes impossible.')
      setCampagnes([])
    } finally {
      setLoading(false)
    }
  }, [campPage])

  const loadPaiements = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await adminApi.getAdPaiements({ page: payPage })
      setPaiements(Array.isArray(res.data) ? res.data : [])
      setPayMeta({
        current_page: res.current_page ?? 1,
        last_page: res.last_page ?? 1,
        total: res.total ?? 0,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chargement des paiements impossible.')
      setPaiements([])
    } finally {
      setLoading(false)
    }
  }, [payPage])

  useEffect(() => {
    if (tab === 'campagnes') loadCampagnes()
    else loadPaiements()
  }, [tab, loadCampagnes, loadPaiements])

  const kpis = useMemo(() => {
    const total = campagnes.length
    const pending = campagnes.filter((c) => c.statut === 'en_attente_validation').length
    const active = campagnes.filter((c) => c.statut === 'active').length
    const totalBudget = campagnes.reduce((sum, c) => sum + Number(c.budget_montant || 0), 0)
    return { total, pending, active, totalBudget }
  }, [campagnes])

  const paymentStats = useMemo(() => {
    const budgetByCampaignId = new Map(
      campagnes.map((c) => [String(c.id), Number(c.budget_montant || 0)]),
    )
    const totalPaid = paiements.reduce((sum, p) => sum + Number(p.montant || 0), 0)
    const totalBudget = campagnes.reduce((sum, c) => sum + Number(c.budget_montant || 0), 0)
    let paidCount = 0
    let pendingCount = 0
    let failedCount = 0
    for (const p of paiements) {
      const tone = paymentTone(p.statut)
      if (tone === 'ok') paidCount += 1
      else if (tone === 'wait') pendingCount += 1
      else if (tone === 'bad') failedCount += 1
    }
    const byCampaignMap = new Map()
    for (const p of paiements) {
      const id = p.campagne_publicitaire_id ?? p.campagne?.id ?? `unknown-${p.id}`
      const key = String(id)
      const prev = byCampaignMap.get(key) || {
        id: key,
        title: p.campagne?.titre || `Campagne #${id}`,
        statutCampagne: p.campagne?.statut || '—',
        budget: budgetByCampaignId.get(key) ?? 0,
        total: 0,
        count: 0,
        lastDate: null,
        okCount: 0,
        waitCount: 0,
        badCount: 0,
        items: [],
      }
      prev.total += Number(p.montant || 0)
      prev.count += 1
      const tone = paymentTone(p.statut)
      if (tone === 'ok') prev.okCount += 1
      else if (tone === 'wait') prev.waitCount += 1
      else if (tone === 'bad') prev.badCount += 1
      const currentTs = p.paye_le || p.created_at || null
      if (!prev.lastDate || (currentTs && String(currentTs) > String(prev.lastDate))) {
        prev.lastDate = currentTs
      }
      prev.items.push(p)
      byCampaignMap.set(key, prev)
    }
    const byCampaign = Array.from(byCampaignMap.values())
      .map((c) => {
        const remaining = Math.max(0, Number(c.budget || 0) - Number(c.total || 0))
        let financeState = 'ok'
        if (c.badCount > 0) financeState = 'blocked'
        else if (remaining > 0) financeState = 'partial'
        return { ...c, remaining, financeState }
      })
      .sort((a, b) => b.total - a.total)
    return { totalPaid, totalBudget, paidCount, pendingCount, failedCount, byCampaign }
  }, [paiements, campagnes])

  const patchStatut = async (campagneId, statut) => {
    setActionId(campagneId)
    setError('')
    try {
      await adminApi.updateAdCampagneStatut(campagneId, statut)
      await loadCampagnes()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Mise a jour du statut impossible.')
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
      await adminApi.deleteAdCampagne(id)
      setDeleteTarget(null)
      await loadCampagnes()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Suppression impossible.')
    } finally {
      setDeleteSubmitting(false)
    }
  }

  return (
    <section className="admin-ads-page">
      <header className="admin-ads-hero">
        <p className="admin-ads-kicker">Monetisation</p>
        <h1 className="admin-ads-title">Publicites admin</h1>
        <p className="admin-ads-lead">
          Supervisez les campagnes de mise en avant (validation, activation, refus) et controlez les
          paiements publicitaires associes.
        </p>
      </header>

      <div className="admin-ads-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'campagnes'}
          className={tab === 'campagnes' ? 'admin-ads-tab active' : 'admin-ads-tab'}
          onClick={() => {
            setTab('campagnes')
            setCampPage(1)
          }}
        >
          Campagnes
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'paiements'}
          className={tab === 'paiements' ? 'admin-ads-tab active' : 'admin-ads-tab'}
          onClick={() => {
            setTab('paiements')
            setPayPage(1)
          }}
        >
          Paiements
        </button>
      </div>

      {error ? (
        <div className="admin-ads-error" role="alert">
          {error}
        </div>
      ) : null}

      {tab === 'campagnes' ? (
        <>
          <div className="admin-ads-kpis">
            <article>
              <span>Campagnes (page)</span>
              <strong>{kpis.total}</strong>
            </article>
            <article>
              <span>En attente</span>
              <strong>{kpis.pending}</strong>
            </article>
            <article>
              <span>Actives</span>
              <strong>{kpis.active}</strong>
            </article>
            <article>
              <span>Budget cumule (page)</span>
              <strong>{money(kpis.totalBudget)}</strong>
            </article>
          </div>

          <div className="admin-ads-table-wrap">
            <table className="admin-ads-table">
              <thead>
                <tr>
                  <th>Campagne</th>
                  <th>Ciblage</th>
                  <th>Periode</th>
                  <th>Budget</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="admin-ads-empty">
                      Chargement...
                    </td>
                  </tr>
                ) : campagnes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="admin-ads-empty">
                      Aucune campagne.
                    </td>
                  </tr>
                ) : (
                  campagnes.map((row) => {
                    const img = normalizeMediaDisplayUrl(row.image_url)
                    return (
                      <tr key={row.id}>
                        <td>
                          <div className="admin-ads-main">
                            {img ? <img src={img} alt="" className="admin-ads-thumb" loading="lazy" /> : null}
                            <div>
                              <strong>{row.titre || `Campagne #${row.id}`}</strong>
                              <small>{row.prestataire?.nom || 'Sans prestataire'}</small>
                              <small>Emplacement: {row.emplacement || '—'}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="admin-ads-target">
                            <span>Ville: {row.ville?.nom || 'Toutes'}</span>
                            <span>Categorie: {row.categorie?.nom || 'Toutes'}</span>
                            <span>Activite: {row.activite?.titre || 'Global'}</span>
                          </div>
                        </td>
                        <td>
                          <div className="admin-ads-target">
                            <span>Debut: {formatDate(row.debut_at)}</span>
                            <span>Fin: {formatDate(row.fin_at)}</span>
                            <span>Priorite: {Number(row.priorite ?? 0)}</span>
                          </div>
                        </td>
                        <td>{money(row.budget_montant)}</td>
                        <td>
                          <span className={`admin-ads-pill admin-ads-pill--${row.statut || 'brouillon'}`}>
                            {statutLabel(row.statut)}
                          </span>
                        </td>
                        <td>
                          <div className="admin-ads-actions">
                            <select
                              value={row.statut || 'brouillon'}
                              disabled={actionId === row.id}
                              onChange={(e) => {
                                if (e.target.value !== row.statut) {
                                  patchStatut(row.id, e.target.value)
                                }
                              }}
                            >
                              {CAMPAGNE_STATUTS.map((s) => (
                                <option key={s} value={s}>
                                  {statutLabel(s)}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              className="danger"
                              disabled={actionId === row.id}
                              onClick={() => setDeleteTarget(row)}
                            >
                              Supprimer
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {campMeta.last_page > 1 ? (
            <div className="admin-ads-pager">
              <button type="button" disabled={campPage <= 1} onClick={() => setCampPage((p) => Math.max(1, p - 1))}>
                Precedent
              </button>
              <span>
                Page {campMeta.current_page} / {campMeta.last_page}
              </span>
              <button type="button" disabled={campPage >= campMeta.last_page} onClick={() => setCampPage((p) => p + 1)}>
                Suivant
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <>
          <div className="admin-ads-pay-explain">
            <p>
              <strong>Vue finance:</strong> une ligne = une campagne. Vérifiez le triplet{' '}
              <em>Budget / Total payé / Reste</em> puis l&apos;état global pour décider rapidement.
            </p>
          </div>
          <div className="admin-ads-kpis">
            <article>
              <span>Campagnes suivies</span>
              <strong>{paymentStats.byCampaign.length}</strong>
            </article>
            <article>
              <span>Budget cumulé</span>
              <strong>{money(paymentStats.totalBudget)}</strong>
            </article>
            <article>
              <span>Total payé</span>
              <strong>{money(paymentStats.totalPaid)}</strong>
            </article>
            <article>
              <span>Transactions OK / attente / échec</span>
              <strong>
                {paymentStats.paidCount} / {paymentStats.pendingCount} / {paymentStats.failedCount}
              </strong>
            </article>
          </div>

          <div className="admin-ads-table-wrap">
            <table className="admin-ads-table">
              <thead>
                <tr>
                  <th>Campagne</th>
                  <th>Budget</th>
                  <th>Total payé</th>
                  <th>Reste</th>
                  <th>Etat finance</th>
                  <th>Dernier mouvement</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="admin-ads-empty">
                      Chargement...
                    </td>
                  </tr>
                ) : paymentStats.byCampaign.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="admin-ads-empty">
                      Aucun cumul disponible.
                    </td>
                  </tr>
                ) : (
                  paymentStats.byCampaign.map((c) => (
                    <tr key={c.id}>
                      <td>{c.title}</td>
                      <td>{money(c.budget)}</td>
                      <td>{money(c.total)}</td>
                      <td>{money(c.remaining)}</td>
                      <td>
                        {c.financeState === 'blocked' ? (
                          <span className="admin-ads-pay-pill admin-ads-pay-pill--bad">BLOQUE</span>
                        ) : c.financeState === 'partial' ? (
                          <span className="admin-ads-pay-pill admin-ads-pay-pill--wait">PARTIEL</span>
                        ) : (
                          <span className="admin-ads-pay-pill admin-ads-pay-pill--ok">OK</span>
                        )}
                      </td>
                      <td>{formatDate(c.lastDate)}</td>
                      <td>
                        <button type="button" className="admin-ads-detail-btn" onClick={() => setDetailCampaign(c)}>
                          Voir detail
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {payMeta.last_page > 1 ? (
            <div className="admin-ads-pager">
              <button type="button" disabled={payPage <= 1} onClick={() => setPayPage((p) => Math.max(1, p - 1))}>
                Precedent
              </button>
              <span>
                Page {payMeta.current_page} / {payMeta.last_page}
              </span>
              <button type="button" disabled={payPage >= payMeta.last_page} onClick={() => setPayPage((p) => p + 1)}>
                Suivant
              </button>
            </div>
          ) : null}
        </>
      )}

      {deleteTarget ? (
        <div className="admin-ads-modal-backdrop" role="presentation">
          <div className="admin-ads-modal" role="dialog" aria-modal="true" aria-labelledby="del-ad-title">
            <h2 id="del-ad-title">Supprimer la campagne</h2>
            <p>
              <strong>{deleteTarget.titre || `Campagne #${deleteTarget.id}`}</strong> sera supprimee
              definitivement.
            </p>
            <div className="admin-ads-modal-actions">
              <button type="button" disabled={deleteSubmitting} onClick={() => setDeleteTarget(null)}>
                Annuler
              </button>
              <button type="button" className="danger" disabled={deleteSubmitting} onClick={confirmDelete}>
                {deleteSubmitting ? 'Suppression...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {detailCampaign ? (
        <div className="admin-ads-modal-backdrop" role="presentation">
          <div className="admin-ads-modal admin-ads-modal--wide" role="dialog" aria-modal="true">
            <h2>{detailCampaign.title}</h2>
            <p>
              Budget: <strong>{money(detailCampaign.budget)}</strong> · Paye:{' '}
              <strong>{money(detailCampaign.total)}</strong> · Reste:{' '}
              <strong>{money(detailCampaign.remaining)}</strong>
            </p>
            <div className="admin-ads-table-wrap">
              <table className="admin-ads-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Montant</th>
                    <th>Devise</th>
                    <th>Statut paiement</th>
                    <th>Fournisseur</th>
                  </tr>
                </thead>
                <tbody>
                  {detailCampaign.items.map((p) => (
                    <tr key={p.id}>
                      <td>{formatDate(p.paye_le || p.created_at)}</td>
                      <td>{money(p.montant, p.devise || 'MAD')}</td>
                      <td>{p.devise || 'MAD'}</td>
                      <td>
                        <span className={`admin-ads-pay-pill admin-ads-pay-pill--${paymentTone(p.statut)}`}>
                          {p.statut || '—'}
                        </span>
                      </td>
                      <td>{p.fournisseur || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="admin-ads-modal-actions">
              <button type="button" onClick={() => setDetailCampaign(null)}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
