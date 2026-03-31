const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api'
const TOKEN_STORAGE_KEY = 'allevent_auth_token'

function getAuthHeaders() {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY)
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options.headers || {}),
    },
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload?.message || 'Erreur API client.')
  }
  return payload
}

function asList(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  return []
}

function statusToUi(status, dateString) {
  if (status === 'annulee' || status === 'remboursee') return 'cancelled'
  if (status === 'en_attente_paiement') return 'pending_payment'
  if (status === 'payee' || status === 'confirmee') {
    if (!dateString) return 'upcoming'
    return new Date(dateString) < new Date() ? 'done' : 'upcoming'
  }
  return 'upcoming'
}

export function mapReservationToUi(reservation) {
  const lignes = Array.isArray(reservation?.lignes) ? reservation.lignes : []
  const line = lignes[0]
  const creneau = line?.creneau
  let activite = creneau?.activite
  let latestFinMs = null
  for (const l of lignes) {
    const cr = l?.creneau
    if (cr?.activite && !activite) activite = cr.activite
    const fin = cr?.fin_at
    if (fin) {
      const t = new Date(fin).getTime()
      if (!Number.isNaN(t) && (latestFinMs == null || t > latestFinMs)) latestFinMs = t
    }
  }
  if (!activite && creneau?.activite) activite = creneau.activite
  const dateTime = creneau?.debut_at || reservation?.created_at
  const date = dateTime ? new Date(dateTime).toISOString().slice(0, 10) : '-'
  const hour = dateTime ? new Date(dateTime).toISOString().slice(11, 16) : '--:--'
  const amount = Number(reservation?.paiement?.montant ?? reservation?.montant_total ?? 0)
  const crenauxEnded = latestFinMs != null && latestFinMs < Date.now()
  const canLeaveReview =
    reservation?.statut === 'payee' && crenauxEnded && Boolean(activite?.id)

  return {
    id: reservation.id,
    activityId: activite?.id,
    title: activite?.titre || `Reservation #${reservation.id}`,
    providerName: activite?.prestataire?.nom || activite?.prestataire?.raison_sociale || '',
    city: activite?.ville?.nom || '-',
    placeName: activite?.lieu?.nom || '',
    placeAddress: activite?.lieu?.adresse || '',
    latitude: activite?.lieu?.latitude != null ? Number(activite.lieu.latitude) : null,
    longitude: activite?.lieu?.longitude != null ? Number(activite.lieu.longitude) : null,
    date,
    hour,
    guests: Number(line?.quantite || 1),
    amount,
    billetCode: reservation?.billet?.code_public || '',
    status: statusToUi(reservation?.statut, dateTime),
    backendStatus: reservation?.statut,
    canLeaveReview,
  }
}

export function mapFavoriteToUi(favori) {
  const activite = favori?.activite || {}
  return {
    id: activite.id,
    title: activite.titre || 'Activite',
    city: activite?.ville?.nom || '-',
    category: activite?.categorie?.nom || 'Activite',
    price: Number(activite?.prix_base || 0),
    rating: Number(activite?.note_moyenne || 0),
    image:
      activite?.medias?.[0]?.url ||
      'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80',
  }
}

function mapPanierLine(ligne) {
  const creneau = ligne?.creneau || {}
  const activite = creneau?.activite || {}
  const dateTime = creneau?.debut_at || null
  return {
    id: ligne?.id,
    creneauId: creneau?.id,
    title: activite?.titre || 'Activite',
    city: activite?.ville?.nom || '-',
    date: dateTime ? new Date(dateTime).toISOString().slice(0, 10) : '-',
    hour: dateTime ? new Date(dateTime).toISOString().slice(11, 16) : '--:--',
    quantite: Number(ligne?.quantite || 1),
    prixUnitaire: Number(ligne?.prix_unitaire_snapshot || activite?.prix_base || 0),
  }
}

