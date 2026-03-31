import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import logoAllevent from '../assets/brand/logo-allevent.png'
import { useAuth } from '../context/useAuth'
import { clientApi } from '../services/clientApi'
import { publicApi } from '../services/publicApi'
import './public-layout.css'

const PUBLIC_VILLE_ID_KEY = 'allevent_public_ville_id'
/** @deprecated Ancienne clé (liste mock) — migrée vers PUBLIC_VILLE_ID_KEY */
const LEGACY_PUBLIC_CITY_KEY = 'allevent_public_city'

function normalizeStr(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/**
 * @param {Array<{ id: number, nom?: string }>} villes
 * @param {string} legacyId ex: douala, yaounde
 */
function findVilleFromLegacyKey(villes, legacyId) {
  const hints = {
    douala: ['douala'],
    yaounde: ['yaound', 'yaounde'],
    bafoussam: ['bafoussam'],
    kribi: ['kribi'],
  }
  const needle = hints[legacyId]
  if (!needle || !Array.isArray(villes) || !villes.length) return null
  for (const v of villes) {
    const n = normalizeStr(v.nom)
    if (needle.some((h) => n.includes(h))) return v
  }
  return null
}

function TabIconHome({ active }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden className={active ? 'pub-tab-ico active' : 'pub-tab-ico'}>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        d="M4 10.5L12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5z"
      />
    </svg>
  )
}

function TabIconHeart({ active }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden className={active ? 'pub-tab-ico active' : 'pub-tab-ico'}>
      <path
        fill={active ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        d="M12 21s-7-4.35-7-10a5 5 0 0 1 9.17-2.5A5 5 0 0 1 19 11c0 5.65-7 10-7 10z"
      />
    </svg>
  )
}

function TabIconTicket({ active }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden className={active ? 'pub-tab-ico active' : 'pub-tab-ico'}>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        d="M4 8h16v3a2 2 0 1 0 0 4v3H4v-3a2 2 0 1 0 0-4V8z"
      />
    </svg>
  )
}

function TabIconUser({ active }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden className={active ? 'pub-tab-ico active' : 'pub-tab-ico'}>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"
      />
    </svg>
  )
}

function HeaderCartIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 4h2l2.1 10.3a1 1 0 0 0 1 .8h8.8a1 1 0 0 0 1-.8L20 7H7.2M10 20a1 1 0 1 0 0-.01M17 20a1 1 0 1 0 0-.01"
      />
    </svg>
  )
}

