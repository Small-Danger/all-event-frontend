import { Link, useLocation, useNavigate, useOutletContext, useParams, useSearchParams } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { Check, MapPin, Star, Tag, Wallet } from 'lucide-react'
import logoAllevent from '../../assets/brand/logo-allevent.png'
import { useAuth } from '../../context/useAuth'
import { clientApi } from '../../services/clientApi'
import { publicApi } from '../../services/publicApi'
import { prestataireApi } from '../../services/prestataireApi'
import { AuthPasswordField } from '../../components/AuthPasswordField'
import './public.css'

function resolveHomeByRole(role) {
  if (role === 'admin') return '/admin/dashboard'
  if (role === 'prestataire') return '/prestataire/dashboard'
  return '/'
}

export function LandingPage() {
  const { auth } = useAuth()
  const navigate = useNavigate()
  const isClient = auth.isAuthenticated && auth.role === 'client'

  const heroSlides = useMemo(() => {
    const slides = [
      {
        id: 1,
        title: 'Le meilleur des expériences en un seul endroit',
        text: 'Concerts, loisirs, sorties famille et aventures locales sélectionnées pour vous.',
        image:
          'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1400&q=80',
        cta: '/search',
        ctaLabel: 'Explorer maintenant',
      },
    ]
    if (!isClient) {
      slides.push({
        id: 2,
        title: 'Réservez en quelques clics',
        text: 'Parcours simple, activités vérifiées et tarifs transparents.',
        image:
          'https://images.unsplash.com/photo-1505236858219-8359eb29e329?auto=format&fit=crop&w=1400&q=80',
        cta: '/register',
        ctaLabel: 'Créer un compte',
      })
    }
    slides.push({
      id: 3,
      title: 'Passez pro avec ALL EVENT',
      text: 'Publiez vos activités, gérez vos réservations et développez votre activité.',
      image:
        'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1400&q=80',
      cta: '/become-prestataire',
      ctaLabel: 'Devenir prestataire',
    })
    return slides
  }, [isClient])

  const [activeSlide, setActiveSlide] = useState(0)
  const [featuredActivities, setFeaturedActivities] = useState([])
  const [featLoading, setFeatLoading] = useState(true)
  const [featError, setFeatError] = useState('')
  const [quickQ, setQuickQ] = useState('')
  const [villesOptions, setVillesOptions] = useState([])
  const [quickVilleId, setQuickVilleId] = useState('')

  useEffect(() => {
    setActiveSlide(0)
  }, [heroSlides.length])

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % heroSlides.length)
    }, 4500)
    return () => clearInterval(timer)
  }, [heroSlides.length])

  useEffect(() => {
    let active = true
    publicApi
      .getVilles()
      .then((rows) => {
        if (!active) return
        setVillesOptions(Array.isArray(rows) ? rows : [])
      })
      .catch(() => {
        if (active) setVillesOptions([])
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    setFeatLoading(true)
    setFeatError('')
    publicApi
      .getActivites({ per_page: 6 })
      .then((data) => {
        if (!active) return
        setFeaturedActivities(data.items || [])
      })
      .catch((err) => {
        if (!active) return
        setFeatError(err instanceof Error ? err.message : 'Erreur catalogue.')
        setFeaturedActivities([])
      })
      .finally(() => {
        if (active) setFeatLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const onQuickSearch = (event) => {
    event.preventDefault()
    const sp = new URLSearchParams()
    if (quickQ.trim()) sp.set('q', quickQ.trim())
    if (quickVilleId) sp.set('ville_id', quickVilleId)
    navigate(`/search${sp.toString() ? `?${sp.toString()}` : ''}`)
  }

  return (
    <main className="landing">
      <section className="hero-carousel">
        {heroSlides.map((slide, index) => (
          <article
            key={slide.id}
            className={`hero-slide ${index === activeSlide ? 'active' : ''}`}
          >
            <img src={slide.image} alt={slide.title} />
            <div className="hero-overlay" />
            <div className="hero-content">
              <p className="hero-kicker">ALL EVENT</p>
              <h1>{slide.title}</h1>
              <p>{slide.text}</p>
              <div className="hero-buttons">
                <Link className="btn btn-primary" to={slide.cta}>
                  {slide.ctaLabel}
                </Link>
                <Link className="btn btn-light" to="/search">
                  Voir les activites
                </Link>
              </div>
            </div>
          </article>
        ))}
        <div className="hero-dots">
          {heroSlides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              className={index === activeSlide ? 'active' : ''}
              onClick={() => setActiveSlide(index)}
              aria-label={`Slide ${index + 1}`}
            />
          ))}
        </div>
      </section>

      <section className="landing-proof">
        <article>
          <strong>+12 000</strong>
          <p>reservations confirmees</p>
        </article>
        <article>
          <strong>4.8 / 5</strong>
          <p>satisfaction moyenne</p>
        </article>
        <article>
          <strong>+320</strong>
          <p>prestataires verifies</p>
        </article>
      </section>

      <section className="quick-actions">
        <div className="quick-actions-header">
          <h2>Trouve ton experience en quelques secondes</h2>
          <p>
            Recherche par ville, date, categorie et budget avec un parcours
            ultra rapide.
          </p>
        </div>
        <form className="quick-actions-bar" onSubmit={onQuickSearch}>
          <input
            type="search"
            placeholder="Rechercher une activité..."
            value={quickQ}
            onChange={(e) => setQuickQ(e.target.value)}
            aria-label="Mots-clés"
          />
          <select
            value={quickVilleId}
            onChange={(e) => setQuickVilleId(e.target.value)}
            aria-label="Ville"
          >
            <option value="">Toutes les villes</option>
            {villesOptions.map((v) => (
              <option key={v.id} value={String(v.id)}>
                {v.nom}
              </option>
            ))}
          </select>
          <button type="submit" className="btn btn-primary">
            Rechercher
          </button>
        </form>
      </section>

      <section className="activities-section">
        <div className="section-head">
          <h2>Activites a la une</h2>
          <Link to="/search">Voir tout le catalogue</Link>
        </div>
        {featLoading && <p className="landing-catalog-hint">Chargement des activités…</p>}
        {!featLoading && featError && (
          <p className="landing-catalog-hint landing-catalog-hint--error">{featError}</p>
        )}
        {!featLoading && !featError && featuredActivities.length === 0 && (
          <p className="landing-catalog-hint">
            Aucune activité publiée pour le moment. Revenez bientôt ou explorez le catalogue complet.
          </p>
        )}
        {/* [DESIGN] Cards activités en scroll horizontal sur mobile */}
        <div className="activity-grid activity-grid-scroll">
          {featuredActivities.map((item) => (
            <Link
              key={item.id}
              to={`/activity/${item.id}`}
              className="activity-cardLink"
            >
              <article className="activity-card activity-card-mobile">
                <div className="activity-media">
                  <img src={item.image} alt="" />
                  <span className="activity-badge">{item.category}</span>
                </div>
                <div className="activity-content">
                  <h3>{item.title}</h3>
                  <p className="activity-meta">{item.city}</p>
                  <p className="activity-rating">
                    {item.reviews > 0 ? `${item.reviews} avis` : 'Nouveau sur la plateforme'}
                  </p>
                  <div className="activity-footer">
                    <strong>{item.price.toLocaleString('fr-FR')} MAD</strong>
                    <span className="activity-details">Détails</span>
                  </div>
                </div>
              </article>
            </Link>
          ))}
        </div>
      </section>

      <section className="landing-steps">
        <h2>Comment ca marche ?</h2>
        <div className="landing-steps-grid">
          <article>
            <span>01</span>
            <h3>Explore</h3>
            <p>
              Parcours les experiences par categorie, ville, date, budget et
              note utilisateur.
            </p>
          </article>
          <article>
            <span>02</span>
            <h3>Reserve</h3>
            <p>
              Compare les options, choisis ton creneau, puis confirme rapidement
              avec un parcours fluide.
            </p>
          </article>
          <article>
            <span>03</span>
            <h3>Profite</h3>
            <p>
              Recois ta confirmation, retrouve les details pratiques et profite
              pleinement de ton activite.
            </p>
          </article>
          <article>
            <span>04</span>
            <h3>Evalue</h3>
            <p>
              Laisse ton avis pour aider la communaute et faire monter les
              meilleures experiences.
            </p>
          </article>
        </div>
      </section>

      <section className="become-pro">
        <div className="become-pro-content">
          <img src={logoAllevent} alt="ALL EVENT logo" />
          <div>
            <h2>Tu proposes des activites ? Rejoins ALL EVENT</h2>
            <p>
              Gagne en visibilite, automatise tes reservations et pilote ton
              activite avec des outils pro modernes.
            </p>
          </div>
        </div>
        <div className="become-pro-benefits">
          <article>
            <h3>Visibilite maximale</h3>
            <p>Touche des clients qualifies sur tout le territoire.</p>
          </article>
          <article>
            <h3>Gestion simplifiee</h3>
            <p>Disponibilites, reservations et suivi centralises.</p>
          </article>
          <article>
            <h3>Performance business</h3>
            <p>Tableaux de bord et insights pour booster tes ventes.</p>
          </article>
        </div>
        <div className="become-pro-actions">
          <Link className="btn btn-primary" to="/become-prestataire">
            Commencer maintenant
          </Link>
          {!isClient ? (
            <Link className="btn btn-light" to="/register">
              Créer mon compte
            </Link>
          ) : null}
        </div>
      </section>

      <section className="trust-section">
        <article>
          <h3>Activites verifiees</h3>
          <p>Chaque annonce passe une verification avant mise en ligne.</p>
        </article>
        <article>
          <h3>Support rapide</h3>
          <p>Assistance disponible pour clients et prestataires.</p>
        </article>
        <article>
          <h3>Paiement securise</h3>
          <p>Flux de paiement trace et notifications transactionnelles.</p>
        </article>
      </section>
    </main>
  )
}

export function SearchPage() {
  const outlet = useOutletContext()
  const publicCity = outlet?.publicCity
  const [searchParams] = useSearchParams()

  const [villes, setVilles] = useState([])
  const [categories, setCategories] = useState([])
  const [items, setItems] = useState([])
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [search, setSearch] = useState(() => searchParams.get('q') || '')
  const [villeId, setVilleId] = useState(() => searchParams.get('ville_id') || '')
  const [categorieId, setCategorieId] = useState(() => searchParams.get('categorie_id') || '')

  useEffect(() => {
    setSearch(searchParams.get('q') || '')
    setVilleId(searchParams.get('ville_id') || '')
    setCategorieId(searchParams.get('categorie_id') || '')
    setPage(1)
  }, [searchParams])
  const [sortBy, setSortBy] = useState('recent')
  const [minPrice, setMinPrice] = useState(0)
  const [maxPrice, setMaxPrice] = useState(500000)

  useEffect(() => {
    let active = true
    Promise.all([publicApi.getVilles(), publicApi.getCategories()])
      .then(([v, c]) => {
        if (!active) return
        setVilles(Array.isArray(v) ? v : [])
        setCategories(Array.isArray(c) ? c : [])
      })
      .catch(() => {
        if (active) {
          setVilles([])
          setCategories([])
        }
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!publicCity || !villes.length) return
    if (searchParams.get('ville_id')) return
    const match = villes.find(
      (x) =>
        String(x.nom || '')
          .toLowerCase()
          .includes(String(publicCity).toLowerCase()) ||
        String(publicCity).toLowerCase().includes(String(x.nom || '').toLowerCase()),
    )
    if (match) setVilleId(String(match.id))
  }, [publicCity, villes, searchParams])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    publicApi
      .getActivites({
        page,
        per_page: 12,
        q: search.trim() || undefined,
        ville_id: villeId || undefined,
        categorie_id: categorieId || undefined,
        prix_min: minPrice > 0 ? minPrice : undefined,
        prix_max: maxPrice < 500000 ? maxPrice : undefined,
      })
      .then((data) => {
        if (!active) return
        let list = data.items || []
        if (sortBy === 'price_asc') list = [...list].sort((a, b) => a.price - b.price)
        else if (sortBy === 'price_desc') list = [...list].sort((a, b) => b.price - a.price)
        else if (sortBy === 'popular') list = [...list].sort((a, b) => b.reviews - a.reviews)
        setItems(list)
        setLastPage(data.last_page || 1)
        setTotal(data.total ?? list.length)
      })
      .catch((err) => {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Erreur catalogue.')
        setItems([])
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [page, search, villeId, categorieId, minPrice, maxPrice, sortBy])

  const resetFilters = () => {
    setSearch('')
    setVilleId('')
    setCategorieId('')
    setSortBy('recent')
    setMinPrice(0)
    setMaxPrice(500000)
    setPage(1)
  }

  const displayList = items

  return (
    <main className="catalog-page">
      <section className="catalog-head">
        <h1>Explorer les activités</h1>
        <p>
          Activités publiées par nos prestataires partenaires — filtrez par ville, catégorie et budget.
        </p>
      </section>

      <section className="catalog-filters">
        {/* [DESIGN] Chips filtres horizontales (les selects restent cachés pour la logique) */}
        <div className="catalog-filter-chips" aria-label="Filtres rapides">
          <button
            type="button"
            className="catalog-chip"
            onClick={() => {
              const current = villes.find((v) => String(v.id) === String(villeId))
              if (!villes.length) return
              if (!current) {
                setVilleId(String(villes[0].id))
              } else {
                const idx = villes.findIndex((v) => String(v.id) === String(villeId))
                const next = villes[(idx + 1) % villes.length]
                setVilleId(String(next.id))
              }
              setPage(1)
            }}
          >
            <MapPin size={13} />
            <span>{villes.find((v) => String(v.id) === String(villeId))?.nom || 'Toutes les villes'}</span>
          </button>
          <button
            type="button"
            className="catalog-chip"
            onClick={() => {
              if (!categories.length) return
              if (!categorieId) {
                setCategorieId(String(categories[0].id))
              } else {
                const idx = categories.findIndex((c) => String(c.id) === String(categorieId))
                const next = categories[(idx + 1) % categories.length]
                setCategorieId(String(next.id))
              }
              setPage(1)
            }}
          >
            <Tag size={13} />
            <span>{categories.find((c) => String(c.id) === String(categorieId))?.nom || 'Toutes catégories'}</span>
          </button>
          <button
            type="button"
            className="catalog-chip"
            onClick={() => {
              const isDefault = minPrice === 0 && maxPrice === 500000
              const isLow = minPrice === 0 && maxPrice === 100000
              if (isDefault) {
                setMinPrice(0)
                setMaxPrice(100000)
              } else if (isLow) {
                setMinPrice(100000)
                setMaxPrice(500000)
              } else {
                setMinPrice(0)
                setMaxPrice(500000)
              }
              setPage(1)
            }}
          >
            <Wallet size={13} />
            <span>
              {minPrice === 0 && maxPrice === 500000
                ? 'Tous les prix'
                : minPrice === 0 && maxPrice === 100000
                  ? 'Budget doux'
                  : 'Premium'}
            </span>
          </button>
        </div>
        <input
          type="search"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            setPage(1)
          }}
          placeholder="Rechercher une activité..."
          aria-label="Rechercher une activité"
        />
        <select
          className="catalog-select-hidden"
          value={villeId}
          onChange={(event) => {
            setVilleId(event.target.value)
            setPage(1)
          }}
        >
          <option value="">Toutes les villes</option>
          {villes.map((v) => (
            <option key={v.id} value={String(v.id)}>
              {v.nom}
            </option>
          ))}
        </select>
        <select
          className="catalog-select-hidden"
          value={categorieId}
          onChange={(event) => {
            setCategorieId(event.target.value)
            setPage(1)
          }}
        >
          <option value="">Toutes les catégories</option>
          {categories.map((c) => (
            <option key={c.id} value={String(c.id)}>
              {c.nom}
            </option>
          ))}
        </select>
        <select
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value)}
          aria-label="Trier les activités"
        >
          <option value="recent">Plus récentes</option>
          <option value="popular">Plus d&apos;avis</option>
          <option value="price_asc">Prix croissant</option>
          <option value="price_desc">Prix décroissant</option>
        </select>
        <div className="catalog-range">
          <label htmlFor="minPrice">Prix min : {minPrice.toLocaleString('fr-FR')} MAD</label>
          <input
            id="minPrice"
            type="range"
            min="0"
            max="200000"
            step="5000"
            value={minPrice}
            onChange={(event) => {
              setMinPrice(Number(event.target.value))
              setPage(1)
            }}
          />
        </div>
        <div className="catalog-range">
          <label htmlFor="maxPrice">Prix max : {maxPrice.toLocaleString('fr-FR')} MAD</label>
          <input
            id="maxPrice"
            type="range"
            min="5000"
            max="500000"
            step="5000"
            value={maxPrice}
            onChange={(event) => {
              setMaxPrice(Number(event.target.value))
              setPage(1)
            }}
          />
        </div>
        <button type="button" className="btn btn-light catalog-reset" onClick={resetFilters}>
          Réinitialiser les filtres
        </button>
      </section>

      <section className="catalog-results">
        {loading && <p className="catalog-count">Chargement…</p>}
        {!loading && error && <p className="catalog-count catalog-count--error">{error}</p>}
        {!loading && !error && (
          <p className="catalog-count">
            {total} résultat{total > 1 ? 's' : ''}
            {lastPage > 1 ? ` — page ${page} / ${lastPage}` : ''}
          </p>
        )}

        {!loading && !error && displayList.length === 0 && (
          <p className="catalog-empty">Aucune activité ne correspond à ces critères.</p>
        )}

        <div className="catalog-grid">
          {displayList.map((item) => (
            <Link
              key={item.id}
              to={`/activity/${item.id}`}
              className="catalog-cardLink"
            >
              <article className="catalog-card">
                <div className="catalog-media">
                  <img src={item.image} alt="" />
                  <span className="catalog-badge">{item.category}</span>
                </div>
                <div className="catalog-content">
                  <h3>{item.title}</h3>
                  <p>{item.city}</p>
                  <p>{item.reviews > 0 ? `${item.reviews} avis` : 'Nouveau'}</p>
                  <div className="catalog-footer">
                    <strong>{item.price.toLocaleString('fr-FR')} MAD</strong>
                    <span>Détails</span>
                  </div>
                </div>
              </article>
            </Link>
          ))}
        </div>

        {!loading && lastPage > 1 ? (
          <div className="catalog-pager">
            <button
              type="button"
              className="btn btn-light"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Précédent
            </button>
            <button
              type="button"
              className="btn btn-light"
              disabled={page >= lastPage}
              onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
            >
              Suivant
            </button>
          </div>
        ) : null}
      </section>
    </main>
  )
}

export function ActivityDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { auth } = useAuth()
  const isClient = auth.isAuthenticated && auth.role === 'client'

  const [activity, setActivity] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [creneauId, setCreneauId] = useState('')
  const [qty, setQty] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    publicApi
      .getActivite(id)
      .then((data) => {
        if (!active) return
        setActivity(data)
        if (data?.creneaux?.length) setCreneauId(String(data.creneaux[0].id))
        else setCreneauId('')
      })
      .catch((err) => {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Erreur.')
        setActivity(null)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [id])

  const selectedCreneau = activity?.creneaux?.find((c) => String(c.id) === String(creneauId))
  const maxPlaces = selectedCreneau ? Math.min(20, Math.max(1, selectedCreneau.places)) : 1

  const onAddToPanier = async (redirectToPanier = true) => {
    setFeedback('')
    if (!isClient) {
      navigate('/login', { state: { from: location } })
      return false
    }
    if (!creneauId || !activity) {
      setFeedback('Choisissez un créneau disponible.')
      return false
    }
    setSubmitting(true)
    try {
      await clientApi.addPanierLigne(Number(creneauId), Math.min(qty, maxPlaces))
      if (redirectToPanier) {
        navigate('/panier')
      } else {
        setFeedback('Ajouté au panier.')
      }
      return true
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Ajout panier impossible.')
      return false
    } finally {
      setSubmitting(false)
    }
  }

  const onReserveNow = async () => {
    const added = await onAddToPanier(false)
    if (!added) return
    setSubmitting(true)
    try {
      const checkout = await clientApi.validerPanier()
      const reservationId = checkout?.reservation?.id
      if (reservationId) {
        await clientApi.simulerPaiementReservation(reservationId)
      }
      navigate('/reservations')
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Réservation impossible.')
    } finally {
      setSubmitting(false)
    }
  }

  const onFavorite = async () => {
    setFeedback('')
    if (!isClient) {
      navigate('/login', { state: { from: location } })
      return
    }
    try {
      await clientApi.addFavorite(Number(id))
      setFeedback('Ajouté à vos favoris.')
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Action impossible.')
    }
  }

  if (loading) {
    return (
      <main className="activity-page">
        <p className="activity-state">Chargement de l&apos;activité…</p>
      </main>
    )
  }

  if (error || !activity) {
    return (
      <main className="simple-page">
        <section className="simple-card">
          <h1>Activité introuvable</h1>
          <p>Cette activité n&apos;est pas publiée ou n&apos;existe pas.</p>
          <Link to="/search" className="btn btn-primary">
            Retour au catalogue
          </Link>
        </section>
      </main>
    )
  }

  return (
    <main className="activity-page">
      <section className="activity-hero">
        <img src={activity.image} alt="" />
        {/* [DESIGN] Overlay pour lisibilité du hero */}
        <div className="activity-hero-overlay" aria-hidden />
        <span>{activity.category}</span>
      </section>

      <section className="activity-main">
        <div className="activity-summary">
          <h1>{activity.title}</h1>
          <p className="activity-location">{activity.city}</p>
          {/* [DESIGN] Rating en étoiles plus lisible */}
          <div className="activity-score">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star
                key={i}
                size={14}
                className={i <= Math.round(activity.rating || 0) ? 'activity-star activity-star--on' : 'activity-star'}
              />
            ))}
            <span className="activity-score-count">({activity.reviews} avis)</span>
          </div>
          <p className="activity-description">{activity.description || 'Description à venir.'}</p>
        </div>

        <aside className="activity-booking">
          {selectedCreneau ? (
            <p className="activity-price-line">
              <strong>{selectedCreneau.prix.toLocaleString('fr-FR')} MAD</strong>
              <span>par place (créneau sélectionné)</span>
            </p>
          ) : (
            <p className="activity-price-line">
              <strong>{activity.price.toLocaleString('fr-FR')} MAD</strong>
              <span>prix de base</span>
            </p>
          )}

          {activity.creneaux?.length ? (
            <>
              <label className="activity-field">
                <span>Créneau</span>
                <select
                  value={creneauId}
                  onChange={(e) => {
                    setCreneauId(e.target.value)
                    setQty(1)
                  }}
                >
                  {activity.creneaux.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.debutAt
                        ? new Date(c.debutAt).toLocaleString('fr-FR', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })
                        : `Créneau #${c.id}`}{' '}
                      — {c.places} place(s)
                    </option>
                  ))}
                </select>
              </label>
              <label className="activity-field">
                <span>Quantité</span>
                <input
                  type="number"
                  min={1}
                  max={maxPlaces}
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, Math.min(maxPlaces, Number(e.target.value) || 1)))}
                />
              </label>
            </>
          ) : (
            <p className="activity-no-slots">Aucun créneau ouvert pour le moment. Revenez plus tard.</p>
          )}

          {feedback ? <p className="activity-feedback">{feedback}</p> : null}

          <button
            type="button"
            className="btn btn-primary"
            disabled={submitting || !activity.creneaux?.length}
            onClick={onReserveNow}
          >
            {submitting ? 'Traitement…' : 'Réserver et payer (simulation)'}
          </button>

          {isClient ? (
            <button
              type="button"
              className="btn btn-light"
              disabled={submitting || !activity.creneaux?.length}
              onClick={() => onAddToPanier(true)}
            >
              Ajouter au panier
            </button>
          ) : null}

          {isClient ? (
            <button type="button" className="btn btn-light" onClick={onFavorite}>
              Ajouter aux favoris
            </button>
          ) : (
            <>
              <Link className="btn btn-light" to="/login" state={{ from: location }}>
                Se connecter pour réserver
              </Link>
              <Link className="btn btn-light activity-register-btn" to="/register" state={{ from: location }}>
                Créer un compte
              </Link>
            </>
          )}
        </aside>
      </section>
    </main>
  )
}

