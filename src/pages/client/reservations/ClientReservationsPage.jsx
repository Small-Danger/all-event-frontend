import { useEffect, useMemo, useState } from 'react'
import { clientApi } from '../../../services/clientApi'
import './ClientReservationsPage.css'

const tabs = [
  { id: 'upcoming', label: 'A venir' },
  { id: 'done', label: 'Passees' },
  { id: 'cancelled', label: 'Annulees' },
]

function formatAmount(value) {
  return `${value.toLocaleString('fr-FR')} MAD`
}

function buildTicketQrValue(ticket) {
  const payload = {
    type: 'ALLEVENT_TICKET',
    reservationId: ticket?.id ?? null,
    code: ticket?.billetCode || null,
    activity: ticket?.title || null,
    date: ticket?.date || null,
    hour: ticket?.hour || null,
    amount: Number(ticket?.amount || 0),
    provider: ticket?.providerName || null,
  }
  return JSON.stringify(payload)
}

export function ClientReservationsPage() {
  const [selectedTab, setSelectedTab] = useState('upcoming')
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState(reservationsSeed)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [ticket, setTicket] = useState(null)

  useEffect(() => {
    let active = true
    clientApi
      .getReservations()
      .then((data) => {
        if (!active) return
        setRows(Array.isArray(data) ? data : [])
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

  const rowMatchesTab = (item, tab) => {
    if (tab === 'upcoming') {
      return item.status === 'upcoming' || item.status === 'pending_payment'
    }
    return item.status === tab
  }

  const filteredRows = useMemo(
    () =>
      rows.filter(
        (item) =>
          rowMatchesTab(item, selectedTab) &&
          `${item.title} ${item.city}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [rows, search, selectedTab],
  )

  const simulerPaiement = async (id) => {
    setIsLoading(true)
    setError('')
    try {
      await clientApi.simulerPaiementReservation(id)
      const data = await clientApi.getReservations()
      setRows(data)
    } catch (apiError) {
      setError(apiError.message)
    } finally {
      setIsLoading(false)
    }
  }

  const cancelReservation = async (id) => {
    setIsLoading(true)
    try {
      await clientApi.cancelReservation(id)
      setRows((current) =>
        current.map((row) => (row.id === id ? { ...row, status: 'cancelled' } : row)),
      )
      setSelectedTab('cancelled')
    } catch (apiError) {
      setError(apiError.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="client-reservations-page">
      <header className="reservations-head">
        <h1>Mes reservations</h1>
        <p>Suivez vos experiences, gelez des options et annulez si besoin.</p>
      </header>

      {!isLoading && rows.length > 0 ? (
        <div className="reservation-kpis">
          <article>
            <span>Total</span>
            <strong>{rows.length}</strong>
          </article>
          <article>
            <span>A venir</span>
            <strong>
              {rows.filter((r) => r.status === 'upcoming' || r.status === 'pending_payment').length}
            </strong>
          </article>
          <article>
            <span>Budget cumule</span>
            <strong>{formatAmount(rows.reduce((sum, r) => sum + Number(r.amount || 0), 0))}</strong>
          </article>
        </div>
      ) : null}

      <div className="reservations-toolbar">
        <div className="tab-switcher">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedTab(tab.id)}
              className={selectedTab === tab.id ? 'active' : ''}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Rechercher une reservation..."
        />
      </div>

      {isLoading && <div className="state-card">Mise a jour en cours...</div>}
      {!isLoading && error && <div className="state-card">{error}</div>}

      {!isLoading && filteredRows.length === 0 && (
        <div className="state-card">
          {rows.length === 0
            ? 'Vous n’avez pas encore de reservation. Explorez le catalogue pour reserver une activite.'
            : 'Aucune reservation dans cette categorie.'}
        </div>
      )}

      {!isLoading && filteredRows.length > 0 && (
        <div className="reservations-list">
          {filteredRows.map((item) => (
            <article key={item.id} className="reservation-card">
              <div>
                <h2>{item.title}</h2>
                <p>
                  {item.city} - {item.date} - {item.hour}
                </p>
                <small>{item.guests} participants</small>
              </div>
              <div className="reservation-actions">
                <strong>{formatAmount(item.amount)}</strong>
                <button
                  type="button"
                  className="reservation-ticket-btn"
                  onClick={async () => {
                    try {
                      const detail = await clientApi.getReservationDetail(item.id)
                      setTicket(detail)
                    } catch {
                      setTicket(item)
                    }
                  }}
                >
                  Voir billet
                </button>
                {item.status === 'pending_payment' && (
                  <button type="button" onClick={() => simulerPaiement(item.id)}>
                    Simuler le paiement
                  </button>
                )}
                {item.status === 'upcoming' && (
                  <button type="button" onClick={() => cancelReservation(item.id)}>
                    Annuler
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {ticket ? (
        <div className="ticket-backdrop" role="presentation" onClick={() => setTicket(null)}>
          <article className="ticket-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <header className="ticket-head">
              <h2>Billet electronique</h2>
              <button type="button" onClick={() => setTicket(null)}>
                Fermer
              </button>
            </header>

            <div className="ticket-body">
              {(() => {
                const qrValue = buildTicketQrValue(ticket)
                const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrValue)}`
                return (
                  <div className="ticket-qr-wrap">
                    <img className="ticket-qr-img" src={qrSrc} alt="QR code du billet" loading="lazy" />
                  </div>
                )
              })()}

              <p className="ticket-provider">
                {ticket.providerName ? `Organise par ${ticket.providerName}` : 'ALL EVENT'}
              </p>
              <h3>{ticket.title}</h3>
              <p>
                {ticket.date} - {ticket.hour}
              </p>
              <p>{ticket.guests} participant(s)</p>
              <p className="ticket-price">{formatAmount(ticket.amount)}</p>
              {ticket.billetCode ? <p className="ticket-code">Code billet: {ticket.billetCode}</p> : null}

              {(ticket.placeName || ticket.placeAddress || ticket.city) && (
                <p className="ticket-place">
                  {ticket.placeName || 'Lieu'} {ticket.placeAddress ? `- ${ticket.placeAddress}` : ''}{' '}
                  {ticket.city ? `(${ticket.city})` : ''}
                </p>
              )}

              <a
                className="ticket-map-link"
                target="_blank"
                rel="noreferrer"
                href={
                  ticket.latitude != null && ticket.longitude != null
                    ? `https://www.google.com/maps?q=${ticket.latitude},${ticket.longitude}`
                    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        [ticket.placeName, ticket.placeAddress, ticket.city].filter(Boolean).join(' '),
                      )}`
                }
              >
                Ouvrir dans Google Maps
              </a>
            </div>
          </article>
        </div>
      ) : null}
    </section>
  )
}