export const clientApi = {
  async getDashboardData() {
    const [profilePayload, reservationsPayload, favoritesPayload] = await Promise.all([
      request('/client/profil'),
      request('/client/reservations'),
      request('/client/favoris'),
    ])

    const reservations = asList(reservationsPayload).map(mapReservationToUi)
    const favorites = asList(favoritesPayload).map(mapFavoriteToUi)
    const profile = profilePayload?.profil || {}

    return { profile, reservations, favorites }
  },

  async getReservations() {
    const payload = await request('/client/reservations')
    const rows = Array.isArray(payload?.data) ? payload.data : asList(payload)
    return rows.map(mapReservationToUi)
  },

  async getReservationDetail(reservationId) {
    const payload = await request(`/client/reservations/${reservationId}`)
    return mapReservationToUi(payload)
  },

  async cancelReservation(reservationId) {
    await request(`/client/reservations/${reservationId}/annuler`, { method: 'PATCH' })
  },

  async getFavorites() {
    const payload = await request('/client/favoris')
    return asList(payload).map(mapFavoriteToUi)
  },

  async removeFavorite(activityId) {
    await request(`/client/favoris/${activityId}`, { method: 'DELETE' })
  },

  async getProfile() {
    const payload = await request('/client/profil')
    const profil = payload?.profil || {}
    const user = payload?.user || {}
    return {
      firstName: profil?.prenom || '',
      lastName: profil?.nom || '',
      email: user?.email || '',
      phone: profil?.telephone || '',
      city: profil?.ville || '',
      birthday: profil?.date_naissance || '',
      avatar: profil?.avatar || '',
      memberSince: user?.created_at ? user.created_at.slice(0, 4) : '',
      name: user?.name || '',
    }
  },

  async updateProfile(form) {
    const fullName = `${form.firstName || ''} ${form.lastName || ''}`.trim()
    await request('/client/profil', {
      method: 'PATCH',
      body: JSON.stringify({
        name: fullName || undefined,
        email: form.email || undefined,
        prenom: form.firstName || undefined,
        nom: form.lastName || undefined,
        telephone: form.phone || undefined,
      }),
    })
  },

  mapReviewFromApi(item) {
    if (!item || typeof item !== 'object') return null
    return {
      id: item.id,
      reservationId: item.reservation_id ?? item?.reservation?.id,
      activity: item?.activite?.titre || 'Activité',
      score: Number(item?.note || 0),
      date: item?.created_at?.slice(0, 10) || '—',
      text: item?.commentaire || '',
      activityId: item?.activite_id ?? item?.activite?.id,
      statut: item?.statut || 'visible',
    }
  },

  /** Liste paginée GET /client/avis */
  async getReviews(params = {}) {
    const page = params.page ?? 1
    const payload = await request(`/client/avis?page=${page}`)
    const rows = Array.isArray(payload?.data) ? payload.data : asList(payload)
    return {
      items: rows.map((item) => clientApi.mapReviewFromApi(item)).filter(Boolean),
      current_page: payload.current_page ?? 1,
      last_page: payload.last_page ?? 1,
      total: payload.total ?? rows.length,
    }
  },

  async createReview({ reservationId, activityId, score, text }) {
    await request('/client/avis', {
      method: 'POST',
      body: JSON.stringify({
        reservation_id: Number(reservationId),
        activite_id: Number(activityId),
        note: Number(score),
        commentaire: text?.trim() ? text.trim() : null,
      }),
    })
  },

  async reportReview(reviewId, { motif, details }) {
    await request(`/client/avis/${reviewId}/signalements`, {
      method: 'POST',
      body: JSON.stringify({
        motif,
        details: details?.trim() ? details.trim() : null,
      }),
    })
  },

  async updateReview(reviewId, { score, text }) {
    await request(`/client/avis/${reviewId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        note: Number(score),
        commentaire: text,
      }),
    })
  },

  async deleteReview(reviewId) {
    await request(`/client/avis/${reviewId}`, { method: 'DELETE' })
  },

  async getLitiges() {
    const payload = await request('/client/litiges')
    return asList(payload)
  },

  async getLitigeDetail(litigeId) {
    return request(`/client/litiges/${litigeId}`)
  },

  async sendLitigeMessage(litigeId, message) {
    await request(`/client/litiges/${litigeId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    })
  },

  async getNotifications() {
    const payload = await request('/client/notifications')
    return asList(payload)
  },

  async getPanier() {
    const payload = await request('/client/panier')
    const lignes = Array.isArray(payload?.lignes) ? payload.lignes.map(mapPanierLine) : []
    return {
      id: payload?.id,
      statut: payload?.statut || 'actif',
      lignes,
    }
  },

  async viderPanier() {
    return request('/client/panier', { method: 'DELETE' })
  },

  async addPanierLigne(creneauId, quantite) {
    return request('/client/panier/lignes', {
      method: 'POST',
      body: JSON.stringify({
        creneau_id: Number(creneauId),
        quantite: Number(quantite),
      }),
    })
  },

  async updatePanierLigne(ligneId, quantite) {
    return request(`/client/panier/lignes/${ligneId}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantite: Number(quantite) }),
    })
  },

  async removePanierLigne(ligneId) {
    return request(`/client/panier/lignes/${ligneId}`, { method: 'DELETE' })
  },

  async validerPanier(payload = {}) {
    return request('/client/reservations', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  async simulerPaiementReservation(reservationId) {
    return request(`/client/reservations/${reservationId}/paiement/simuler`, {
      method: 'POST',
    })
  },

  async addFavorite(activiteId) {
    return request('/client/favoris', {
      method: 'POST',
      body: JSON.stringify({ activite_id: Number(activiteId) }),
    })
  },
}