export function BecomePrestatairePage() {
  return (
    <main className="become-page become-page-safe">
      <section className="become-hero">
        <div className="become-hero-top">
          <p className="become-kicker">Programme Prestataire</p>
          <h1>Développez vos ventes d&apos;activités avec ALL EVENT</h1>
          <p>
            Gérez votre catalogue, vos créneaux et vos réservations depuis un espace pro unique.
            Vous gardez le contrôle, nous apportons la demande.
          </p>
        </div>
        <div className="become-hero-kpis">
          <article>
            <strong>+320</strong>
            <span>prestataires actifs</span>
          </article>
          <article>
            <strong>+12k</strong>
            <span>réservations validées</span>
          </article>
          <article>
            <strong>4.8/5</strong>
            <span>satisfaction moyenne</span>
          </article>
        </div>
        <div className="become-pro-actions become-pro-actions--hero">
          {/* [DESIGN] Bénéfices visuels avant CTA */}
          <div className="become-hero-bullets">
            {['Gérez votre catalogue', 'Suivez vos réservations', 'Développez votre audience'].map((txt, i) => (
              <div key={i} className="become-hero-bullet">
                <div className="become-hero-bullet-icon">
                  <Check size={16} />
                </div>
                <span>{txt}</span>
              </div>
            ))}
          </div>
          <Link className="btn btn-primary" to="/prestataire/register">
            Créer mon espace pro
          </Link>
          <Link className="btn btn-light" to="/prestataire/login">
            J&apos;ai déjà un compte
          </Link>
        </div>
      </section>

      <section className="become-highlights">
        <article>
          <h3>Visibilité qualifiée</h3>
          <p>Exposez vos expériences à des clients qui cherchent déjà à réserver.</p>
        </article>
        <article>
          <h3>Pilotage en temps réel</h3>
          <p>Suivez les réservations, les paiements et la performance de vos offres.</p>
        </article>
        <article>
          <h3>Workflow professionnel</h3>
          <p>Soumission, validation admin et publication catalogue dans un flux propre.</p>
        </article>
      </section>

      <section className="become-process">
        <h2>Votre onboarding en 4 étapes</h2>
        <div className="become-process-grid">
          <article>
            <span>1</span>
            <h3>Créer votre profil</h3>
            <p>Renseignez votre activité, vos zones et vos informations de contact.</p>
          </article>
          <article>
            <span>2</span>
            <h3>Configurer vos offres</h3>
            <p>Ajoutez vos activités, médias, prix et créneaux de disponibilité.</p>
          </article>
          <article>
            <span>3</span>
            <h3>Passer la validation</h3>
            <p>L&apos;équipe admin contrôle puis publie vos activités dans le catalogue.</p>
          </article>
          <article>
            <span>4</span>
            <h3>Vendre et optimiser</h3>
            <p>Pilotez vos performances et améliorez votre conversion semaine après semaine.</p>
          </article>
        </div>
      </section>

      <section className="become-requirements">
        <h2>Ce qu&apos;il vous faut pour démarrer</h2>
        <ul>
          <li>Une activité claire avec une description complète.</li>
          <li>Des créneaux disponibles et un prix cohérent.</li>
          <li>Des visuels de qualité pour rassurer les clients.</li>
          <li>Un suivi rapide des réservations et messages.</li>
        </ul>
      </section>
    </main>
  )
}

