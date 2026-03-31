const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api'
const TOKEN_STORAGE_KEY = 'allevent_auth_token'

function getHeaders() {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY)
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
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
    throw new Error(errorMessageFromPayload(payload) || 'Erreur API administrateur.')
  }
  return payload
}

export const adminApi = {
  /** GET /admin/statistiques/dashboard — agrégats SQL (users, litiges, réservations, CA, etc.). */
  async getDashboardStats() {
    return request('/admin/statistiques/dashboard')
  },

  async getExecutiveStats(params = {}) {
    const q = new URLSearchParams()
    if (params.from) q.set('from', params.from)
    if (params.to) q.set('to', params.to)
    if (params.ville_id) q.set('ville_id', String(params.ville_id))
    if (params.categorie_id) q.set('categorie_id', String(params.categorie_id))
    const suffix = q.toString() ? `?${q.toString()}` : ''
    return request(`/admin/statistiques/executive${suffix}`)
  },

  async getMarketplaceStats(params = {}) {
    const q = new URLSearchParams()
    if (params.from) q.set('from', params.from)
    if (params.to) q.set('to', params.to)
    if (params.ville_id) q.set('ville_id', String(params.ville_id))
    if (params.categorie_id) q.set('categorie_id', String(params.categorie_id))
    const suffix = q.toString() ? `?${q.toString()}` : ''
    return request(`/admin/statistiques/marketplace${suffix}`)
  },

  async getDemandStats(params = {}) {
    const q = new URLSearchParams()
    if (params.from) q.set('from', params.from)
    if (params.to) q.set('to', params.to)
    if (params.ville_id) q.set('ville_id', String(params.ville_id))
    if (params.categorie_id) q.set('categorie_id', String(params.categorie_id))
    const suffix = q.toString() ? `?${q.toString()}` : ''
    return request(`/admin/statistiques/demand${suffix}`)
  },

  async getRiskStats(params = {}) {
    const q = new URLSearchParams()
    if (params.from) q.set('from', params.from)
    if (params.to) q.set('to', params.to)
    const suffix = q.toString() ? `?${q.toString()}` : ''
    return request(`/admin/statistiques/risk${suffix}`)
  },

  async getDataProductsStats(params = {}) {
    const q = new URLSearchParams()
    if (params.from) q.set('from', params.from)
    if (params.to) q.set('to', params.to)
    if (params.ville_id) q.set('ville_id', String(params.ville_id))
    if (params.categorie_id) q.set('categorie_id', String(params.categorie_id))
    const suffix = q.toString() ? `?${q.toString()}` : ''
    return request(`/admin/statistiques/data-products${suffix}`)
  },

  /** Liste paginée GET /admin/utilisateurs (query: role, status, page). */
  async getUsers(params = {}) {
    const q = new URLSearchParams()
    if (params.role) q.set('role', params.role)
    if (params.status) q.set('status', params.status)
    if (params.page) q.set('page', String(params.page))
    const suffix = q.toString() ? `?${q.toString()}` : ''
    return request(`/admin/utilisateurs${suffix}`)
  },

  async getUser(userId) {
    return request(`/admin/utilisateurs/${userId}`)
  },

  /** Supprime le compte et bloque email + téléphone profil pour toute réinscription. */
  async blockUser(userId) {
    return request(`/admin/utilisateurs/${userId}/bloquer`, { method: 'POST' })
  },

  /** Liste paginée GET /admin/identifiants-bloques (query: type=email|telephone, page). */
  async getBlockedIdentifiers(params = {}) {
    const q = new URLSearchParams()
    if (params.type) q.set('type', params.type)
    if (params.page) q.set('page', String(params.page))
    const suffix = q.toString() ? `?${q.toString()}` : ''
    return request(`/admin/identifiants-bloques${suffix}`)
  },

  /** Lève le blocage sur un identifiant (réautorise une nouvelle inscription). */
  async unblockIdentifier(identifiantBloqueId) {
    return request(`/admin/identifiants-bloques/${identifiantBloqueId}`, { method: 'DELETE' })
  },

  /** GET /admin/prestataires — liste paginée (query: statut, page). */
  async getPrestataires(params = {}) {
    const q = new URLSearchParams()
    if (params.statut) q.set('statut', params.statut)
    if (params.page) q.set('page', String(params.page))
    const suffix = q.toString() ? `?${q.toString()}` : ''
    return request(`/admin/prestataires${suffix}`)
  },

  async getPrestataire(prestataireId) {
    return request(`/admin/prestataires/${prestataireId}`)
  },

  /** PATCH /admin/prestataires/{id}/statut — en_attente_validation | valide | rejete */
  async updatePrestataireStatut(prestataireId, statut, motifRejet = '') {
    return request(`/admin/prestataires/${prestataireId}/statut`, {
      method: 'PATCH',
      body: JSON.stringify({
        statut,
        ...(statut === 'rejete' ? { motif_rejet: motifRejet } : {}),
      }),
    })
  },

  /** Liste des pièces de vérification (sans chemin disque). */
  async getPrestataireDocuments(prestataireId) {
    const payload = await request(`/admin/prestataires/${prestataireId}/documents`)
    return Array.isArray(payload) ? payload : []
  },

  /** Télécharge le fichier (Bearer requis). */
  async downloadPrestataireDocument(prestataireId, documentId, filename = 'document') {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY)
    const response = await fetch(
      `${API_BASE_URL}/admin/prestataires/${prestataireId}/documents/${documentId}/telecharger`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} },
    )
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}))
      throw new Error(errorMessageFromPayload(payload) || 'Téléchargement impossible.')
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

  /** Catalogue global GET /admin/contenu/activites (query: statut=brouillon|publiee, page). */
  async getActivities(params = {}) {
    const q = new URLSearchParams()
    if (params.statut) q.set('statut', params.statut)
    if (params.page) q.set('page', String(params.page))
    const suffix = q.toString() ? `?${q.toString()}` : ''
    return request(`/admin/contenu/activites${suffix}`)
  },

  async getActivity(activityId) {
    return request(`/admin/contenu/activites/${activityId}`)
  },

  async updateActivity(activityId, payload) {
    return request(`/admin/contenu/activites/${activityId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },

  async deleteActivity(activityId) {
    return request(`/admin/contenu/activites/${activityId}`, { method: 'DELETE' })
  },

  /** Commissions — règles applicables (query: prestataire_id, page). */
  async getCommissionRegles(params = {}) {
    const q = new URLSearchParams()
    if (params.prestataire_id) q.set('prestataire_id', String(params.prestataire_id))
    if (params.page) q.set('page', String(params.page))
    const suffix = q.toString() ? `?${q.toString()}` : ''
    return request(`/admin/commissions/regles${suffix}`)
  },

  async createCommissionRegle(payload) {
    return request('/admin/commissions/regles', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  async updateCommissionRegle(regleId, payload) {
    return request(`/admin/commissions/regles/${regleId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },

  /** Commissions calculées (query: prestataire_id, page). */
  async getCommissions(params = {}) {
    const q = new URLSearchParams()
    if (params.prestataire_id) q.set('prestataire_id', String(params.prestataire_id))
    if (params.page) q.set('page', String(params.page))
    const suffix = q.toString() ? `?${q.toString()}` : ''
    return request(`/admin/commissions${suffix}`)
  },

  async getRemboursements(params = {}) {
    const q = new URLSearchParams()
    if (params.page) q.set('page', String(params.page))
    const suffix = q.toString() ? `?${q.toString()}` : ''
    return request(`/admin/remboursements${suffix}`)
  },

  async traiterRemboursement(remboursementId, statut) {
    return request(`/admin/remboursements/${remboursementId}`, {
      method: 'PATCH',
      body: JSON.stringify({ statut }),
    })
  },

  /** Litiges admin (query: statut, page). */
  async getLitiges(params = {}) {
    const q = new URLSearchParams()
    if (params.statut) q.set('statut', params.statut)
    if (params.page) q.set('page', String(params.page))
    const suffix = q.toString() ? `?${q.toString()}` : ''
    return request(`/admin/litiges${suffix}`)
  },

  async getLitige(litigeId) {
    return request(`/admin/litiges/${litigeId}`)
  },

  async updateLitige(litigeId, payload) {
    return request(`/admin/litiges/${litigeId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },

  async sendLitigeMessage(litigeId, message) {
    return request(`/admin/litiges/${litigeId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    })
  },

  async sendLitigeInternalMessage(litigeId, message) {
    return request(`/admin/litiges/${litigeId}/messages-internes`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    })
  },

  /** Publicités admin — campagnes (query: page). */
  async getAdCampagnes(params = {}) {
    const q = new URLSearchParams()
    if (params.page) q.set('page', String(params.page))
    const suffix = q.toString() ? `?${q.toString()}` : ''
    return request(`/admin/annonces/campagnes${suffix}`)
  },

  async updateAdCampagne(campagneId, payload) {
    return request(`/admin/annonces/campagnes/${campagneId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },

  async updateAdCampagneStatut(campagneId, statut) {
    return request(`/admin/annonces/campagnes/${campagneId}/statut`, {
      method: 'PATCH',
      body: JSON.stringify({ statut }),
    })
  },

  async deleteAdCampagne(campagneId) {
    return request(`/admin/annonces/campagnes/${campagneId}`, { method: 'DELETE' })
  },

  /** Paiements publicitaires (query: page). */
  async getAdPaiements(params = {}) {
    const q = new URLSearchParams()
    if (params.page) q.set('page', String(params.page))
    const suffix = q.toString() ? `?${q.toString()}` : ''
    return request(`/admin/annonces/paiements${suffix}`)
  },

  /** Modération avis — GET /admin/avis (query: statut, page). */
  async getReviews(params = {}) {
    const q = new URLSearchParams()
    if (params.statut) q.set('statut', params.statut)
    if (params.page) q.set('page', String(params.page))
    const suffix = q.toString() ? `?${q.toString()}` : ''
    return request(`/admin/avis${suffix}`)
  },

  /** File des signalements — GET /admin/avis/signalements */
  async getReviewSignalements(params = {}) {
    const q = new URLSearchParams()
    if (params.statut) q.set('statut', params.statut)
    if (params.page) q.set('page', String(params.page))
    const suffix = q.toString() ? `?${q.toString()}` : ''
    return request(`/admin/avis/signalements${suffix}`)
  },

  async updateReviewStatut(reviewId, statut) {
    return request(`/admin/avis/${reviewId}/statut`, {
      method: 'PATCH',
      body: JSON.stringify({ statut }),
    })
  },

  async deleteReview(reviewId) {
    return request(`/admin/avis/${reviewId}`, { method: 'DELETE' })
  },

  async downloadStatsExport(filename = 'rapport-admin-allevent.csv') {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY)
    const response = await fetch(`${API_BASE_URL}/admin/statistiques/export`, {
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
}
