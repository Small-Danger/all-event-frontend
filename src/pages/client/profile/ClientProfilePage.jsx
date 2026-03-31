import { useEffect, useState } from 'react'
import { clientProfile } from '../clientMockData'
import { clientApi } from '../../../services/clientApi'
import './ClientProfilePage.css'

export function ClientProfilePage() {
  const [form, setForm] = useState(clientProfile)
  const [isSaving, setIsSaving] = useState(true)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    clientApi
      .getProfile()
      .then((profile) => {
        if (!active) return
        setForm((current) => ({ ...current, ...profile }))
      })
      .catch((apiError) => {
        if (!active) return
        setError(apiError.message)
      })
      .finally(() => {
        if (active) setIsSaving(false)
      })
    return () => {
      active = false
    }
  }, [])

  const onFieldChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setSaved(false)
  }

  const onSave = (event) => {
    event.preventDefault()
    setError('')
    setIsSaving(true)
    clientApi
      .updateProfile(form)
      .then(() => {
        setSaved(true)
      })
      .catch((apiError) => {
        setError(apiError.message)
      })
      .finally(() => {
      setIsSaving(false)
      })
  }

  return (
    <section className="client-profile-page">
      <header className="profile-head">
        <img src={form.avatar} alt={form.firstName} />
        <div>
          <h1>Mon profil</h1>
          <p>Membre ALL EVENT depuis {form.memberSince}</p>
        </div>
      </header>

      <form className="profile-form" onSubmit={onSave}>
        <label>
          Prenom
          <input name="firstName" value={form.firstName} onChange={onFieldChange} />
        </label>
        <label>
          Nom
          <input name="lastName" value={form.lastName} onChange={onFieldChange} />
        </label>
        <label>
          Email
          <input name="email" type="email" value={form.email} onChange={onFieldChange} />
        </label>
        <label>
          Telephone
          <input name="phone" value={form.phone} onChange={onFieldChange} />
        </label>
        <label>
          Ville
          <input name="city" value={form.city} onChange={onFieldChange} />
        </label>
        <label>
          Date de naissance
          <input
            name="birthday"
            type="date"
            value={form.birthday}
            onChange={onFieldChange}
          />
        </label>

        <div className="profile-actions">
          <button type="submit" disabled={isSaving}>
            {isSaving ? 'Chargement/Sauvegarde...' : 'Sauvegarder'}
          </button>
          {saved && <span>Profil mis a jour avec succes.</span>}
          {error && <span className="profile-error">{error}</span>}
        </div>
      </form>
    </section>
  )
}