export function PrestataireLoginPage() {
  const { login, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const visualImage =
    'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80'

  const onSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      const user = await login(form)
      if (user.role !== 'prestataire' && user.role !== 'admin') {
        await logout()
        throw new Error(
          'Ce portail est réservé aux prestataires. Utilisez la connexion client ou créez votre espace prestataire.',
        )
      }
      const fallback = user.role === 'admin' ? '/admin/dashboard' : '/prestataire/dashboard'
      const redirectTarget = location.state?.from?.pathname || fallback
      navigate(redirectTarget, { replace: true })
    } catch (loginError) {
      setError(loginError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-split">
        <div className="auth-card">
          <h1>Connexion prestataire</h1>
          <p>Accédez à votre espace pro pour gérer activités, disponibilités et réservations.</p>
          <form className="auth-form" onSubmit={onSubmit}>
            <input
              type="email"
              placeholder="Email professionnel"
              value={form.email}
              onChange={(event) =>
                setForm((current) => ({ ...current, email: event.target.value }))
              }
              autoComplete="email"
              required
            />
            <AuthPasswordField
              id="prestataire-login-password"
              placeholder="Mot de passe"
              value={form.password}
              onChange={(event) =>
                setForm((current) => ({ ...current, password: event.target.value }))
              }
              show={showPassword}
              onToggleShow={() => setShowPassword((v) => !v)}
              autoComplete="current-password"
              required
            />
            {error && <p className="auth-feedback error">{error}</p>}
            <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Connexion...' : 'Se connecter à l espace pro'}
            </button>
          </form>
          <div className="auth-links">
            <Link to="/forgot-password">Mot de passe oublie ?</Link>
            <Link to="/prestataire/register">Créer un compte prestataire</Link>
            <Link to="/login">Connexion client</Link>
          </div>
        </div>
        <aside className="auth-visual">
          <img src={visualImage} alt="ALL EVENT espace prestataire" />
          <div className="auth-visual-overlay" />
          <div className="auth-visual-content">
            <img src={logoAllevent} alt="ALL EVENT logo" />
            <h2>Portail prestataire</h2>
            <p>Un espace dédié pour piloter vos offres et vos performances.</p>
          </div>
        </aside>
      </section>
    </main>
  )
}

export function PrestataireRegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    ownerName: '',
    email: '',
    password: '',
    passwordConfirmation: '',
    businessName: '',
    legalName: '',
    fiscalNumber: '',
  })
  const [documents, setDocuments] = useState([{ id: 1, label: '', file: null }])
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false)
  const visualImage =
    'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80'

  const onSubmit = async (event) => {
    event.preventDefault()
    setError('')
    if (
      !form.businessName.trim() ||
      !form.legalName.trim() ||
      !form.fiscalNumber.trim()
    ) {
      setError('Complétez les informations de structure requises.')
      return
    }
    if (form.password !== form.passwordConfirmation) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }
    const readyDocs = documents.filter((d) => d.file)
    if (readyDocs.length === 0) {
      setError('Ajoutez au moins un document justificatif (PDF/JPG/PNG).')
      return
    }
    setIsSubmitting(true)
    try {
      await publicApi.submitPrestataireApplication({
        ownerName: form.ownerName,
        email: form.email,
        password: form.password,
        passwordConfirmation: form.passwordConfirmation,
        businessName: form.businessName.trim(),
        legalName: form.legalName.trim(),
        fiscalNumber: form.fiscalNumber.trim(),
        documents: readyDocs,
      })
      setSubmitted(true)
    } catch (e) {
      setError(e.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const addDocumentField = () => {
    setDocuments((current) => [...current, { id: Date.now(), label: '', file: null }])
  }

  const removeDocumentField = (id) => {
    setDocuments((current) => (current.length > 1 ? current.filter((d) => d.id !== id) : current))
  }

  const updateDocument = (id, patch) => {
    setDocuments((current) => current.map((d) => (d.id === id ? { ...d, ...patch } : d)))
  }

  return (
    <main className="auth-page">
      <section className="auth-split">
        <div className="auth-card">
          <h1>Inscription prestataire</h1>
          <p>
            Formulaire dédié prestataire: dossier société + pièces justificatives pour validation admin.
          </p>
          {!submitted ? (
            <form className="auth-form" onSubmit={onSubmit}>
              <input
                type="text"
                placeholder="Nom du responsable"
                value={form.ownerName}
                onChange={(event) =>
                  setForm((current) => ({ ...current, ownerName: event.target.value }))
                }
                required
              />
              <input
                type="email"
                placeholder="Email professionnel"
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({ ...current, email: event.target.value }))
                }
                required
              />
              <input
                type="text"
                placeholder="Nom commercial de la structure"
                value={form.businessName}
                onChange={(event) =>
                  setForm((current) => ({ ...current, businessName: event.target.value }))
                }
                required
              />
              <input
                type="text"
                placeholder="Raison sociale"
                value={form.legalName}
                onChange={(event) =>
                  setForm((current) => ({ ...current, legalName: event.target.value }))
                }
                required
              />
              <input
                type="text"
                placeholder="Numero fiscal"
                value={form.fiscalNumber}
                onChange={(event) =>
                  setForm((current) => ({ ...current, fiscalNumber: event.target.value }))
                }
                required
              />
              <AuthPasswordField
                id="prestataire-register-password"
                placeholder="Mot de passe"
                value={form.password}
                onChange={(event) =>
                  setForm((current) => ({ ...current, password: event.target.value }))
                }
                show={showPassword}
                onToggleShow={() => setShowPassword((v) => !v)}
                autoComplete="new-password"
                minLength={8}
                maxLength={255}
                required
              />
              <AuthPasswordField
                id="prestataire-register-password-confirm"
                placeholder="Confirmation mot de passe"
                value={form.passwordConfirmation}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    passwordConfirmation: event.target.value,
                  }))
                }
                show={showPasswordConfirm}
                onToggleShow={() => setShowPasswordConfirm((v) => !v)}
                autoComplete="new-password"
                minLength={8}
                maxLength={255}
                required
              />
              <p className="auth-hint">
                Au moins 8 caracteres : lettres, chiffres et symboles sont acceptes.
              </p>
              <div className="auth-docs">
                <strong>Pièces justificatives (min. 1)</strong>
                {documents.map((doc, idx) => (
                  <div className="auth-doc-row" key={doc.id}>
                    <input
                      type="text"
                      placeholder={`Libellé document #${idx + 1} (optionnel)`}
                      value={doc.label}
                      onChange={(event) => updateDocument(doc.id, { label: event.target.value })}
                    />
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                      onChange={(event) => updateDocument(doc.id, { file: event.target.files?.[0] || null })}
                      required={idx === 0}
                    />
                    <button
                      type="button"
                      className="btn btn-light"
                      onClick={() => removeDocumentField(doc.id)}
                      disabled={documents.length === 1}
                    >
                      Retirer
                    </button>
                  </div>
                ))}
                <button type="button" className="btn btn-light" onClick={addDocumentField}>
                  Ajouter un document
                </button>
              </div>
              {error && <p className="auth-feedback error">{error}</p>}
              <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Envoi...' : 'Envoyer ma demande prestataire'}
              </button>
            </form>
          ) : (
            <div className="auth-form">
              <p className="auth-feedback">
                Demande bien reçue. Un email vous a été envoyé pour confirmer la réception de votre dossier.
              </p>
              <p className="auth-feedback">
                Votre compte sera contrôlé sous 48h ouvrées. Vous recevrez un email dès validation pour accéder
                à votre espace prestataire.
              </p>
              <button className="btn btn-primary" type="button" onClick={() => navigate('/prestataire/login')}>
                Aller à la connexion prestataire
              </button>
            </div>
          )}
          <div className="auth-links">
            <Link to="/prestataire/login">J&apos;ai déjà un compte prestataire</Link>
            <Link to="/register">Créer un compte client</Link>
          </div>
        </div>
        <aside className="auth-visual">
          <img src={visualImage} alt="ALL EVENT onboarding prestataire" />
          <div className="auth-visual-overlay" />
          <div className="auth-visual-content">
            <img src={logoAllevent} alt="ALL EVENT logo" />
            <h2>Onboarding prestataire</h2>
            <p>Activation OTP, création structure, puis soumission des pièces pour validation admin.</p>
          </div>
        </aside>
      </section>
    </main>
  )
}

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const visualImage =
    'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80'

  const onSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      const user = await login(form)
      const fallback = resolveHomeByRole(user.role)
      const redirectTarget = location.state?.from?.pathname || fallback
      navigate(redirectTarget, { replace: true })
    } catch (loginError) {
      setError(loginError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-split">
        <div className="auth-card">
          <h1>Connexion</h1>
          <p>Connecte-toi pour gerer tes reservations et favoris.</p>
          <form className="auth-form" onSubmit={onSubmit}>
            <input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(event) =>
                setForm((current) => ({ ...current, email: event.target.value }))
              }
              autoComplete="email"
              required
            />
            <AuthPasswordField
              id="client-login-password"
              placeholder="Mot de passe"
              value={form.password}
              onChange={(event) =>
                setForm((current) => ({ ...current, password: event.target.value }))
              }
              show={showPassword}
              onToggleShow={() => setShowPassword((v) => !v)}
              autoComplete="current-password"
              required
            />
            {error && <p className="auth-feedback error">{error}</p>}
            <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>
          <div className="auth-links">
            <Link to="/forgot-password">Mot de passe oublie ?</Link>
            <Link to="/register">Creer un compte</Link>
          </div>
        </div>
        <aside className="auth-visual">
          <img src={visualImage} alt="ALL EVENT experience" />
          <div className="auth-visual-overlay" />
          <div className="auth-visual-content">
            <img src={logoAllevent} alt="ALL EVENT logo" />
            <h2>Bienvenue sur ALL EVENT</h2>
            <p>Retrouve tes activites preferees et reserve en toute fluidite.</p>
          </div>
        </aside>
      </section>
    </main>
  )
}

