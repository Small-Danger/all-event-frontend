import { useCallback, useEffect, useRef, useState } from 'react'
import { adminApi } from '../../../services/adminApi'
import { useAuth } from '../../../context/useAuth'
import './AdminUsersPage.css'

const ROLES = [
  { value: '', label: 'Tous les rôles' },
  { value: 'client', label: 'Client' },
  { value: 'prestataire', label: 'Prestataire' },
  { value: 'admin', label: 'Administrateur' },
]

const STATUSES = [
  { value: '', label: 'Tous les statuts' },
  { value: 'active', label: 'Actif' },
  { value: 'inactive', label: 'Inactif' },
  { value: 'suspendu', label: 'Suspendu' },
]

function roleLabel(role) {
  const m = { client: 'Client', prestataire: 'Prestataire', admin: 'Administrateur' }
  return m[role] || role
}

function statusLabel(status) {
  const m = { active: 'Actif', inactive: 'Inactif', suspendu: 'Suspendu' }
  return m[status] || status
}

function formatDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  } catch {
    return '—'
  }
}

function typeBlocageLabel(type) {
  if (type === 'email') return 'E-mail'
  if (type === 'telephone') return 'Téléphone'
  return type
}

export function AdminUsersPage() {
  const { user: currentUser } = useAuth()
  const [list, setList] = useState([])
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 })
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [detailUser, setDetailUser] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [blockUser, setBlockUser] = useState(null)
  const [blockSubmitting, setBlockSubmitting] = useState(false)
  const [blockedList, setBlockedList] = useState([])
  const [blockedMeta, setBlockedMeta] = useState({ current_page: 1, last_page: 1, total: 0 })
  const [blockedPage, setBlockedPage] = useState(1)
  const [blockedType, setBlockedType] = useState('')
  const [blockedLoading, setBlockedLoading] = useState(true)
  const [unblockRow, setUnblockRow] = useState(null)
  const [unblockSubmitting, setUnblockSubmitting] = useState(false)
  const detailReqId = useRef(0)

  const loadList = useCallback(async () => {
    setError('')
    setIsLoading(true)
    try {
      const res = await adminApi.getUsers({
        page,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
      })
      setList(Array.isArray(res.data) ? res.data : [])
      setMeta({
        current_page: res.current_page ?? 1,
        last_page: res.last_page ?? 1,
        total: res.total ?? 0,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chargement impossible.')
      setList([])
    } finally {
      setIsLoading(false)
    }
  }, [page, roleFilter, statusFilter])

  const loadBlocked = useCallback(async () => {
    setBlockedLoading(true)
    try {
      const res = await adminApi.getBlockedIdentifiers({
        page: blockedPage,
        type: blockedType || undefined,
      })
      setBlockedList(Array.isArray(res.data) ? res.data : [])
      setBlockedMeta({
        current_page: res.current_page ?? 1,
        last_page: res.last_page ?? 1,
        total: res.total ?? 0,
      })
    } catch {
      setBlockedList([])
    } finally {
      setBlockedLoading(false)
    }
  }, [blockedPage, blockedType])

  useEffect(() => {
    loadList()
  }, [loadList])

  useEffect(() => {
    loadBlocked()
  }, [loadBlocked])

  const onFilterRole = (value) => {
    setRoleFilter(value)
    setPage(1)
  }

  const onFilterStatus = (value) => {
    setStatusFilter(value)
    setPage(1)
  }

  const openDetail = async (u) => {
    const req = ++detailReqId.current
    setDetailUser(null)
    setDetailLoading(true)
    try {
      const full = await adminApi.getUser(u.id)
      if (detailReqId.current === req) setDetailUser(full)
    } catch (e) {
      if (detailReqId.current === req) {
        setError(e instanceof Error ? e.message : 'Fiche indisponible.')
      }
    } finally {
      if (detailReqId.current === req) setDetailLoading(false)
    }
  }

  const closeDetail = () => {
    detailReqId.current += 1
    setDetailUser(null)
    setDetailLoading(false)
  }

  const confirmBlock = async () => {
    if (!blockUser) return
    setBlockSubmitting(true)
    setError('')
    try {
      await adminApi.blockUser(blockUser.id)
      setBlockUser(null)
      closeDetail()
      await loadList()
      await loadBlocked()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Blocage impossible.')
    } finally {
      setBlockSubmitting(false)
    }
  }

  const canBlock = (u) => currentUser && Number(u.id) !== Number(currentUser.id)

  const confirmUnblock = async () => {
    if (!unblockRow) return
    setUnblockSubmitting(true)
    setError('')
    try {
      await adminApi.unblockIdentifier(unblockRow.id)
      setUnblockRow(null)
      await loadBlocked()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action impossible.')
    } finally {
      setUnblockSubmitting(false)
    }
  }

  return (
    <section className="admin-users-page">
      <header className="admin-users-hero">
        <div>
          <p className="admin-users-kicker">Gestion des comptes</p>
          <h1 className="admin-users-title">Utilisateurs</h1>
          <p className="admin-users-lead">
            Consultation des comptes et de leurs profils. Seule l’action{' '}
            <strong>bloquer l’accès</strong> modifie l’état : elle supprime le compte et interdit une
            nouvelle inscription avec le même e-mail ou numéro (profil). En{' '}
            <strong>exception</strong>, un administrateur peut <strong>lever le blocage</strong> sur un
            identifiant pour réautoriser une inscription (le compte supprimé ne réapparaît pas tel quel).
          </p>
        </div>
      </header>

      {error ? (
        <div className="admin-users-alert" role="alert">
          {error}
        </div>
      ) : null}

      <div className="admin-users-toolbar">
        <label className="admin-users-field">
          <span>Rôle</span>
          <select
            value={roleFilter}
            onChange={(e) => onFilterRole(e.target.value)}
            aria-label="Filtrer par rôle"
          >
            {ROLES.map((o) => (
              <option key={o.value || 'all'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="admin-users-field">
          <span>Statut</span>
          <select
            value={statusFilter}
            onChange={(e) => onFilterStatus(e.target.value)}
            aria-label="Filtrer par statut"
          >
            {STATUSES.map((o) => (
              <option key={o.value || 'all-s'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <p className="admin-users-count" role="status">
          {isLoading ? 'Chargement…' : `${meta.total} compte(s)`}
        </p>
      </div>

      <div className="admin-users-table-wrap">
        <table className="admin-users-table">
          <thead>
            <tr>
              <th>Utilisateur</th>
              <th>Rôle</th>
              <th>Statut</th>
              <th>Inscription</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="admin-users-empty">
                  Chargement…
                </td>
              </tr>
            ) : list.length === 0 ? (
              <tr>
                <td colSpan={5} className="admin-users-empty">
                  Aucun compte pour ces filtres.
                </td>
              </tr>
            ) : (
              list.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="admin-users-cell-main">
                      <strong>{u.name}</strong>
                      <span className="admin-users-email">{u.email}</span>
                    </div>
                  </td>
                  <td>{roleLabel(u.role)}</td>
                  <td>
                    <span className={`admin-users-pill admin-users-pill--${u.status || 'active'}`}>
                      {statusLabel(u.status)}
                    </span>
                  </td>
                  <td>{formatDate(u.created_at)}</td>
                  <td className="admin-users-actions">
                    <button type="button" className="admin-users-btn ghost" onClick={() => openDetail(u)}>
                      Fiche
                    </button>
                    {canBlock(u) ? (
                      <button
                        type="button"
                        className="admin-users-btn danger"
                        onClick={() => setBlockUser(u)}
                      >
                        Bloquer
                      </button>
                    ) : (
                      <span className="admin-users-muted">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {meta.last_page > 1 ? (
        <nav className="admin-users-pagination" aria-label="Pagination">
          <button
            type="button"
            disabled={page <= 1 || isLoading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Précédent
          </button>
          <span>
            Page {meta.current_page} / {meta.last_page}
          </span>
          <button
            type="button"
            disabled={page >= meta.last_page || isLoading}
            onClick={() => setPage((p) => p + 1)}
          >
            Suivant
          </button>
        </nav>
      ) : null}

      <section className="admin-users-blocked" aria-labelledby="blocked-ident-title">
        <div className="admin-users-blocked-head">
          <div>
            <h2 id="blocked-ident-title">Identifiants bloqués (exceptions)</h2>
            <p className="admin-users-blocked-intro">
              Après un blocage, l’e-mail et le téléphone éventuel sont inscrits ici. Utiliser « Lever le
              blocage » uniquement pour une <strong>exception</strong> : la personne pourra créer un{' '}
              <strong>nouveau</strong> compte avec cet identifiant. L’historique du compte supprimé
              n’est pas restauré.
            </p>
          </div>
          <label className="admin-users-field">
            <span>Type</span>
            <select
              value={blockedType}
              onChange={(e) => {
                setBlockedType(e.target.value)
                setBlockedPage(1)
              }}
              aria-label="Filtrer les identifiants bloqués"
            >
              <option value="">Tous</option>
              <option value="email">E-mail</option>
              <option value="telephone">Téléphone</option>
            </select>
          </label>
        </div>

        <div className="admin-users-table-wrap">
          <table className="admin-users-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Valeur</th>
                <th>Bloqué le</th>
                <th>Par</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {blockedLoading ? (
                <tr>
                  <td colSpan={5} className="admin-users-empty">
                    Chargement…
                  </td>
                </tr>
              ) : blockedList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="admin-users-empty">
                    Aucun identifiant bloqué.
                  </td>
                </tr>
              ) : (
                blockedList.map((row) => (
                  <tr key={row.id}>
                    <td>{typeBlocageLabel(row.type)}</td>
                    <td>
                      <code className="admin-users-code">{row.valeur}</code>
                    </td>
                    <td>{formatDate(row.created_at)}</td>
                    <td>
                      {row.bloque_par?.name || row.bloque_par?.email ? (
                        <span className="admin-users-muted">
                          {row.bloque_par?.name || row.bloque_par?.email}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="admin-users-actions">
                      <button
                        type="button"
                        className="admin-users-btn success"
                        onClick={() => setUnblockRow(row)}
                      >
                        Lever le blocage
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {blockedMeta.last_page > 1 ? (
          <nav className="admin-users-pagination" aria-label="Pagination identifiants bloqués">
            <button
              type="button"
              disabled={blockedPage <= 1 || blockedLoading}
              onClick={() => setBlockedPage((p) => Math.max(1, p - 1))}
            >
              Précédent
            </button>
            <span>
              Page {blockedMeta.current_page} / {blockedMeta.last_page} — {blockedMeta.total} entrée(s)
            </span>
            <button
              type="button"
              disabled={blockedPage >= blockedMeta.last_page || blockedLoading}
              onClick={() => setBlockedPage((p) => p + 1)}
            >
              Suivant
            </button>
          </nav>
        ) : null}
      </section>

      {detailUser || detailLoading ? (
        <div className="admin-users-drawer-backdrop" role="presentation" onClick={closeDetail}>
          <aside
            className="admin-users-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-user-detail-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" className="admin-users-drawer-close" onClick={closeDetail}>
              Fermer
            </button>
            {detailLoading ? (
              <p>Chargement de la fiche…</p>
            ) : detailUser ? (
              <>
                <h2 id="admin-user-detail-title">{detailUser.name}</h2>
                <dl className="admin-users-dl">
                  <div>
                    <dt>E-mail</dt>
                    <dd>{detailUser.email}</dd>
                  </div>
                  <div>
                    <dt>Rôle</dt>
                    <dd>{roleLabel(detailUser.role)}</dd>
                  </div>
                  <div>
                    <dt>Statut</dt>
                    <dd>{statusLabel(detailUser.status)}</dd>
                  </div>
                  {detailUser.profil ? (
                    <>
                      <div>
                        <dt>Prénom</dt>
                        <dd>{detailUser.profil.prenom || '—'}</dd>
                      </div>
                      <div>
                        <dt>Nom</dt>
                        <dd>{detailUser.profil.nom || '—'}</dd>
                      </div>
                      <div>
                        <dt>Téléphone</dt>
                        <dd>{detailUser.profil.telephone || '—'}</dd>
                      </div>
                    </>
                  ) : null}
                </dl>
                {detailUser.prestataires?.length ? (
                  <div className="admin-users-presta">
                    <h3>Prestataires liés</h3>
                    <ul>
                      {detailUser.prestataires.map((p) => (
                        <li key={p.id}>
                          {p.nom}
                          {p.pivot?.role_membre ? (
                            <span className="admin-users-muted"> — {p.pivot.role_membre}</span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {canBlock(detailUser) ? (
                  <button
                    type="button"
                    className="admin-users-btn danger block"
                    onClick={() => {
                      setBlockUser(detailUser)
                    }}
                  >
                    Bloquer l’accès (supprimer le compte)
                  </button>
                ) : null}
              </>
            ) : null}
          </aside>
        </div>
      ) : null}

      {blockUser ? (
        <div className="admin-users-modal-backdrop" role="presentation">
          <div
            className="admin-users-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="block-modal-title"
          >
            <h2 id="block-modal-title">Confirmer le blocage</h2>
            <p className="admin-users-modal-text">
              Le compte <strong>{blockUser.name}</strong> ({blockUser.email}) sera{' '}
              <strong>supprimé</strong>. L’adresse e-mail et, si renseigné, le numéro de téléphone du
              profil seront <strong>interdits</strong> pour toute future inscription sur la plateforme.
              La suppression du compte est définitive ; seuls les identifiants peuvent être débloqués
              plus tard (section ci-dessous), en exception.
            </p>
            <div className="admin-users-modal-actions">
              <button
                type="button"
                className="admin-users-btn ghost"
                onClick={() => setBlockUser(null)}
                disabled={blockSubmitting}
              >
                Annuler
              </button>
              <button
                type="button"
                className="admin-users-btn danger"
                onClick={confirmBlock}
                disabled={blockSubmitting}
              >
                {blockSubmitting ? 'Traitement…' : 'Confirmer le blocage'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {unblockRow ? (
        <div className="admin-users-modal-backdrop" role="presentation">
          <div
            className="admin-users-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="unblock-modal-title"
          >
            <h2 id="unblock-modal-title">Lever le blocage (exception)</h2>
            <p className="admin-users-modal-text">
              L’identifiant <strong>{typeBlocageLabel(unblockRow.type)}</strong>{' '}
              <code className="admin-users-code-inline">{unblockRow.valeur}</code> sera retiré de la
              liste d’interdiction. Une <strong>nouvelle inscription</strong> pourra utiliser cet
              e-mail ou ce numéro. Le compte précédemment supprimé ne sera pas rétabli.
            </p>
            <div className="admin-users-modal-actions">
              <button
                type="button"
                className="admin-users-btn ghost"
                onClick={() => setUnblockRow(null)}
                disabled={unblockSubmitting}
              >
                Annuler
              </button>
              <button
                type="button"
                className="admin-users-btn success"
                onClick={confirmUnblock}
                disabled={unblockSubmitting}
              >
                {unblockSubmitting ? 'Traitement…' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
