import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { usePrestataireFlash } from '../../../context/PrestataireFlashContext'
import { PrestataireGreenBand } from '../../../layouts/PrestataireGreenBand'
import { prestataireApi } from '../../../services/prestataireApi'
import './PrestataireAdsPage.css'

function money(n) {
  return `${Number(n || 0).toLocaleString('fr-FR')} MAD`
}

function toInputDateTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (x) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromInputDateTime(local) {
  if (!local) return new Date().toISOString()
  const d = new Date(local)
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString()
}

const EMPLACEMENTS = [
  { value: 'hero_home', label: 'Hero page d’accueil' },
  { value: 'homepage', label: 'Bloc accueil' },
  { value: 'listing_sidebar', label: 'Colonne liste activités' },
  { value: 'search_top', label: 'Haut des résultats recherche' },
]

const STATUT_META = {
  brouillon: { label: 'Brouillon', className: 'ad-pill--draft' },
  en_attente_validation: { label: 'En attente validation', className: 'ad-pill--wait' },
  validee: { label: 'Validée', className: 'ad-pill--ok' },
  refusee: { label: 'Refusée', className: 'ad-pill--off' },
  active: { label: 'Active', className: 'ad-pill--live' },
  inactive: { label: 'Inactive', className: 'ad-pill--off' },
}

function emptyForm() {
  return {
    titre: '',
    emplacement: 'hero_home',
    ville_id: '',
    categorie_id: '',
    activite_id: '',
    debut_at: '',
    fin_at: '',
    priorite: 0,
    budget_montant: '',
  }
}