export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    passwordConfirmation: '',
  })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false)
  const visualImage =
    'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80'

  const onSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (form.password !== form.passwordConfirmation) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await register(form)
      if (result?.user) {
        navigate(resolveHomeByRole(result.user.role), { replace: true })
      }
    } catch (registerError) {
      setError(registerError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-split">
        <div className="auth-card">
          <h1>Inscription</h1>
          <p>Rejoins ALL EVENT pour reserver et suivre tes activites.</p>
          <form className="auth-form" onSubmit={onSubmit}>
              <input
                type="text"
                placeholder="Nom complet"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                autoComplete="name"
                required
              />
              <input
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({ ...current, email: event.target.value }))
                }
                autoComplete="email"
                required
              />
              <AuthPasswordField
                id="register-password"
                placeholder="Mot de passe"
                value={form.password}
                onChange={(event) =>
                  setForm((current) => ({ ...current, password: event.target.value }))
                }
                show={showPassword}
                onToggleShow={() => setShowPassword((v) => !v)}
                autoComplete="new-password"
                minLength={8}
                maxLength={255}
                required
              />
              <AuthPasswordField
                id="register-password-confirm"
                placeholder="Confirmation mot de passe"
                value={form.passwordConfirmation}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    passwordConfirmation: event.target.value,
                  }))
                }
                show={showPasswordConfirm}
                onToggleShow={() => setShowPasswordConfirm((v) => !v)}
                autoComplete="new-password"
                minLength={8}
                maxLength={255}
                required
              />
              <p className="auth-hint">
                Au moins 8 caracteres : lettres, chiffres et symboles sont acceptes.
              </p>
              {error && <p className="auth-feedback error">{error}</p>}
              <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creation...' : 'Creer mon compte'}
              </button>
            </form>
          <div className="auth-links">
            <Link to="/login">J&apos;ai deja un compte</Link>
          </div>
        </div>
        <aside className="auth-visual">
          <img src={visualImage} alt="ALL EVENT prestataire" />
          <div className="auth-visual-overlay" />
          <div className="auth-visual-content">
            <img src={logoAllevent} alt="ALL EVENT logo" />
            <h2>Commence ton aventure</h2>
            <p>Cree ton compte et accede aux meilleures experiences locales.</p>
          </div>
        </aside>
      </section>
    </main>
  )
}

