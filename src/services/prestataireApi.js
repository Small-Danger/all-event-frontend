const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api'
const TOKEN_STORAGE_KEY = 'allevent_auth_token'

/** Origine du backend (sans /api) pour prefixer les chemins relatifs /storage/... */
const API_ORIGIN = API_BASE_URL.replace(/\/?api\/?$/, '') || ''

function unwrapEntity(payload) {
  if (payload == null || typeof payload !== 'object') return payload
  if ('id' in payload || 'url' in payload || 'titre' in payload) return payload
  if (payload.data != null && typeof payload.data === 'object') return payload.data
  return payload
}

/**
 * URL affichable dans <img src> (chemins relatifs Laravel, URLs protocol-relative).
 */
export function normalizeMediaDisplayUrl(url) {
  if (url == null || url === '') return null
  const s = String(url).trim()
  if (!s) return null
  if (s.startsWith('data:') || s.startsWith('blob:')) return s
  if (s.startsWith('http://') || s.startsWith('https://')) return s
  if (s.startsWith('//')) return `https:${s}`
  if (s.startsWith('/')) {
    const base = API_ORIGIN || (typeof window !== 'undefined' ? window.location.origin : '')
    return base ? `${base.replace(/\/$/, '')}${s}` : s
  }
  return s
}

function mediaRowUrl(m) {
  if (!m || typeof m !== 'object') return null
  const raw = m.url ?? m.secure_url ?? m.secureUrl ?? null
  return normalizeMediaDisplayUrl(raw) || raw || null
}

function normalizeMediasArray(medias) {
  if (!Array.isArray(medias)) return []
  return medias.map((m) => ({
    ...m,
    url: mediaRowUrl(m) || m.url,
  }))
}

function getHeaders() {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY)
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

function getAuthHeadersOnly() {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY)
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function errorMessageFromPayload(payload) {
  if (payload == null || typeof payload !== 'object') return null
  if (typeof payload.message === 'string' && payload.message.trim()) {
    return payload.message.trim()
  }
  const errs = payload.errors
  if (errs && typeof errs === 'object') {
    for (const key of Object.keys(errs)) {
      const arr = errs[key]
      if (Array.isArray(arr) && arr.length && typeof arr[0] === 'string') {
        return arr[0]
      }
    }
  }
  return null
}

async function requestFormData(path, formData, method = 'POST') {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: getAuthHeadersOnly(),
    body: formData,
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(
      errorMessageFromPayload(payload) || 'Erreur API prestataire.',
    )
  }
  return unwrapEntity(payload)
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...getHeaders(),
      ...(options.headers || {}),
    },
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(
      errorMessageFromPayload(payload) || 'Erreur API prestataire.',
    )
  }
  return payload
}

function asList(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  return []
}

/** Cles UI alignees sur reservations.statut (backend). */
function reservationUiStatus(statut) {
  if (statut === 'confirmee') return 'confirmed'
  if (statut === 'annulee') return 'cancelled'
  if (statut === 'remboursee') return 'refunded'
  if (statut === 'payee') return 'paid'
  return 'awaiting_payment'
}

function mapReservationFromApi(item) {
  if (!item || typeof item !== 'object') return null
  const lignes = Array.isArray(item.lignes) ? item.lignes : []
  const linesDetail = lignes.map((l) => {
    const cr = l.creneau
    const act = cr?.activite
    const debut = cr?.debut_at
    const fin = cr?.fin_at
    return {
      id: l.id,
      quantite: Number(l.quantite || 0),
      prixUnitaire: Number(l.prix_unitaire_snapshot || 0),
      activityTitle: act?.titre || '—',
      ville: act?.ville?.nom || null,
      debutAt: debut || null,
      finAt: fin || null,
      timeRange:
        debut && fin ? `${String(debut).slice(11, 16)} – ${String(fin).slice(11, 16)}` : null,
    }
  })
  const first = linesDetail[0]
  const backendStatut = item.statut
  return {
    id: item.id,
    activity: first?.activityTitle || `Reservation #${item.id}`,
    activitySubtitle: first?.ville || '',
    customer: item?.user?.name || '—',
    customerEmail: item?.user?.email || null,
    date: first?.debutAt ? String(first.debutAt).slice(0, 10) : item?.created_at?.slice(0, 10) || '—',
    timeRange: first?.timeRange,
    people: lignes.reduce((acc, l) => acc + Number(l.quantite || 0), 0),
    amount: Number(item?.montant_total || 0),
    montantReduction: item?.montant_reduction != null ? Number(item.montant_reduction) : null,
    devise: item?.devise || 'MAD',
    promotion: item?.promotion
      ? { libelle: item.promotion.libelle, code: item.promotion.code }
      : null,
    paiement: item?.paiement
      ? {
          statut: item.paiement.statut,
          montant: Number(item.paiement.montant || 0),
          payeLe: item.paiement.paye_le || null,
        }
      : null,
    linesDetail,
    lineCount: lignes.length,
    status: reservationUiStatus(backendStatut),
    backendStatus: backendStatut,
    createdAt: item?.created_at || null,
  }
}

