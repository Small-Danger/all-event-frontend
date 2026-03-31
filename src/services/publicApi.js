const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api'

const PLACEHOLDER_IMAGE =
  'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=900&q=80'

async function publicRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload?.message || 'Impossible de charger le catalogue.')
  }
  return payload
}

async function publicFormRequest(path, formData) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: formData,
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload?.message || 'Envoi de la demande impossible.')
  }
  return payload
}

function paginated(payload) {
  return {
    items: Array.isArray(payload?.data) ? payload.data : [],
    current_page: payload?.current_page ?? 1,
    last_page: payload?.last_page ?? 1,
    total: payload?.total ?? 0,
  }
}

export function mapActiviteCard(raw) {
  if (!raw || typeof raw !== 'object') return null
  const medias = [...(raw.medias || [])].sort((a, b) => (a.ordre || 0) - (b.ordre || 0))
  const first = medias[0]?.url
  return {
    id: raw.id,
    title: raw.titre || 'Activité',
    city: raw.ville?.nom || '',
    villeId: raw.ville_id,
    category: raw.categorie?.nom || '',
    categorieId: raw.categorie_id,
    rating: 0,
    reviews: Number(raw.avis_visible_count ?? 0),
    price: Number(raw.prix_base ?? 0),
    image: first || PLACEHOLDER_IMAGE,
    description: raw.description || '',
  }
}

export function mapActiviteDetail(raw) {
  const card = mapActiviteCard(raw)
  if (!card) return null
  const avis = Array.isArray(raw.avis) ? raw.avis : []
  const notes = avis.map((a) => Number(a.note)).filter((n) => !Number.isNaN(n) && n > 0)
  const avg = notes.length ? notes.reduce((s, n) => s + n, 0) / notes.length : 0
  const creneaux = Array.isArray(raw.creneaux)
    ? raw.creneaux.map((c) => ({
        id: c.id,
        debutAt: c.debut_at,
        finAt: c.fin_at,
        places: Number(c.capacite_restante ?? 0),
        prix: c.prix_applique != null ? Number(c.prix_applique) : card.price,
      }))
    : []
  return {
    ...card,
    rating: Math.round(avg * 10) / 10,
    reviews: avis.length || card.reviews,
    lieu: raw.lieu,
    description: raw.description || '',
    creneaux,
    avisList: avis,
    raw,
  }
}

export const publicApi = {
  async getActivites(params = {}) {
    const sp = new URLSearchParams()
    if (params.page) sp.set('page', String(params.page))
    if (params.per_page) sp.set('per_page', String(params.per_page))
    if (params.ville_id) sp.set('ville_id', String(params.ville_id))
    if (params.categorie_id) sp.set('categorie_id', String(params.categorie_id))
    if (params.q) sp.set('q', String(params.q).trim())
    if (params.prix_min != null && params.prix_min !== '') sp.set('prix_min', String(params.prix_min))
    if (params.prix_max != null && params.prix_max !== '') sp.set('prix_max', String(params.prix_max))
    const q = sp.toString()
    const payload = await publicRequest(`/public/activites${q ? `?${q}` : ''}`)
    const { items, current_page, last_page, total } = paginated(payload)
    return {
      items: items.map(mapActiviteCard).filter(Boolean),
      current_page,
      last_page,
      total,
    }
  },

  async getActivite(id) {
    const raw = await publicRequest(`/public/activites/${id}`)
    return mapActiviteDetail(raw)
  },

  async getCategories() {
    const rows = await publicRequest('/public/categories')
    return Array.isArray(rows) ? rows : []
  },

  async getVilles() {
    const rows = await publicRequest('/public/villes')
    return Array.isArray(rows) ? rows : []
  },

  async submitPrestataireApplication(payload) {
    const body = new FormData()
    body.append('owner_name', payload.ownerName)
    body.append('email', payload.email)
    body.append('password', payload.password)
    body.append('password_confirmation', payload.passwordConfirmation)
    body.append('nom', payload.businessName)
    body.append('raison_sociale', payload.legalName)
    body.append('numero_fiscal', payload.fiscalNumber)
    ;(payload.documents || []).forEach((doc, idx) => {
      body.append('documents[]', doc.file)
      if (doc.label && String(doc.label).trim()) {
        body.append('documents_libelles[]', String(doc.label).trim())
      } else {
        body.append('documents_libelles[]', '')
      }
      body.append(`_doc_idx_${idx}`, String(idx))
    })
    return publicFormRequest('/public/auth/prestataire/register', body)
  },
}
