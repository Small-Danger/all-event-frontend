import { useEffect, useMemo, useRef, useState } from 'react'
import { proActivitiesSeed } from '../prestataireMockData'
import { usePrestataireFlash } from '../../../context/PrestataireFlashContext'
import { normalizeMediaDisplayUrl, prestataireApi } from '../../../services/prestataireApi'
import { PrestataireGreenBand } from '../../../layouts/PrestataireGreenBand'
import './PrestataireActivitiesPage.css'

const STATUT_OPTIONS = [
  { value: 'brouillon', label: 'Brouillon (non visible catalogue)' },
  { value: 'en_attente_validation', label: 'Soumettre pour validation admin' },
]

function activityStatusLabel(status) {
  if (status === 'published') return 'Publiée (catalogue)'
  if (status === 'pending_review') return 'En attente validation'
  return 'Brouillon'
}

function activityStatusClass(status) {
  if (status === 'published') return 'activity-status published'
  if (status === 'pending_review') return 'activity-status pending_review'
  return 'activity-status draft'
}

function looksLikeCloudinaryOrUploadError(message) {
  if (!message || typeof message !== 'string') return false
  return /cloudinary|upload|configuration|echec upload|incomplète|incomplete|ssl|certificat|https vers cloudinary|curl error 60|CLOUDINARY_HTTP_VERIFY/i.test(
    message,
  )
}

function normalizeSeed(rows) {
  return rows.map((row) => ({
    ...row,
    description: row.description ?? '',
    category: row.category ?? '-',
    lieuName: row.lieuName ?? null,
    categorieId: row.categorieId ?? null,
    villeId: row.villeId ?? null,
    lieuId: row.lieuId ?? null,
    coverUrl: row.coverUrl ?? null,
    mediasCount: row.mediasCount ?? 0,
    creneauxCount: row.creneauxCount ?? 0,
    prestataireId: row.prestataireId ?? null,
    rawStatus:
      row.rawStatus ??
      (row.status === 'published'
        ? 'publiee'
        : row.status === 'pending_review'
          ? 'en_attente_validation'
          : 'brouillon'),
  }))
}