/** Campagne publicitaire (agrégats Laravel: paiements_sum_montant, evenements_statistiques_count). */
function mapCampaignFromApi(item) {
  if (!item || typeof item !== 'object') return null
  const paye = item.paiements_sum_montant
  return {
    id: item.id,
    title: item.titre,
    imageUrl: normalizeMediaDisplayUrl(item.image_url) || null,
    emplacement: item.emplacement,
    ville: item.ville?.nom || null,
    categorie: item.categorie?.nom || null,
    activite: item.activite?.titre || null,
    villeId: item.ville_id ?? null,
    categorieId: item.categorie_id ?? null,
    activiteId: item.activite_id ?? null,
    debutAt: item.debut_at,
    finAt: item.fin_at,
    priorite: Number(item.priorite ?? 0),
    budget: Number(item.budget_montant || 0),
    montantPaye: paye != null && paye !== '' ? Number(paye) : 0,
    interactions: Number(item.evenements_statistiques_count ?? 0),
    status: item.statut || 'brouillon',
    prestataireId: item.prestataire_id,
  }
}

function appendCampaignFormData(formData, payload) {
  Object.entries(payload).forEach(([k, v]) => {
    if (v === undefined) return
    if (v === null) {
      formData.append(k, '')
      return
    }
    if (typeof v === 'object') return
    formData.append(k, String(v))
  })
}