export function PublicLayout() {
  const { auth, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [locationOpen, setLocationOpen] = useState(false)
  const [cartCount, setCartCount] = useState(0)
  const [villes, setVilles] = useState([])
  const [villesLoading, setVillesLoading] = useState(true)
  const [villesError, setVillesError] = useState('')
  const [selectedVilleId, setSelectedVilleId] = useState(() => localStorage.getItem(PUBLIC_VILLE_ID_KEY) || '')

  const selectedVille = useMemo(
    () => villes.find((v) => String(v.id) === String(selectedVilleId)) ?? null,
    [villes, selectedVilleId],
  )

  const persistVilleId = useCallback((id) => {
    setSelectedVilleId(id)
    if (id) localStorage.setItem(PUBLIC_VILLE_ID_KEY, id)
    else localStorage.removeItem(PUBLIC_VILLE_ID_KEY)
  }, [])

  useEffect(() => {
    let active = true
    setVillesLoading(true)
    setVillesError('')
    publicApi
      .getVilles()
      .then((rows) => {
        if (!active) return
        const list = Array.isArray(rows) ? [...rows].sort((a, b) => String(a.nom || '').localeCompare(String(b.nom || ''))) : []
        setVilles(list)
      })
      .catch(() => {
        if (active) {
          setVilles([])
          setVillesError('Villes indisponibles')
        }
      })
      .finally(() => {
        if (active) setVillesLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!villes.length || villesLoading) return

    let stored = localStorage.getItem(PUBLIC_VILLE_ID_KEY)
    const isValid = (id) => id && villes.some((v) => String(v.id) === String(id))

    if (stored && !isValid(stored)) {
      localStorage.removeItem(PUBLIC_VILLE_ID_KEY)
      setSelectedVilleId('')
      stored = null
    }

    if (stored && isValid(stored)) {
      setSelectedVilleId((prev) => (String(prev) === String(stored) ? prev : stored))
      return
    }

    const legacy = localStorage.getItem(LEGACY_PUBLIC_CITY_KEY)
    if (legacy) {
      const match = findVilleFromLegacyKey(villes, legacy)
      localStorage.removeItem(LEGACY_PUBLIC_CITY_KEY)
      if (match) {
        persistVilleId(String(match.id))
        return
      }
    }

    setSelectedVilleId((prev) => {
      if (prev && isValid(prev)) return prev
      if (villes[0]) {
        const id = String(villes[0].id)
        localStorage.setItem(PUBLIC_VILLE_ID_KEY, id)
        return id
      }
      return ''
    })
  }, [villes, villesLoading, persistVilleId])

  /** Nom affiché + filtre recherche (aligné sur les activités API) */
  const publicCity = selectedVille?.nom || ''

  const setPublicCity = useCallback(
    (cityFilter) => {
      const f = normalizeStr(cityFilter)
      if (!f || !villes.length) return
      const match = villes.find(
        (v) =>
          normalizeStr(v.nom).includes(f) || f.includes(normalizeStr(v.nom)),
      )
      if (match) persistVilleId(String(match.id))
    },
    [villes, persistVilleId],
  )

  const outletContext = useMemo(
    () => ({ publicCity, setPublicCity }),
    [publicCity, setPublicCity],
  )

  const isClient = auth.isAuthenticated && auth.role === 'client'

  const hideTabbarPaths = ['/login', '/register', '/forgot-password']
  const showMobileTabbar = !hideTabbarPaths.includes(location.pathname)

  const userInitial = (auth.user?.name || auth.user?.email || '?').trim().charAt(0).toUpperCase()

  useEffect(() => {
    if (!locationOpen) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') setLocationOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [locationOpen])

  useEffect(() => {
    let active = true
    if (!isClient) {
      setCartCount(0)
      return undefined
    }
    clientApi
      .getPanier()
      .then((panier) => {
        if (!active) return
        const count = (panier?.lignes || []).reduce(
          (sum, line) => sum + Number(line?.quantite || 0),
          0,
        )
        setCartCount(count)
      })
      .catch(() => {
        if (active) setCartCount(0)
      })
    return () => {
      active = false
    }
  }, [isClient, location.pathname])

  const loginState = (path) => ({ state: { from: { pathname: path } } })

  return (
    <div className="public-shell">
      <header className="public-header">
        <div className="public-header-row">
          <Link to="/" className="brand-link">
            <img src={logoAllevent} alt="" width={36} height={36} />
            <span className="brand-text">ALL EVENT</span>
          </Link>

          <Link to="/search" className="public-header-search-mobile" aria-label="Rechercher une activité">
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
              <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M20 20l-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </Link>

          <nav className="public-nav" aria-label="Navigation principale">
            <Link to="/search">Explorer</Link>
            <Link to="/become-prestataire">Devenir prestataire</Link>
            <Link to="/faq">FAQ</Link>
          </nav>

          <button
            type="button"
            className="public-loc-trigger"
            onClick={() => setLocationOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={locationOpen}
            aria-label={
              villesLoading
                ? 'Chargement de la localisation'
                : `Localisation : ${selectedVille?.nom || 'choisir une ville'}`
            }
          >
            <span className="public-loc-pin" aria-hidden>
              <svg viewBox="0 0 24 24" width="18" height="18">
                <path
                  fill="currentColor"
                  d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 6z"
                />
              </svg>
            </span>
            <span className="public-loc-label">
              {villesLoading ? '…' : selectedVille?.nom || villesError || 'Ville'}
            </span>
          </button>

          <div className="header-actions">
            {auth.isLoading ? (
              <span className="header-auth-placeholder" />
            ) : isClient ? (
              <>
                <button
                  type="button"
                  className="header-icon-btn header-cart-btn"
                  aria-label="Panier"
                  onClick={() => navigate('/panier')}
                >
                  <HeaderCartIcon />
                  {cartCount > 0 ? <span className="header-cart-badge">{cartCount}</span> : null}
                </button>
                <button
                  type="button"
                  className="header-icon-btn"
                  aria-label="Mon compte"
                  onClick={() => navigate('/compte')}
                >
                  <span className="header-avatar">{userInitial}</span>
                </button>
                <button type="button" className="header-btn ghost" onClick={() => logout().then(() => navigate('/'))}>
                  Déconnexion
                </button>
              </>
            ) : (
              <>
                <Link className="header-btn secondary" to="/login">
                  Connexion
                </Link>
                <Link className="header-btn primary" to="/register">
                  S&apos;inscrire
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="public-content">
        <Outlet context={outletContext} />
      </div>

      {showMobileTabbar ? (
        <nav className="mobile-tabbar" aria-label="Navigation mobile">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `mobile-tab-link${isActive ? ' active' : ''}`}
          >
            {({ isActive }) => (
              <>
                <TabIconHome active={isActive} />
                <span>Découvrir</span>
              </>
            )}
          </NavLink>

          {isClient ? (
            <NavLink
              to="/favorites"
              className={({ isActive }) => `mobile-tab-link${isActive ? ' active' : ''}`}
            >
              {({ isActive }) => (
                <>
                  <TabIconHeart active={isActive} />
                  <span>Sauvegardés</span>
                </>
              )}
            </NavLink>
          ) : (
            <Link to="/login" className="mobile-tab-link" {...loginState('/favorites')}>
              <TabIconHeart active={false} />
              <span>Sauvegardés</span>
            </Link>
          )}

          {isClient ? (
            <NavLink
              to="/reservations"
              className={({ isActive }) => `mobile-tab-link${isActive ? ' active' : ''}`}
            >
              {({ isActive }) => (
                <>
                  <TabIconTicket active={isActive} />
                  <span>Billets</span>
                </>
              )}
            </NavLink>
          ) : (
            <Link to="/login" className="mobile-tab-link" {...loginState('/reservations')}>
              <TabIconTicket active={false} />
              <span>Billets</span>
            </Link>
          )}

          {isClient ? (
            <NavLink
              to="/compte"
              className={({ isActive }) => `mobile-tab-link${isActive ? ' active' : ''}`}
            >
              {({ isActive }) => (
                <>
                  <TabIconUser active={isActive} />
                  <span>Compte</span>
                </>
              )}
            </NavLink>
          ) : (
            <Link to="/login" className="mobile-tab-link" {...loginState('/compte')}>
              <TabIconUser active={false} />
              <span>Compte</span>
            </Link>
          )}
        </nav>
      ) : null}

      <footer className="public-footer">
        <div className="public-footer-grid">
          <section>
            <h4>ALL EVENT</h4>
            <p>
              La plateforme moderne pour trouver, réserver et vivre les meilleures expériences locales.
            </p>
          </section>
          <section>
            <h4>Produit</h4>
            <div className="footer-links">
              <Link to="/search">Explorer</Link>
              <Link to="/become-prestataire">Espace prestataire</Link>
              {isClient ? (
                <Link to="/compte">Mon compte</Link>
              ) : (
                <Link to="/login">Connexion</Link>
              )}
            </div>
          </section>
          <section>
            <h4>Entreprise</h4>
            <div className="footer-links">
              <Link to="/terms">Conditions</Link>
              <Link to="/privacy">Confidentialité</Link>
              <Link to="/faq">Support</Link>
            </div>
          </section>
          <section>
            <h4>Contact</h4>
            <div className="footer-links">
              <a href="mailto:support@allevent.local">support@allevent.local</a>
              <a href="tel:+237600000000">+237 600 00 00 00</a>
              <span className="footer-static">Douala, Cameroun</span>
            </div>
          </section>
        </div>
        <div className="footer-bottom">© {new Date().getFullYear()} ALL EVENT — Tous droits réservés.</div>
      </footer>

      {locationOpen ? (
        <div
          className="public-loc-backdrop"
          role="presentation"
          onClick={() => setLocationOpen(false)}
        >
          <div
            className="public-loc-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="public-loc-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="public-loc-modal-head">
              <h2 id="public-loc-title">Localisation</h2>
              <button type="button" className="public-loc-close" onClick={() => setLocationOpen(false)} aria-label="Fermer">
                ×
              </button>
            </div>
            <p className="public-loc-lead">
              Choisissez une ville pour affiner l’exploration et les filtres (données catalogue).
            </p>
            {villesLoading ? (
              <p className="public-loc-loading" role="status">
                Chargement des villes…
              </p>
            ) : villesError ? (
              <p className="public-loc-error">{villesError}</p>
            ) : (
              <ul className="public-loc-chips">
                {villes.map((v) => (
                  <li key={v.id}>
                    <button
                      type="button"
                      className={
                        String(v.id) === String(selectedVilleId)
                          ? 'public-loc-chip public-loc-chip--on'
                          : 'public-loc-chip'
                      }
                      onClick={() => {
                        persistVilleId(String(v.id))
                        setLocationOpen(false)
                      }}
                    >
                      <span className="public-loc-chip-pin" aria-hidden>
                        <svg viewBox="0 0 24 24" width="16" height="16">
                          <path
                            fill="currentColor"
                            d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
                          />
                        </svg>
                      </span>
                      {v.nom || `Ville ${v.id}`}
                      {String(v.id) === String(selectedVilleId) ? (
                        <span className="public-loc-check" aria-hidden>
                          ✓
                        </span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