export function ForgotPasswordPage() {
  const visualImage =
    'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=1200&q=80'

  return (
    <main className="auth-page">
      <section className="auth-split">
        <div className="auth-card">
          <h1>Recuperation du mot de passe</h1>
          <p>
            Entre ton email et nous t&apos;enverrons un lien de reinitialisation.
          </p>
          <form className="auth-form">
            <input type="email" placeholder="Email" />
            <button className="btn btn-primary" type="button">
              Envoyer le lien
            </button>
          </form>
          <div className="auth-links">
            <Link to="/login">Retour a la connexion</Link>
          </div>
        </div>
        <aside className="auth-visual">
          <img src={visualImage} alt="ALL EVENT support" />
          <div className="auth-visual-overlay" />
          <div className="auth-visual-content">
            <img src={logoAllevent} alt="ALL EVENT logo" />
            <h2>Acces securise</h2>
            <p>On t&apos;accompagne pour recuperer ton acces rapidement.</p>
          </div>
        </aside>
      </section>
    </main>
  )
}

export function TermsPage() {
  return (
    <main className="legal-page">
      <section className="legal-card">
        <h1>Conditions d&apos;utilisation</h1>
        <div className="legal-sections">
          <article>
            <h3>1. Objet du service</h3>
            <p>
              ALL EVENT met en relation clients et prestataires pour la
              reservation d&apos;activites de divertissement.
            </p>
          </article>
          <article>
            <h3>2. Conditions de reservation</h3>
            <p>
              Chaque activite est soumise a des regles de disponibilite, prix,
              annulation et remboursement affichees avant paiement.
            </p>
          </article>
          <article>
            <h3>3. Responsabilites</h3>
            <p>
              Le prestataire reste responsable de l&apos;execution de l&apos;activite.
              La plateforme facilite la transaction et la mediation.
            </p>
          </article>
          <article>
            <h3>4. Moderation et litiges</h3>
            <p>
              En cas de conflit, un processus de traitement est prevu avec
              collecte des preuves et arbitrage interne.
            </p>
          </article>
        </div>
      </section>
    </main>
  )
}