export function PrestataireActivitiesPage() {
  const { showFlash } = usePrestataireFlash()
  const [activities, setActivities] = useState(() => normalizeSeed(proActivitiesSeed))
  const [profiles, setProfiles] = useState([])
  const [catalog, setCatalog] = useState({ categories: [], villes: [] })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')

  const [createOpen, setCreateOpen] = useState(false)
  const [createStep, setCreateStep] = useState(1)
  const [createFiles, setCreateFiles] = useState([])
  const createPreviewUrls = useRef([])

  const [createForm, setCreateForm] = useState({
    prestataire_id: '',
    categorie_id: '',
    ville_id: '',
    titre: '',
    description: '',
    prix_base: '',
    statut: 'brouillon',
  })

  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailData, setDetailData] = useState(null)

  const [editOpen, setEditOpen] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [editActivityId, setEditActivityId] = useState(null)
  const [editDetail, setEditDetail] = useState(null)
  const [editForm, setEditForm] = useState({
    categorie_id: '',
    ville_id: '',
    titre: '',
    description: '',
    prix_base: '',
    statut: 'brouillon',
  })
  const [editNewFiles, setEditNewFiles] = useState([])

  const [deleteCandidate, setDeleteCandidate] = useState(null)

  const revokeCreatePreviews = () => {
    createPreviewUrls.current.forEach((url) => URL.revokeObjectURL(url))
    createPreviewUrls.current = []
  }

  const syncActivitiesFromApi = async () => {
    const list = await prestataireApi.getActivities()
    setActivities(Array.isArray(list) ? list : [])
  }

  useEffect(() => {
    let active = true
    Promise.all([
      prestataireApi.getActivities(),
      prestataireApi.getProfiles(),
      prestataireApi.getPublicCatalog(),
    ])
      .then(([data, profs, cat]) => {
        if (!active) return
        if (data.length) setActivities(data)
        setProfiles(asArray(profs))
        setCatalog({
          categories: cat?.categories || [],
          villes: cat?.villes || [],
        })
        const firstProfile = asArray(profs)[0]?.id
        const firstCat = cat?.categories?.[0]?.id
        const firstVille = cat?.villes?.[0]?.id
        setCreateForm((f) => ({
          ...f,
          prestataire_id: firstProfile != null ? String(firstProfile) : '',
          categorie_id: firstCat != null ? String(firstCat) : '',
          ville_id: firstVille != null ? String(firstVille) : '',
        }))
      })
      .catch((apiError) => {
        if (!active) return
        setError(apiError.message)
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(
    () => () => {
      revokeCreatePreviews()
    },
    [],
  )

  const openCreate = () => {
    setError('')
    setCreateStep(1)
    setCreateFiles([])
    revokeCreatePreviews()
    const firstProfile = profiles[0]?.id
    const firstCat = catalog.categories[0]?.id
    const firstVille = catalog.villes[0]?.id
    setCreateForm({
      prestataire_id: firstProfile != null ? String(firstProfile) : '',
      categorie_id: firstCat != null ? String(firstCat) : '',
      ville_id: firstVille != null ? String(firstVille) : '',
      titre: '',
      description: '',
      prix_base: '',
      statut: 'brouillon',
    })
    setCreateOpen(true)
  }

  const closeCreate = () => {
    setCreateOpen(false)
    setCreateStep(1)
    setCreateFiles([])
    revokeCreatePreviews()
  }

  const onPickCreateImages = (event) => {
    const list = Array.from(event.target.files || [])
    if (!list.length) return
    revokeCreatePreviews()
    const urls = list.map((file) => URL.createObjectURL(file))
    createPreviewUrls.current = urls
    setCreateFiles(list)
    event.target.value = ''
  }

  const removeCreateImageAt = (index) => {
    const nextFiles = createFiles.filter((_, i) => i !== index)
    const url = createPreviewUrls.current[index]
    if (url) URL.revokeObjectURL(url)
    createPreviewUrls.current = createPreviewUrls.current.filter((_, i) => i !== index)
    setCreateFiles(nextFiles)
  }

  const submitCreate = async (event) => {
    event.preventDefault()
    setError('')
    const pid = Number(createForm.prestataire_id)
    const cid = Number(createForm.categorie_id)
    const vid = Number(createForm.ville_id)
    const titre = createForm.titre.trim()
    const prix = Number(createForm.prix_base)
    if (!pid || !cid || !vid || !titre || Number.isNaN(prix) || prix < 0) {
      setError('Remplissez prestataire, categorie, ville, titre et prix valides.')
      return
    }
    try {
      const created = await prestataireApi.createActivity({
        prestataire_id: pid,
        categorie_id: cid,
        ville_id: vid,
        titre,
        description: createForm.description.trim() || undefined,
        prix_base: prix,
        statut: createForm.statut,
      })
      for (let i = 0; i < createFiles.length; i += 1) {
        await prestataireApi.uploadActivityMedia(created.id, createFiles[i], i)
      }
      await syncActivitiesFromApi()
      closeCreate()
      showFlash(
        createFiles.length
          ? 'Enregistrement reussi. Images hebergees sur Cloudinary ; elles apparaissent sur les cartes et dans les fiches.'
          : 'Activite creee avec succes.',
      )
    } catch (apiError) {
      const msg = apiError.message
      setError(msg)
      showFlash(msg, 'error', looksLikeCloudinaryOrUploadError(msg) ? 12000 : 7000)
    }
  }

  const openDetail = async (id) => {
    setDetailOpen(true)
    setDetailLoading(true)
    setDetailData(null)
    setError('')
    try {
      const data = await prestataireApi.getActivityDetails(id)
      setDetailData(data)
    } catch (apiError) {
      setError(apiError.message)
      setDetailOpen(false)
    } finally {
      setDetailLoading(false)
    }
  }

  const openEdit = async (id) => {
    setEditOpen(true)
    setEditLoading(true)
    setEditActivityId(id)
    setEditDetail(null)
    setEditNewFiles([])
    setError('')
    try {
      const data = await prestataireApi.getActivityDetails(id)
      setEditDetail(data)
      const st = data.statut || 'brouillon'
      setEditForm({
        categorie_id: String(data.categorie_id ?? ''),
        ville_id: String(data.ville_id ?? ''),
        titre: data.titre || '',
        description: data.description || '',
        prix_base: String(data.prix_base ?? ''),
        statut: st === 'en_attente_validation' ? 'en_attente_validation' : 'brouillon',
      })
    } catch (apiError) {
      setError(apiError.message)
      setEditOpen(false)
    } finally {
      setEditLoading(false)
    }
  }

  const saveEdit = async (event) => {
    event.preventDefault()
    if (!editActivityId) return
    setError('')
    const titre = editForm.titre.trim()
    const prix = Number(editForm.prix_base)
    const cid = Number(editForm.categorie_id)
    const vid = Number(editForm.ville_id)
    if (!titre || Number.isNaN(prix) || prix < 0 || !cid || !vid) {
      setError('Titre, prix, categorie et ville sont obligatoires.')
      return
    }
    try {
      const payload = {
        categorie_id: cid,
        ville_id: vid,
        titre,
        description: editForm.description.trim() || null,
        prix_base: prix,
      }
      if (editDetail?.statut !== 'publiee') {
        payload.statut = editForm.statut
      }
      await prestataireApi.updateActivity(editActivityId, payload)
      for (let i = 0; i < editNewFiles.length; i += 1) {
        await prestataireApi.uploadActivityMedia(editActivityId, editNewFiles[i], 100 + i)
      }
      await syncActivitiesFromApi()
      setEditNewFiles([])
      setEditOpen(false)
      setEditDetail(null)
      showFlash(
        editNewFiles.length
          ? 'Modifications enregistrees. Nouvelles images disponibles sur les cartes et dans la fiche.'
          : 'Modifications enregistrees.',
      )
    } catch (apiError) {
      const msg = apiError.message
      setError(msg)
      showFlash(msg, 'error', looksLikeCloudinaryOrUploadError(msg) ? 12000 : 7000)
    }
  }

  const deleteMedia = async (mediaId) => {
    if (!editActivityId) return
    try {
      await prestataireApi.deleteActivityMedia(editActivityId, mediaId)
      await syncActivitiesFromApi()
      const fresh = await prestataireApi.getActivityDetails(editActivityId)
      setEditDetail(fresh)
      showFlash('Image supprimee. La liste a ete mise a jour.')
    } catch (apiError) {
      const msg = apiError.message
      setError(msg)
      showFlash(msg, 'error')
    }
  }

  const patchActivityStatut = async (id, statut) => {
    try {
      await prestataireApi.updateActivity(id, { statut })
      await syncActivitiesFromApi()
      if (statut === 'en_attente_validation') {
        showFlash('Demande envoyée. Un administrateur validera la mise en ligne du catalogue.')
      } else {
        showFlash('Statut mis à jour : brouillon.')
      }
    } catch (apiError) {
      const msg = apiError.message
      setError(msg)
      showFlash(msg, 'error')
    }
  }

  const deleteActivity = async (id) => {
    try {
      await prestataireApi.deleteActivity(id)
      setActivities((rows) => rows.filter((row) => row.id !== id))
      setDeleteCandidate(null)
      showFlash('Activite supprimee.')
    } catch (apiError) {
      const msg = apiError.message
      setError(msg)
      showFlash(msg, 'error')
    }
  }

  const visibleActivities = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return activities
    return activities.filter((item) =>
      `${item.title} ${item.city} ${item.category}`.toLowerCase().includes(normalized),
    )
  }, [activities, query])

  const mediasSorted = (detailData?.medias || []).slice().sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0))
  const creneauxSorted = (detailData?.creneaux || []).slice().sort((a, b) => String(a.debut_at).localeCompare(String(b.debut_at)))

  return (
    <section className="pro-activities-page">
      <PrestataireGreenBand
        kicker="Catalogue"
        title="Activites"
        subtitle="Vous enregistrez en brouillon ou soumettez pour validation ; seul un administrateur peut publier sur le catalogue public. Une fiche déjà en ligne repasse en validation si vous modifiez le contenu ou les médias."
        action={
          <button type="button" className="prestataire-green-band-cta" onClick={openCreate}>
            + Nouvelle activite
          </button>
        }
      />

      {isLoading && <p className="activities-hint">Chargement des activites...</p>}
      {!isLoading && error && <p className="activities-error">{error}</p>}

      <div className="activities-toolbar">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Rechercher par titre, ville ou categorie..."
          aria-label="Recherche activites"
        />
      </div>

      <div className="activities-kpis">
        <article>
          <span>Total</span>
          <strong>{activities.length}</strong>
        </article>
        <article>
          <span>En ligne (catalogue)</span>
          <strong>{activities.filter((item) => item.status === 'published').length}</strong>
        </article>
        <article>
          <span>En attente validation</span>
          <strong>{activities.filter((item) => item.status === 'pending_review').length}</strong>
        </article>
        <article>
          <span>Brouillons</span>
          <strong>{activities.filter((item) => item.status === 'draft').length}</strong>
        </article>
      </div>

      <div className="activities-grid">
        {visibleActivities.map((item) => (
          <article key={item.id} className="activity-card">
            <div className="activity-card-media">
              {item.coverUrl ? (
                <img
                  src={normalizeMediaDisplayUrl(item.coverUrl) || item.coverUrl || ''}
                  alt=""
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="activity-card-placeholder" aria-hidden>
                  {item.title?.slice(0, 1)?.toUpperCase() || '?'}
                </div>
              )}
              <span className={activityStatusClass(item.status)}>{activityStatusLabel(item.status)}</span>
            </div>
            <div className="activity-card-body">
              <p className="activity-card-category">{item.category}</p>
              <h2>{item.title}</h2>
              <p className="activity-card-meta">
                <span>{item.city}</span>
                {item.lieuName && <span className="dot">·</span>}
                {item.lieuName && <span>{item.lieuName}</span>}
              </p>
              <p className="activity-card-price">{Number(item.price || 0).toLocaleString('fr-FR')} MAD</p>
              <div className="activity-card-stats">
                <span>{item.mediasCount || 0} photo(s)</span>
                <span>{item.creneauxCount ?? 0} creneau(x)</span>
              </div>
              <div className="activity-card-actions">
                <button type="button" className="btn-secondary" onClick={() => openDetail(item.id)}>
                  Fiche
                </button>
                <button type="button" className="btn-secondary" onClick={() => openEdit(item.id)}>
                  Modifier
                </button>
                {item.status === 'draft' ? (
                  <button type="button" onClick={() => patchActivityStatut(item.id, 'en_attente_validation')}>
                    Soumettre pour validation
                  </button>
                ) : null}
                {item.status === 'pending_review' ? (
                  <button type="button" className="btn-secondary" onClick={() => patchActivityStatut(item.id, 'brouillon')}>
                    Retirer la demande (brouillon)
                  </button>
                ) : null}
                {item.status === 'published' ? (
                  <button type="button" className="btn-secondary" onClick={() => patchActivityStatut(item.id, 'en_attente_validation')}>
                    Demander une revalidation
                  </button>
                ) : null}
                <button type="button" className="danger" onClick={() => setDeleteCandidate(item)}>
                  Supprimer
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {createOpen && (
        <div className="pro-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="create-activity-title">
          <section className="pro-modal-card pro-modal-wide">
            <div className="modal-head">
              <h2 id="create-activity-title">Nouvelle activite</h2>
              <p>
                Etape {createStep}/2 : {createStep === 1 ? 'visuels' : 'donnees liees au catalogue'}
              </p>
            </div>

            {createStep === 1 && (
              <div className="wizard-step">
                <p className="wizard-help">
                  Ajoutez une ou plusieurs images (max 5 Mo chacune, cote API). Elles seront envoyees apres la creation de
                  l'activite.
                </p>
                <label className="file-drop">
                  <input type="file" accept="image/*" multiple onChange={onPickCreateImages} />
                  <span>Cliquez ou deposez des images</span>
                </label>
                {createFiles.length > 0 && (
                  <ul className="image-preview-list">
                    {createFiles.map((file, index) => (
                      <li key={`${file.name}-${index}`}>
                        <img src={createPreviewUrls.current[index]} alt="" />
                        <button type="button" className="remove-thumb" onClick={() => removeCreateImageAt(index)}>
                          Retirer
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="modal-actions">
                  <button type="button" onClick={() => setCreateStep(2)} disabled={false}>
                    Continuer
                  </button>
                  <button type="button" className="ghost" onClick={closeCreate}>
                    Annuler
                  </button>
                </div>
              </div>
            )}

            {createStep === 2 && (
              <form className="activity-form" onSubmit={submitCreate}>
                <fieldset className="form-section">
                  <legend>Liaisons obligatoires</legend>
                  <label>
                    Prestataire
                    <select
                      value={createForm.prestataire_id}
                      onChange={(e) => setCreateForm((f) => ({ ...f, prestataire_id: e.target.value }))}
                      required
                    >
                      <option value="">Choisir...</option>
                      {profiles.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nom || `Prestataire #${p.id}`}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Categorie
                    <select
                      value={createForm.categorie_id}
                      onChange={(e) => setCreateForm((f) => ({ ...f, categorie_id: e.target.value }))}
                      required
                    >
                      <option value="">Choisir...</option>
                      {catalog.categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nom}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Ville
                    <select
                      value={createForm.ville_id}
                      onChange={(e) => setCreateForm((f) => ({ ...f, ville_id: e.target.value }))}
                      required
                    >
                      <option value="">Choisir...</option>
                      {catalog.villes.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.nom}
                        </option>
                      ))}
                    </select>
                  </label>
                </fieldset>

                <fieldset className="form-section">
                  <legend>Contenu affiche (web & mobile)</legend>
                  <label>
                    Titre
                    <input
                      value={createForm.titre}
                      onChange={(e) => setCreateForm((f) => ({ ...f, titre: e.target.value }))}
                      required
                      maxLength={255}
                    />
                  </label>
                  <label>
                    Description
                    <textarea
                      rows={4}
                      value={createForm.description}
                      onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder="Decrivez l'experience, le deroule, les prerequis..."
                    />
                  </label>
                  <label>
                    Prix de base (MAD)
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={createForm.prix_base}
                      onChange={(e) => setCreateForm((f) => ({ ...f, prix_base: e.target.value }))}
                      required
                    />
                  </label>
                  <label>
                    Publication
                    <select
                      value={createForm.statut}
                      onChange={(e) => setCreateForm((f) => ({ ...f, statut: e.target.value }))}
                    >
                      {STATUT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </fieldset>

                <p className="form-note">
                  Vous ne pouvez pas publier seul sur le catalogue : choisissez une soumission pour validation ou laissez en
                  brouillon. Le champ lieu précis (`lieu_id`) reste optionnel côté API.
                </p>

                <div className="modal-actions">
                  <button type="button" className="ghost" onClick={() => setCreateStep(1)}>
                    Retour
                  </button>
                  <button type="submit">Creer et envoyer les images</button>
                  <button type="button" className="ghost" onClick={closeCreate}>
                    Annuler
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}

      {detailOpen && (
        <div className="pro-modal-backdrop" role="dialog" aria-modal="true">
          <section className="pro-modal-card pro-modal-wide">
            <div className="modal-head">
              <h2>Fiche activite</h2>
              <button type="button" className="ghost close-x" onClick={() => setDetailOpen(false)}>
                Fermer
              </button>
            </div>
            {detailLoading && <p>Chargement...</p>}
            {!detailLoading && detailData && (
              <>
                <div className="detail-grid">
                  <div>
                    <h3>{detailData.titre}</h3>
                    <p className="detail-meta">
                      {detailData.categorie?.nom} · {detailData.ville?.nom}
                      {detailData.lieu?.nom && ` · ${detailData.lieu.nom}`}
                    </p>
                    <p className="detail-desc">{detailData.description || 'Pas de description.'}</p>
                    <p className="detail-price">
                      {Number(detailData.prix_base || 0).toLocaleString('fr-FR')} MAD
                    </p>
                    <p className="detail-statut-pill">
                      <span className={activityStatusClass(
                        detailData.statut === 'publiee'
                          ? 'published'
                          : detailData.statut === 'en_attente_validation'
                            ? 'pending_review'
                            : 'draft',
                      )}>
                        {detailData.statut === 'publiee'
                          ? 'Publiée — visible catalogue'
                          : detailData.statut === 'en_attente_validation'
                            ? 'En attente de validation admin'
                            : 'Brouillon'}
                      </span>
                    </p>
                  </div>
                  <div className="detail-gallery">
                    {mediasSorted.length === 0 && <p className="muted">Aucune image.</p>}
                    {mediasSorted.map((m) => {
                      const src = normalizeMediaDisplayUrl(m.url) || m.url || ''
                      return (
                        <a key={m.id} href={src || '#'} target="_blank" rel="noreferrer">
                          <img src={src} alt="" referrerPolicy="no-referrer" />
                        </a>
                      )
                    })}
                  </div>
                </div>
                <h4 className="detail-sub">Creneaux ({creneauxSorted.length})</h4>
                <ul className="detail-creneaux">
                  {creneauxSorted.length === 0 && <li className="muted">Aucun creneau — ajoutez-en dans Disponibilites.</li>}
                  {creneauxSorted.map((c) => (
                    <li key={c.id}>
                      {c.debut_at?.replace('T', ' ').slice(0, 16)} → {c.fin_at?.replace('T', ' ').slice(0, 16)} —{' '}
                      {c.statut} — cap. {c.capacite_totale}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </div>
      )}

      {editOpen && (
        <div className="pro-modal-backdrop" role="dialog" aria-modal="true">
          <section className="pro-modal-card pro-modal-wide">
            <div className="modal-head">
              <h2>Modifier l'activite</h2>
              <button type="button" className="ghost close-x" onClick={() => setEditOpen(false)}>
                Fermer
              </button>
            </div>
            {editLoading && <p>Chargement...</p>}
            {!editLoading && (
              <form className="activity-form" onSubmit={saveEdit}>
                <fieldset className="form-section">
                  <legend>Liaisons</legend>
                  <label>
                    Categorie
                    <select
                      value={editForm.categorie_id}
                      onChange={(e) => setEditForm((f) => ({ ...f, categorie_id: e.target.value }))}
                      required
                    >
                      {catalog.categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nom}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Ville
                    <select
                      value={editForm.ville_id}
                      onChange={(e) => setEditForm((f) => ({ ...f, ville_id: e.target.value }))}
                      required
                    >
                      {catalog.villes.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.nom}
                        </option>
                      ))}
                    </select>
                  </label>
                </fieldset>
                {editDetail?.statut === 'publiee' ? (
                  <p className="form-note form-note--highlight">
                    Cette activité est <strong>en ligne</strong> sur le catalogue. Si vous modifiez le contenu ci-dessous ou
                    les images, elle repassera en <strong>attente de validation</strong> après enregistrement (règle
                    serveur). Vous pouvez aussi demander une revalidation depuis la carte, sans modifier la fiche.
                  </p>
                ) : null}
                <fieldset className="form-section">
                  <legend>Contenu</legend>
                  <label>
                    Titre
                    <input
                      value={editForm.titre}
                      onChange={(e) => setEditForm((f) => ({ ...f, titre: e.target.value }))}
                      required
                    />
                  </label>
                  <label>
                    Description
                    <textarea
                      rows={4}
                      value={editForm.description}
                      onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                    />
                  </label>
                  <label>
                    Prix de base (MAD)
                    <input
                      type="number"
                      min="0"
                      value={editForm.prix_base}
                      onChange={(e) => setEditForm((f) => ({ ...f, prix_base: e.target.value }))}
                      required
                    />
                  </label>
                  {editDetail?.statut !== 'publiee' ? (
                    <label>
                      Statut
                      <select
                        value={editForm.statut}
                        onChange={(e) => setEditForm((f) => ({ ...f, statut: e.target.value }))}
                      >
                        {STATUT_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                </fieldset>

                <fieldset className="form-section">
                  <legend>Images existantes</legend>
                  <div className="edit-media-row">
                    {(editDetail?.medias || [])
                      .slice()
                      .sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0))
                      .map((m) => (
                        <div key={m.id} className="edit-media-item">
                          <img
                            src={normalizeMediaDisplayUrl(m.url) || m.url || ''}
                            alt=""
                            referrerPolicy="no-referrer"
                          />
                          <button type="button" className="danger small" onClick={() => deleteMedia(m.id)}>
                            Supprimer
                          </button>
                        </div>
                      ))}
                    {!(editDetail?.medias || []).length && (
                      <p className="muted">Aucune image pour le moment. Ajoutez-en ci-dessous.</p>
                    )}
                  </div>
                  <label className="file-drop compact">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => setEditNewFiles(Array.from(e.target.files || []))}
                    />
                    <span>
                      {editNewFiles.length ? `${editNewFiles.length} fichier(s) a envoyer` : 'Ajouter des images'}
                    </span>
                  </label>
                </fieldset>

                <div className="modal-actions">
                  <button type="submit">Enregistrer</button>
                  <button type="button" className="ghost" onClick={() => setEditOpen(false)}>
                    Annuler
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}

      {deleteCandidate && (
        <div className="pro-modal-backdrop" role="dialog" aria-modal="true">
          <section className="pro-modal-card">
            <h2>Supprimer cette activite ?</h2>
            <p>{deleteCandidate.title} sera retiree du catalogue.</p>
            <div className="modal-actions">
              <button type="button" className="danger" onClick={() => deleteActivity(deleteCandidate.id)}>
                Oui, supprimer
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

function asArray(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  return []
}
