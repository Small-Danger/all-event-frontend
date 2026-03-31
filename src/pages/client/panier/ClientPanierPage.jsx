import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { clientApi } from '../../../services/clientApi'
import './ClientPanierPage.css'

function money(value) {
  return `${Number(value || 0).toLocaleString('fr-FR')} MAD`
}

export function ClientPanierPage() {
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [checkoutBusy, setCheckoutBusy] = useState(false)

  const total = useMemo(
    () => rows.reduce((sum, row) => sum + row.prixUnitaire * row.quantite, 0),
    [rows],
  )

  const loadPanier = async () => {
    setLoading(true)
    setError('')
    try {
      const panier = await clientApi.getPanier()
      setRows(panier.lignes || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible de charger le panier.')
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPanier()
  }, [])

  const updateQty = async (ligneId, qty) => {
    setBusyId(ligneId)
    setError('')
    try {
      await clientApi.updatePanierLigne(ligneId, qty)
      await loadPanier()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Mise a jour impossible.')
    } finally {
      setBusyId(null)
    }
  }

  const removeLine = async (ligneId) => {
    setBusyId(ligneId)
    setError('')
    try {
      await clientApi.removePanierLigne(ligneId)
      await loadPanier()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Suppression impossible.')
    } finally {
      setBusyId(null)
    }
  }

  const clearPanier = async () => {
    setCheckoutBusy(true)
    setError('')
    try {
      await clientApi.viderPanier()
      await loadPanier()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action impossible.')
    } finally {
      setCheckoutBusy(false)
    }
  }

  const checkout = async () => {
    setCheckoutBusy(true)
    setError('')
    try {
      const result = await clientApi.validerPanier()
      const reservationId = result?.reservation?.id
      if (reservationId) {
        await clientApi.simulerPaiementReservation(reservationId)
      }
      navigate('/reservations')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Validation du panier impossible.')
    } finally {
      setCheckoutBusy(false)
    }
  }

  return (
    <section className="client-panier-page">
      <header className="client-panier-head">
        <h1>Mon panier</h1>
        <p>Vérifiez vos lignes avant validation de la réservation.</p>
      </header>

      {loading && <div className="state-card">Chargement du panier...</div>}
      {!loading && error && <div className="state-card">{error}</div>}

      {!loading && rows.length === 0 ? (
        <div className="client-panier-empty">
          <p>Votre panier est vide.</p>
          <Link to="/search" className="btn btn-primary">
            Explorer les activités
          </Link>
        </div>
      ) : null}

      {!loading && rows.length > 0 ? (
        <>
          <div className="client-panier-list">
            {rows.map((row) => (
              <article key={row.id} className="client-panier-card">
                <div>
                  <h2>{row.title}</h2>
                  <p>
                    {row.city} - {row.date} - {row.hour}
                  </p>
                  <small>{money(row.prixUnitaire)} / place</small>
                </div>
                <div className="client-panier-actions">
                  <label>
                    Qté
                    <input
                      type="number"
                      min={1}
                      value={row.quantite}
                      disabled={busyId === row.id}
                      onChange={(e) =>
                        updateQty(row.id, Math.max(1, Number(e.target.value) || 1))
                      }
                    />
                  </label>
                  <strong>{money(row.prixUnitaire * row.quantite)}</strong>
                  <button
                    type="button"
                    disabled={busyId === row.id}
                    onClick={() => removeLine(row.id)}
                  >
                    Retirer
                  </button>
                </div>
              </article>
            ))}
          </div>

          <footer className="client-panier-footer">
            <div>
              <p>Total</p>
              <strong>{money(total)}</strong>
            </div>
            <div className="client-panier-footer-actions">
              <button
                type="button"
                className="btn btn-light"
                disabled={checkoutBusy}
                onClick={clearPanier}
              >
                Vider
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={checkoutBusy}
                onClick={checkout}
              >
                {checkoutBusy ? 'Traitement...' : 'Valider et payer (simulation)'}
              </button>
            </div>
          </footer>
        </>
      ) : null}
    </section>
  )
}