export const prestataireApi = {
  async getProfiles() {
    const payload = await request('/prestataire/profil')
    return asList(payload)
  },

  async createProfile(data) {
    return request('/prestataire/profil', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async updateProfile(prestataireId, data) {
    return request(`/prestataire/profil/${prestataireId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  async submitProfileValidation(prestataireId) {
    return request(`/prestataire/profil/${prestataireId}/soumettre`, {
      method: 'POST',
    })
  },

  mapActivityFromApi(item) {
    if (!item) return null
    const medias = normalizeMediasArray(item.medias)
    medias.sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0))
    const coverUrl = mediaRowUrl(medias[0]) || medias[0]?.url || null
    return {
      id: item.id,
      title: item.titre,
      description: item.description || '',
      city: item?.ville?.nom || '-',
      lieuName: item?.lieu?.nom || null,
      category: item?.categorie?.nom || '-',
      categorieId: item.categorie_id,
      villeId: item.ville_id,
      lieuId: item.lieu_id ?? null,
      price: Number(item?.prix_base || 0),
      status:
        item?.statut === 'publiee'
          ? 'published'
          : item?.statut === 'en_attente_validation'
            ? 'pending_review'
            : 'draft',
      seats: item?.capacite_totale ?? '-',
      rawStatus: item?.statut,
      prestataireId: item?.prestataire_id,
      coverUrl,
      mediasCount: medias.length,
      creneauxCount: Number(item?.creneaux_count ?? 0),
    }
  },

  async getActivities() {
    const payload = await request('/prestataire/activites')
    return asList(payload).map((item) => prestataireApi.mapActivityFromApi(item))
  },

  async getActivityDetails(activityId) {
    const raw = await request(`/prestataire/activites/${activityId}`)
    const data = unwrapEntity(raw)
    if (!data || typeof data !== 'object') return data
    const medias = normalizeMediasArray(data.medias).sort(
      (a, b) => (a.ordre ?? 0) - (b.ordre ?? 0),
    )
    return { ...data, medias }
  },

  async updateActivity(activityId, data) {
    return request(`/prestataire/activites/${activityId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  async createActivity(payload) {
    return request('/prestataire/activites', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  async deleteActivity(activityId) {
    return request(`/prestataire/activites/${activityId}`, { method: 'DELETE' })
  },

  async uploadActivityMedia(activityId, file, ordre = 0) {
    const body = new FormData()
    body.append('image', file)
    body.append('ordre', String(ordre))
    const media = await requestFormData(`/prestataire/activites/${activityId}/medias`, body)
    const row = unwrapEntity(media)
    if (!row || typeof row !== 'object') return row
    return {
      ...row,
      url: mediaRowUrl(row) || row.url,
    }
  },

  async deleteActivityMedia(activityId, mediaId) {
    return request(`/prestataire/activites/${activityId}/medias/${mediaId}`, {
      method: 'DELETE',
    })
  },

  async updateCreneau(activityId, creneauId, data) {
    return request(`/prestataire/activites/${activityId}/creneaux/${creneauId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  async createCreneau(activityId, data) {
    return request(`/prestataire/activites/${activityId}/creneaux`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async deleteCreneau(activityId, creneauId) {
    return request(`/prestataire/activites/${activityId}/creneaux/${creneauId}`, {
      method: 'DELETE',
    })
  },

  async getReservations() {
    const payload = await request('/prestataire/reservations')
    return asList(payload)
      .map((item) => mapReservationFromApi(item))
      .filter(Boolean)
  },

  async updateReservationStatus(reservationId, statut) {
    const mapped = statut === 'confirmed' ? 'confirmee' : 'annulee'
    const raw = await request(`/prestataire/reservations/${reservationId}/statut`, {
      method: 'PATCH',
      body: JSON.stringify({ statut: mapped }),
    })
    return mapReservationFromApi(unwrapEntity(raw))
  },

  mapReviewFromApi(item) {
    if (!item || typeof item !== 'object') return null
    const reponse = item.reponse_prestataire
    return {
      id: item.id,
      client: item?.user?.name || '—',
      clientEmail: item?.user?.email || null,
      activityTitle: item?.activite?.titre || '—',
      activityCity: item?.activite?.ville?.nom || null,
      score: Number(item?.note || 0),
      text: item?.commentaire || '',
      statut: item?.statut || 'visible',
      date: item?.created_at?.slice(0, 10) || '—',
      reponduLe: item?.repondu_le || null,
      replied: Boolean(reponse && String(reponse).trim() !== ''),
      replyText: reponse || '',
    }
  },

  async getReviews(params = {}) {
    const page = params.page ?? 1
    const payload = await request(`/prestataire/avis?page=${page}`)
    const rows = Array.isArray(payload?.data) ? payload.data : asList(payload)
    return {
      items: rows.map((item) => prestataireApi.mapReviewFromApi(item)).filter(Boolean),
      current_page: payload.current_page ?? 1,
      last_page: payload.last_page ?? 1,
      total: payload.total ?? rows.length,
    }
  },

  async replyToReview(reviewId, reponsePrestataire) {
    const raw = await request(`/prestataire/avis/${reviewId}/reponse`, {
      method: 'POST',
      body: JSON.stringify({ reponse_prestataire: reponsePrestataire }),
    })
    return prestataireApi.mapReviewFromApi(unwrapEntity(raw))
  },

  async getStats() {
    return request('/prestataire/statistiques/dashboard')
  },

  /** Télécharge le CSV généré par GET /prestataire/statistiques/export (Bearer requis). */
  async downloadStatsExport(filename = 'rapport-prestataire.csv') {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY)
    const response = await fetch(`${API_BASE_URL}/prestataire/statistiques/export`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}))
      throw new Error(errorMessageFromPayload(payload) || 'Export indisponible.')
    }
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  },

  async getAds() {
    const payload = await request('/prestataire/mise-en-avant/campagnes')
    return asList(payload)
      .map((item) => mapCampaignFromApi(item))
      .filter(Boolean)
  },

  async updateAd(adId, payload, visuelFile = null) {
    if (visuelFile) {
      const fd = new FormData()
      appendCampaignFormData(fd, payload)
      fd.append('visuel', visuelFile)
      const raw = await requestFormData(
        `/prestataire/mise-en-avant/campagnes/${adId}`,
        fd,
        'POST',
      )
      return mapCampaignFromApi(unwrapEntity(raw))
    }
    const raw = await request(`/prestataire/mise-en-avant/campagnes/${adId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
    return mapCampaignFromApi(unwrapEntity(raw))
  },

  async createAd(payload, visuelFile = null) {
    if (visuelFile) {
      const fd = new FormData()
      appendCampaignFormData(fd, payload)
      fd.append('visuel', visuelFile)
      const raw = await requestFormData('/prestataire/mise-en-avant/campagnes', fd, 'POST')
      return mapCampaignFromApi(unwrapEntity(raw))
    }
    const raw = await request('/prestataire/mise-en-avant/campagnes', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    return mapCampaignFromApi(unwrapEntity(raw))
  },

  /** Simulation de paiement campagne (enregistre un PaiementPublicite ; la validation admin reste distincte). */
  async simulateCampagnePayment(campagneId, montant) {
    const raw = await request(
      `/prestataire/mise-en-avant/campagnes/${campagneId}/paiement/simuler`,
      {
        method: 'POST',
        body: JSON.stringify({ montant }),
      },
    )
    if (raw && typeof raw === 'object' && raw.campagne) {
      return mapCampaignFromApi(raw.campagne)
    }
    return null
  },

  async deleteAd(adId) {
    return request(`/prestataire/mise-en-avant/campagnes/${adId}`, {
      method: 'DELETE',
    })
  },

  async getPublicCatalog() {
    const [categories, villes] = await Promise.all([
      request('/public/categories'),
      request('/public/villes'),
    ])
    return { categories: asList(categories), villes: asList(villes) }
  },

  /** Pièces de vérification (PDF / images) pour validation admin. */
  async getVerificationDocuments(prestataireId) {
    const payload = await request(`/prestataire/profil/${prestataireId}/documents`)
    return Array.isArray(payload) ? payload : []
  },

  async uploadVerificationDocument(prestataireId, file, libelle) {
    const body = new FormData()
    body.append('fichier', file)
    if (libelle != null && String(libelle).trim() !== '') {
      body.append('libelle', String(libelle).trim())
    }
    const raw = await requestFormData(
      `/prestataire/profil/${prestataireId}/documents`,
      body,
      'POST',
    )
    return unwrapEntity(raw)
  },

  async deleteVerificationDocument(prestataireId, documentId) {
    return request(`/prestataire/profil/${prestataireId}/documents/${documentId}`, {
      method: 'DELETE',
    })
  },
}
