import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { clientApi } from '../../../services/clientApi'
import './ClientFavoritesPage.css'

function formatAmount(value) {
  return `${value.toLocaleString('fr-FR')} MAD`
}

export function ClientFavoritesPage() {
  const [favorites, setFavorites] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [city, setCity] = useState('all')
  const [sortBy, setSortBy] = useState('recent')
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    let active = true
    clientApi
      .getFavorites()
      .then((data) => {
        if (!active) return
        setFavorites(Array.isArray(data) ? data : [])
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

  const removeFromFavorites = async (id) => {
    setBusyId(id)
    try {
      await clientApi.removeFavorite(id)
      setFavorites((current) => current.filter((item) => item.id !== id))
    } catch (apiError) {
      setError(apiError.message)
    } finally {
      setBusyId(null)
    }
  }

  const cities = useMemo(
    () => ['all', ...new Set(favorites.map((item) => item.city).filter(Boolean))],
    [favorites],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let rows = favorites.filter((item) => {
      const matchQ =
        q.length === 0 ||
        item.title.toLowerCase().includes(q) ||
        item.city.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      const matchCity = city === 'all' || item.city === city
      return matchQ && matchCity
    })

    if (sortBy === 'price_asc') rows = [...rows].sort((a, b) => a.price - b.price)
    else if (sortBy === 'price_desc') rows = [...rows].sort((a, b) => b.price - a.price)
    else if (sortBy === 'rating') rows = [...rows].sort((a, b) => b.rating - a.rating)
    else rows = [...rows].sort((a, b) => String(b.id).localeCompare(String(a.id)))

    return rows
  }, [favorites, search, city, sortBy])

  const avgRating = useMemo(() => {
    if (!favorites.length) return 0
    const total = favorites.reduce((sum, item) => sum + Number(item.rating || 0), 0)
    return total / favorites.length
  }, [favorites])

  return (
    <section className="client-favorites-page">
      <header className="fav-head">
        <h1>Mes favoris</h1>
        <p>Gardez vos activités préférées et réservez au meilleur moment.</p>
      </header>

      {!isLoading && favorites.length > 0 ? (
        <div className="fav-kpis">
          <article>
            <span>Favoris total</span>
            <strong>{favorites.length}</strong>
          </article>
          <article>
            <span>Villes suivies</span>
            <strong>{Math.max(0, cities.length - 1)}</strong>
          </article>
          <article>
            <span>Note moyenne</span>
            <strong>{avgRating.toFixed(1)} / 5</strong>
          </article>
        </div>
      ) : null}

      {!isLoading && favorites.length > 0 ? (
        <div className="fav-toolbar">
          <input
            type="search"
            placeholder="Rechercher un favori..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select value={city} onChange={(event) => setCity(event.target.value)}>
            {cities.map((value) => (
              <option key={value} value={value}>
                {value === 'all' ? 'Toutes les villes' : value}
              </option>
            ))}
          </select>
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            <option value="recent">Plus récents</option>
            <option value="rating">Meilleure note</option>
            <option value="price_asc">Prix croissant</option>
            <option value="price_desc">Prix décroissant</option>
          </select>
        </div>
      ) : null}

      {isLoading && <article className="favorites-empty">Chargement des favoris...</article>}
      {!isLoading && error && <article className="favorites-empty">{error}</article>}

      {!isLoading && favorites.length === 0 && (
        <article className="favorites-empty">
          <h2>Votre liste est vide</h2>
          <p>Explorez de nouvelles expériences et ajoutez vos coups de coeur.</p>
          <Link to="/search">Decouvrir les activites</Link>
        </article>
      )}

      {!isLoading && favorites.length > 0 && filtered.length === 0 && (
        <article className="favorites-empty">
          <h2>Aucun résultat</h2>
          <p>Essayez un autre filtre ou une autre recherche.</p>
        </article>
      )}

      {!isLoading && filtered.length > 0 && (
        <div className="favorites-grid">
          {filtered.map((item) => (
            <article key={item.id} className="favorite-card">
              <img src={item.image} alt={item.title} />
              <div className="favorite-content">
                <span>{item.category}</span>
                <h2>{item.title}</h2>
                <p>{item.city}</p>
                <div className="favorite-footer">
                  <strong>{formatAmount(item.price)}</strong>
                  <small>{item.rating} / 5</small>
                </div>
                <div className="favorite-actions">
                  <Link to={`/activity/${item.id}`}>Reserver</Link>
                  <button
                    type="button"
                    disabled={busyId === item.id}
                    onClick={() => removeFromFavorites(item.id)}
                  >
                    {busyId === item.id ? '...' : 'Retirer'}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
