import { useEffect, useState } from 'react'
import { invoicesSeed, paymentMethodsSeed } from '../clientMockData'
import { clientApi } from '../../../services/clientApi'
import './ClientPaymentsPage.css'

function formatAmount(value) {
  return `${value.toLocaleString('fr-FR')} MAD`
}

export function ClientPaymentsPage() {
  const [methods, setMethods] = useState(paymentMethodsSeed)
  const [invoices, setInvoices] = useState(invoicesSeed)
  const [newMethod, setNewMethod] = useState('')
  const [editingMethodId, setEditingMethodId] = useState(null)
  const [editingMethodLabel, setEditingMethodLabel] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    clientApi
      .getReservations()
      .then((rows) => {
        if (!active || !rows.length) return
        setInvoices(
          rows.map((row) => ({
            id: `INV-${row.id}`,
            reservationId: row.id,
            date: row.date,
            amount: row.amount,
            status: row.status === 'cancelled' ? 'refunded' : 'paid',
          })),
        )
      })
      .catch((apiError) => {
        if (!active) return
        setError(apiError.message)
      })
    return () => {
      active = false
    }
  }, [])

  const addMethod = (event) => {
    event.preventDefault()
    if (!newMethod.trim()) return

    setMethods((current) => [
      ...current,
      {
        id: `PM-${Date.now()}`,
        type: 'Mobile Money',
        label: newMethod.trim(),
        isDefault: false,
      },
    ])
    setNewMethod('')
  }

  const markDefault = (id) => {
    setMethods((current) =>
      current.map((method) => ({ ...method, isDefault: method.id === id })),
    )
  }

  const startEditMethod = (method) => {
    setEditingMethodId(method.id)
    setEditingMethodLabel(method.label)
  }

  const saveEditMethod = () => {
    if (!editingMethodId || !editingMethodLabel.trim()) return
    setMethods((current) =>
      current.map((method) =>
        method.id === editingMethodId
          ? { ...method, label: editingMethodLabel.trim() }
          : method,
      ),
    )
    setEditingMethodId(null)
    setEditingMethodLabel('')
  }

  const removeMethod = (id) => {
    const target = methods.find((method) => method.id === id)
    if (!target || target.isDefault) return
    setMethods((current) => current.filter((method) => method.id !== id))
  }

  return (
    <section className="client-payments-page">
      <header>
        <h1>Paiements</h1>
        <p>Suivez vos transactions et configurez vos moyens de paiement.</p>
      </header>
      {error && <div className="payments-panel">{error}</div>}

      <div className="payments-grid">
        <article className="payments-panel">
          <div className="panel-head">
            <h2>Moyens de paiement</h2>
          </div>
          <div className="methods-list">
            {methods.map((method) => (
              <div key={method.id} className="method-card">
                <div>
                  {editingMethodId === method.id ? (
                    <input
                      type="text"
                      value={editingMethodLabel}
                      onChange={(event) => setEditingMethodLabel(event.target.value)}
                    />
                  ) : (
                    <strong>{method.label}</strong>
                  )}
                  <p>{method.type}</p>
                </div>
                <div className="method-actions">
                  {method.isDefault ? (
                    <span className="default-badge">Par defaut</span>
                  ) : (
                    <button type="button" onClick={() => markDefault(method.id)}>
                      Definir par defaut
                    </button>
                  )}
                  {editingMethodId === method.id ? (
                    <button type="button" onClick={saveEditMethod}>
                      Enregistrer
                    </button>
                  ) : (
                    <button type="button" onClick={() => startEditMethod(method)}>
                      Modifier
                    </button>
                  )}
                  {!method.isDefault && (
                    <button
                      type="button"
                      className="danger"
                      onClick={() => removeMethod(method.id)}
                    >
                      Supprimer
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <form className="new-method-form" onSubmit={addMethod}>
            <input
              type="text"
              placeholder="Ex: Orange Money - **** 9011"
              value={newMethod}
              onChange={(event) => setNewMethod(event.target.value)}
            />
            <button type="submit">Ajouter</button>
          </form>
        </article>

        <article className="payments-panel">
          <div className="panel-head">
            <h2>Factures recentes</h2>
          </div>
          <div className="invoice-list">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="invoice-row">
                <div>
                  <strong>{invoice.id}</strong>
                  <p>{invoice.date}</p>
                </div>
                <div className="invoice-meta">
                  <span className={invoice.status === 'paid' ? 'paid' : 'refunded'}>
                    {invoice.status}
                  </span>
                  <strong>{formatAmount(invoice.amount)}</strong>
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  )
}