export function PrestataireAdsPage() {
  const { showFlash } = usePrestataireFlash()
  const { pathname } = useLocation()
  const [ads, setAds] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [profiles, setProfiles] = useState([])
  const [catalog, setCatalog] = useState({ categories: [], villes: [] })
  const [activities, setActivities] = useState([])

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState(() => emptyForm())

  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState(() => emptyForm())

  const [deleteCandidate, setDeleteCandidate] = useState(null)
  const [payTarget, setPayTarget] = useState(null)
  const [payAmount, setPayAmount] = useState('')

  const [createVisuelFile, setCreateVisuelFile] = useState(null)
  const [createVisuelPreview, setCreateVisuelPreview] = useState(null)
  const [editVisuelFile, setEditVisuelFile] = useState(null)
  const [editVisuelPreview, setEditVisuelPreview] = useState(null)
  const [editExistingImageUrl, setEditExistingImageUrl] = useState(null)

  const prestataireId = profiles[0]?.id ?? null

  useEffect(() => {
    if (!createVisuelFile) {
      setCreateVisuelPreview(null)
      return
    }
    const url = URL.createObjectURL(createVisuelFile)
    setCreateVisuelPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [createVisuelFile])

  useEffect(() => {
    if (!editVisuelFile) {
      setEditVisuelPreview(null)
      return
    }
    const url = URL.createObjectURL(editVisuelFile)
    setEditVisuelPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [editVisuelFile])

  const loadAll = () => {
    setLoading(true)
    return Promise.all([
      prestataireApi.getAds(),
      prestataireApi.getProfiles(),
      prestataireApi.getPublicCatalog(),
      prestataireApi.getActivities(),
    ])
      .then(([rows, profs, cat, acts]) => {
        setAds(Array.isArray(rows) ? rows : [])
        setProfiles(Array.isArray(profs) ? profs : [])
        setCatalog(cat || { categories: [], villes: [] })
        setActivities(Array.isArray(acts) ? acts : [])
        setError('')
      })
      .catch((apiError) => {
        setError(apiError.message)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    let active = true
    Promise.all([
      prestataireApi.getAds(),
      prestataireApi.getProfiles(),
      prestataireApi.getPublicCatalog(),
      prestataireApi.getActivities(),
    ])
      .then(([rows, profs, cat, acts]) => {
        if (!active) return
        setAds(Array.isArray(rows) ? rows : [])
        setProfiles(Array.isArray(profs) ? profs : [])
        setCatalog(cat || { categories: [], villes: [] })
        setActivities(Array.isArray(acts) ? acts : [])
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
    const total = ads.length
    const wait = ads.filter((a) => a.status === 'en_attente_validation').length
    const ok = ads.filter((a) => a.status === 'validee' || a.status === 'active').length
    const refused = ads.filter((a) => a.status === 'refusee').length
    const budgetSum = ads.reduce((s, a) => s + Number(a.budget || 0), 0)
    const paySum = ads.reduce((s, a) => s + Number(a.montantPaye || 0), 0)
    const inter = ads.reduce((s, a) => s + Number(a.interactions || 0), 0)
    return { total, wait, ok, refused, budgetSum, paySum, inter }
  }, [ads])

  const openCreate = () => {
    const now = new Date()
    const end = new Date(now)
    end.setDate(end.getDate() + 30)
    setCreateForm({
      ...emptyForm(),
      debut_at: toInputDateTime(now.toISOString()),
      fin_at: toInputDateTime(end.toISOString()),
      ville_id: catalog.villes[0]?.id != null ? String(catalog.villes[0].id) : '',
      categorie_id: catalog.categories[0]?.id != null ? String(catalog.categories[0].id) : '',
      budget_montant: '50000',
    })
    setCreateVisuelFile(null)
    setShowCreateModal(true)
    setError('')
  }

  const submitCreate = async (event) => {
    event.preventDefault()
    if (!prestataireId) {
      setError('Profil prestataire introuvable.')
      return
    }
    if (!createForm.titre.trim()) {
      setError('Le titre est obligatoire.')
      return
    }
    try {
      setError('')
      const payload = {
        prestataire_id: prestataireId,
        titre: createForm.titre.trim(),
        emplacement: createForm.emplacement,
        debut_at: fromInputDateTime(createForm.debut_at),
        fin_at: fromInputDateTime(createForm.fin_at),
        priorite: Number(createForm.priorite) || 0,
        budget_montant: createForm.budget_montant !== '' ? Number(createForm.budget_montant) : null,
      }
      if (createForm.ville_id) payload.ville_id = Number(createForm.ville_id)
      if (createForm.categorie_id) payload.categorie_id = Number(createForm.categorie_id)
      if (createForm.activite_id) payload.activite_id = Number(createForm.activite_id)

      const created = await prestataireApi.createAd(payload, createVisuelFile || undefined)
      if (created) setAds((rows) => [created, ...rows])
      setCreateVisuelFile(null)
      setShowCreateModal(false)
      showFlash('Campagne créée : en attente de validation équipe ALL EVENT.')
    } catch (apiError) {
      const msg = apiError.message
      setError(msg)
      showFlash(msg, 'error')
    }
  }

  const openEdit = (row) => {
    setEditId(row.id)
    setEditExistingImageUrl(row.imageUrl || null)
    setEditVisuelFile(null)
    setEditForm({
      titre: row.title || '',
      emplacement: row.emplacement || 'hero_home',
      ville_id: row.villeId != null ? String(row.villeId) : '',
      categorie_id: row.categorieId != null ? String(row.categorieId) : '',
      activite_id: row.activiteId != null ? String(row.activiteId) : '',
      debut_at: toInputDateTime(row.debutAt),
      fin_at: toInputDateTime(row.finAt),
      priorite: String(row.priorite ?? 0),
      budget_montant: row.budget != null ? String(row.budget) : '',
    })
    setError('')
  }

  const submitEdit = async (event) => {
    event.preventDefault()
    if (!editId) return
    try {
      setError('')
      const payload = {
        titre: editForm.titre.trim(),
        emplacement: editForm.emplacement,
        debut_at: fromInputDateTime(editForm.debut_at),
        fin_at: fromInputDateTime(editForm.fin_at),
        priorite: Number(editForm.priorite) || 0,
        budget_montant: editForm.budget_montant !== '' ? Number(editForm.budget_montant) : null,
      }
      if (editForm.ville_id) payload.ville_id = Number(editForm.ville_id)
      else payload.ville_id = null
      if (editForm.categorie_id) payload.categorie_id = Number(editForm.categorie_id)
      else payload.categorie_id = null
      if (editForm.activite_id) payload.activite_id = Number(editForm.activite_id)
      else payload.activite_id = null

      const updated = await prestataireApi.updateAd(editId, payload, editVisuelFile || undefined)
      if (updated) {
        setAds((rows) => rows.map((r) => (r.id === editId ? updated : r)))
      }
      setEditVisuelFile(null)
      setEditId(null)
      showFlash('Campagne mise à jour : repasse en attente de validation.')
    } catch (apiError) {
      const msg = apiError.message
      setError(msg)
      showFlash(msg, 'error')
    }
  }

  const deleteAd = async (id) => {
    try {
      setError('')
      await prestataireApi.deleteAd(id)
      setAds((rows) => rows.filter((r) => r.id !== id))
      setDeleteCandidate(null)
      showFlash('Campagne supprimée.')
    } catch (apiError) {
      const msg = apiError.message
      setError(msg)
      showFlash(msg, 'error')
    }
  }

  const openPay = (row) => {
    setPayTarget(row)
    setPayAmount(String(row.budget || 0))
  }

  const submitPay = async (event) => {
    event.preventDefault()
    if (!payTarget) return
    const m = Number(payAmount)
    if (Number.isNaN(m) || m < 0) {
      setError('Montant invalide.')
      return
    }
    try {
      setError('')
      const updated = await prestataireApi.simulateCampagnePayment(payTarget.id, m)
      if (updated) {
        setAds((rows) => rows.map((r) => (r.id === payTarget.id ? updated : r)))
      }
      setPayTarget(null)
      showFlash('Paiement simulé enregistré (journal + ligne paiement publicité).')
    } catch (apiError) {
      const msg = apiError.message
      setError(msg)
      showFlash(msg, 'error')
    }
  }

  const activityOptions = useMemo(
    () => activities.filter((a) => !prestataireId || String(a.prestataireId) === String(prestataireId)),
    [activities, prestataireId],
  )

  return (
    <section className="pro-ads-page">
      <PrestataireGreenBand
        kicker="Visibilité"
        title="Publicités"
        subtitle="Création et suivi des campagnes (table campagnes_publicitaires). Chaque création ou modification repasse en attente de validation ; l’équipe admin active ou refuse. Le paiement simulé alimente paiements_publicite."
        action={
          <button type="button" className="prestataire-green-band-cta" onClick={openCreate} disabled={!prestataireId}>
            + Nouvelle campagne
          </button>
        }
      />

      <details className="ads-schema">
        <summary>Logique métier (résumé)</summary>
        <ul>
          <li>
            <strong>Création / édition prestataire</strong> → statut <code>en_attente_validation</code> (revalidation
            admin).
          </li>
          <li>
            <strong>Ciblage</strong> : <code>emplacement</code> (zone UI), optionnellement <code>ville_id</code>,{' '}
            <code>categorie_id</code>, <code>activite_id</code>, fenêtre <code>debut_at</code> / <code>fin_at</code>,{' '}
            <code>budget_montant</code>, <code>priorite</code>.
          </li>
          <li>
            <strong>Paiement simulé</strong> : POST <code>…/paiement/simuler</code> crée un enregistrement dans{' '}
            <code>paiements_publicite</code> (ne remplace pas la validation admin).
          </li>
          <li>
            <strong>Interactions</strong> : nombre d’événements dans <code>evenements_statistiques</code> liés à la
            campagne ; <strong>Montant payé</strong> : somme des paiements publicité.
          </li>
        </ul>
      </details>

      {error && (
        <div className="ads-error" role="alert">
          {error}
        </div>
      )}

      <div className="ads-kpi-grid" aria-live="polite">
        <article className="ads-kpi">
          <span className="ads-kpi-label">Campagnes</span>
          <strong className="ads-kpi-value">{kpis.total}</strong>
        </article>
        <article className="ads-kpi ads-kpi--accent">
          <span className="ads-kpi-label">En attente validation</span>
          <strong className="ads-kpi-value">{kpis.wait}</strong>
        </article>
        <article className="ads-kpi">
          <span className="ads-kpi-label">Validées / actives</span>
          <strong className="ads-kpi-value">{kpis.ok}</strong>
        </article>
        <article className="ads-kpi">
          <span className="ads-kpi-label">Refusées</span>
          <strong className="ads-kpi-value">{kpis.refused}</strong>
        </article>
        <article className="ads-kpi ads-kpi--wide">
          <span className="ads-kpi-label">Budgets déclarés (somme)</span>
          <strong className="ads-kpi-value">{money(kpis.budgetSum)}</strong>
        </article>
        <article className="ads-kpi ads-kpi--wide">
          <span className="ads-kpi-label">Montants payés (simulation cumulée)</span>
          <strong className="ads-kpi-value">{money(kpis.paySum)}</strong>
        </article>
        <article className="ads-kpi">
          <span className="ads-kpi-label">Interactions (événements)</span>
          <strong className="ads-kpi-value">{kpis.inter}</strong>
        </article>
      </div>

      {loading && (
        <div className="ads-skeleton-wrap" aria-hidden>
          {[1, 2, 3].map((i) => (
            <div key={i} className="ads-skeleton-card" />
          ))}
        </div>
      )}

      {!loading && ads.length === 0 && (
        <article className="ads-empty">
          <p>Aucune campagne. Créez-en une pour demander une mise en avant sur le catalogue.</p>
          <button type="button" className="ads-empty-cta" onClick={() => loadAll()}>
            Actualiser
          </button>
        </article>
      )}

      {!loading && ads.length > 0 && (
        <ul className="ads-card-list">
          {ads.map((ad) => {
            const st = STATUT_META[ad.status] || STATUT_META.brouillon
            return (
              <li key={ad.id}>
                <article className="ads-card">
                  {ad.imageUrl && (
                    <div className="ads-card-thumb-wrap">
                      <img className="ads-card-thumb" src={ad.imageUrl} alt="" loading="lazy" />
                    </div>
                  )}
                  <div className="ads-card-main">
                    <div className="ads-card-title-row">
                      <h2 className="ads-card-title">{ad.title}</h2>
                      <span className={`ad-pill ${st.className}`}>{st.label}</span>
                    </div>
                    <p className="ads-card-emplacement">
                      Emplacement : <strong>{ad.emplacement}</strong>
                    </p>
                    <ul className="ads-card-meta">
                      {ad.ville && <li>{ad.ville}</li>}
                      {ad.categorie && <li>{ad.categorie}</li>}
                      {ad.activite && <li>Activité : {ad.activite}</li>}
                    </ul>
                    <p className="ads-card-dates">
                      {ad.debutAt && ad.finAt && (
                        <>
                          Du {new Date(ad.debutAt).toLocaleString('fr-FR')} au{' '}
                          {new Date(ad.finAt).toLocaleString('fr-FR')}
                        </>
                      )}
                    </p>
                    <div className="ads-card-metrics">
                      <span>Budget déclaré : {money(ad.budget)}</span>
                      <span>Payé (sim.) : {money(ad.montantPaye)}</span>
                      <span>Interactions : {ad.interactions}</span>
                    </div>
                  </div>
                  <div className="ads-card-actions">
                    <button type="button" className="ads-btn ads-btn--primary" onClick={() => openEdit(ad)}>
                      Modifier
                    </button>
                    <button type="button" className="ads-btn" onClick={() => openPay(ad)}>
                      Simuler paiement
                    </button>
                    <button type="button" className="ads-btn ads-btn--danger" onClick={() => setDeleteCandidate(ad)}>
                      Supprimer
                    </button>
                  </div>
                </article>
              </li>
            )
          })}
        </ul>
      )}

      {showCreateModal && (
        <div className="pro-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="create-ad-title">
          <section className="pro-modal-card ads-modal">
            <div className="ads-modal-header">
              <h2 id="create-ad-title">Nouvelle campagne</h2>
              <p className="ads-modal-hint">Image optionnelle (visuel catalogue) — JPG, PNG, WebP, max 5 Mo.</p>
            </div>
            <form className="ads-form ads-form--modal" id="form-create-ad" onSubmit={submitCreate}>
              <div className="ads-modal-body">
              <label className="ads-field">
                <span>Titre</span>
                <input
                  value={createForm.titre}
                  onChange={(e) => setCreateForm((f) => ({ ...f, titre: e.target.value }))}
                  required
                  maxLength={255}
                />
              </label>
              <label className="ads-field ads-visuel-field">
                <span>Visuel (optionnel)</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="ads-visuel-input"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null
                    setCreateVisuelFile(f)
                  }}
                />
                {createVisuelPreview && (
                  <img className="ads-visuel-preview" src={createVisuelPreview} alt="Aperçu" />
                )}
              </label>
              <label className="ads-field">
                <span>Emplacement</span>
                <select
                  value={createForm.emplacement}
                  onChange={(e) => setCreateForm((f) => ({ ...f, emplacement: e.target.value }))}
                >
                  {EMPLACEMENTS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="ads-form-row">
                <label className="ads-field">
                  <span>Ville (optionnel)</span>
                  <select
                    value={createForm.ville_id}
                    onChange={(e) => setCreateForm((f) => ({ ...f, ville_id: e.target.value }))}
                  >
                    <option value="">—</option>
                    {catalog.villes.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.nom}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="ads-field">
                  <span>Catégorie (optionnel)</span>
                  <select
                    value={createForm.categorie_id}
                    onChange={(e) => setCreateForm((f) => ({ ...f, categorie_id: e.target.value }))}
                  >
                    <option value="">—</option>
                    {catalog.categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nom}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="ads-field">
                <span>Activité (optionnel)</span>
                <select
                  value={createForm.activite_id}
                  onChange={(e) => setCreateForm((f) => ({ ...f, activite_id: e.target.value }))}
                >
                  <option value="">—</option>
                  {activityOptions.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title}
                    </option>
                  ))}
                </select>
              </label>
              <div className="ads-form-row">
                <label className="ads-field">
                  <span>Début</span>
                  <input
                    type="datetime-local"
                    value={createForm.debut_at}
                    onChange={(e) => setCreateForm((f) => ({ ...f, debut_at: e.target.value }))}
                    required
                  />
                </label>
                <label className="ads-field">
                  <span>Fin</span>
                  <input
                    type="datetime-local"
                    value={createForm.fin_at}
                    onChange={(e) => setCreateForm((f) => ({ ...f, fin_at: e.target.value }))}
                    required
                  />
                </label>
              </div>
              <div className="ads-form-row">
                <label className="ads-field">
                  <span>Priorité</span>
                  <input
                    type="number"
                    min="0"
                    value={createForm.priorite}
                    onChange={(e) => setCreateForm((f) => ({ ...f, priorite: e.target.value }))}
                  />
                </label>
                <label className="ads-field">
                  <span>Budget (MAD)</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={createForm.budget_montant}
                    onChange={(e) => setCreateForm((f) => ({ ...f, budget_montant: e.target.value }))}
                  />
                </label>
              </div>
              </div>
            </form>
            <div className="ads-modal-footer modal-actions">
              <button type="submit" form="form-create-ad" className="ads-btn-submit">
                Valider la création
              </button>
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  setCreateVisuelFile(null)
                  setShowCreateModal(false)
                }}
              >
                Annuler
              </button>
            </div>
          </section>
        </div>
      )}

      {editId != null && (
        <div className="pro-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="edit-ad-title">
          <section className="pro-modal-card ads-modal ads-modal--wide">
            <div className="ads-modal-header">
              <h2 id="edit-ad-title">Modifier la campagne</h2>
              <p className="ads-modal-hint">Toute modification repasse la campagne en attente de validation.</p>
            </div>
            <form className="ads-form ads-form--modal" id="form-edit-ad" onSubmit={submitEdit}>
              <div className="ads-modal-body">
              <label className="ads-field">
                <span>Titre</span>
                <input
                  value={editForm.titre}
                  onChange={(e) => setEditForm((f) => ({ ...f, titre: e.target.value }))}
                  required
                  maxLength={255}
                />
              </label>
              <label className="ads-field ads-visuel-field">
                <span>Visuel (optionnel)</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="ads-visuel-input"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null
                    setEditVisuelFile(f)
                  }}
                />
                {(editVisuelPreview || editExistingImageUrl) && (
                  <img
                    className="ads-visuel-preview"
                    src={editVisuelPreview || editExistingImageUrl}
                    alt="Aperçu"
                  />
                )}
              </label>
              <label className="ads-field">
                <span>Emplacement</span>
                <select
                  value={editForm.emplacement}
                  onChange={(e) => setEditForm((f) => ({ ...f, emplacement: e.target.value }))}
                >
                  {EMPLACEMENTS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="ads-form-row">
                <label className="ads-field">
                  <span>Ville</span>
                  <select
                    value={editForm.ville_id}
                    onChange={(e) => setEditForm((f) => ({ ...f, ville_id: e.target.value }))}
                  >
                    <option value="">—</option>
                    {catalog.villes.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.nom}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="ads-field">
                  <span>Catégorie</span>
                  <select
                    value={editForm.categorie_id}
                    onChange={(e) => setEditForm((f) => ({ ...f, categorie_id: e.target.value }))}
                  >
                    <option value="">—</option>
                    {catalog.categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nom}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="ads-field">
                <span>Activité</span>
                <select
                  value={editForm.activite_id}
                  onChange={(e) => setEditForm((f) => ({ ...f, activite_id: e.target.value }))}
                >
                  <option value="">—</option>
                  {activityOptions.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title}
                    </option>
                  ))}
                </select>
              </label>
              <div className="ads-form-row">
                <label className="ads-field">
                  <span>Début</span>
                  <input
                    type="datetime-local"
                    value={editForm.debut_at}
                    onChange={(e) => setEditForm((f) => ({ ...f, debut_at: e.target.value }))}
                    required
                  />
                </label>
                <label className="ads-field">
                  <span>Fin</span>
                  <input
                    type="datetime-local"
                    value={editForm.fin_at}
                    onChange={(e) => setEditForm((f) => ({ ...f, fin_at: e.target.value }))}
                    required
                  />
                </label>
              </div>
              <div className="ads-form-row">
                <label className="ads-field">
                  <span>Priorité</span>
                  <input
                    type="number"
                    min="0"
                    value={editForm.priorite}
                    onChange={(e) => setEditForm((f) => ({ ...f, priorite: e.target.value }))}
                  />
                </label>
                <label className="ads-field">
                  <span>Budget (MAD)</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={editForm.budget_montant}
                    onChange={(e) => setEditForm((f) => ({ ...f, budget_montant: e.target.value }))}
                  />
                </label>
              </div>
              </div>
            </form>
            <div className="ads-modal-footer modal-actions">
              <button type="submit" form="form-edit-ad" className="ads-btn-submit">
                Valider les modifications
              </button>
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  setEditVisuelFile(null)
                  setEditId(null)
                }}
              >
                Annuler
              </button>
            </div>
          </section>
        </div>
      )}

      {payTarget && (
        <div className="pro-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="pay-ad-title">
          <section className="pro-modal-card ads-modal">
            <h2 id="pay-ad-title">Simuler un paiement</h2>
            <p className="ads-modal-hint">
              Enregistre un paiement dans <code>paiements_publicite</code> (démo). Le statut de validation admin
              reste inchangé.
            </p>
            <form className="ads-form" onSubmit={submitPay}>
              <label className="ads-field">
                <span>Montant (MAD)</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  required
                />
              </label>
              <div className="modal-actions">
                <button type="submit" className="ads-btn-submit">
                  Valider la simulation
                </button>
                <button type="button" className="ghost" onClick={() => setPayTarget(null)}>
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
            <h2>Supprimer cette campagne ?</h2>
            <p>{deleteCandidate.title}</p>
            <div className="modal-actions">
              <button type="button" className="danger" onClick={() => deleteAd(deleteCandidate.id)}>
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