export function PrivacyPage() {
  return (
    <main className="legal-page">
      <section className="legal-card">
        <h1>Politique de confidentialite</h1>
        <div className="legal-sections">
          <article>
            <h3>Donnees collectees</h3>
            <p>
              Nom, email, donnees de reservation et journaux techniques utiles a
              la securite et a la qualite du service.
            </p>
          </article>
          <article>
            <h3>Usage des donnees</h3>
            <p>
              Les informations servent a authentifier, traiter les commandes,
              envoyer les notifications et ameliorer l&apos;experience.
            </p>
          </article>
          <article>
            <h3>Protection</h3>
            <p>
              Les acces sont controles, les flux sensibles journalises et les
              operations critiques monitorees.
            </p>
          </article>
          <article>
            <h3>Vos droits</h3>
            <p>
              Vous pouvez demander l&apos;acces, la rectification ou la suppression
              de vos donnees conformement aux regles applicables.
            </p>
          </article>
        </div>
      </section>
    </main>
  )
}

export function FaqPage() {
  const faqItems = [
    {
      q: 'Comment reserver une activite ?',
      a: 'Choisis une activite, verifie les details, selectionne ton creneau puis confirme ta reservation.',
    },
    {
      q: 'Comment filtrer comme un site e-commerce ?',
      a: 'Utilise la recherche, la ville, la categorie, la note minimale et la plage de prix pour affiner rapidement.',
    },
    {
      q: 'Comment devenir prestataire ?',
      a: 'Depuis la page dediee, cree ton compte, complete ton profil et publie tes activites.',
    },
    {
      q: 'Puis-je annuler une reservation ?',
      a: 'Oui, selon les conditions d annulation affichees sur l activite au moment de la commande.',
    },
    {
      q: 'Le paiement est-il securise ?',
      a: 'Les paiements suivent un flux trace avec verification de statut et notifications systeme.',
    },
  ]

  return (
    <main className="legal-page">
      <section className="legal-card">
        <h1>FAQ</h1>
        <div className="faq-list">
          {faqItems.map((item) => (
            <article key={item.q}>
              <h3>{item.q}</h3>
              <p>{item.a}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
