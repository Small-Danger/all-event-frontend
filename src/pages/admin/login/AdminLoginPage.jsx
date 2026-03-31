import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../../../context/useAuth'
import logoAllevent from '../../../assets/brand/logo-allevent.png'
import './AdminLoginPage.css'

export function AdminLoginPage() {
  const { login, logout } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const onSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      const user = await login(form)
      if (user.role !== 'admin') {
        await logout()
        setError("Ce compte n'a pas les droits administrateur.")
        return
      }
      navigate('/admin/dashboard', { replace: true })
    } catch (loginError) {
      setError(loginError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="admin-login-page">
      <div className="admin-login-shell">
        <aside className="admin-login-visual">
          <div className="admin-login-overlay" />
          <div className="admin-login-brand">
            <img src={logoAllevent} alt="ALL EVENT" />
            <p className="brand-tag">ALL EVENT</p>
            <h2>Console Administrateur</h2>
            <p>
              Supervisez les activites, la moderation, les litiges et les
              performances de la plateforme dans une interface securisee.
            </p>
            <div className="admin-login-pills">
              <span>Moderation temps reel</span>
              <span>Gestion multi-acteurs</span>
              <span>Commissions & litiges</span>
            </div>
          </div>
        </aside>

        <article className="admin-login-card">
          <div className="admin-login-head">
            <h1>Connexion administrateur</h1>
            <p>Acces reserve a l equipe operations ALL EVENT.</p>
          </div>
          <form className="admin-login-form" onSubmit={onSubmit}>
            <label>
              Email professionnel
              <input
                type="email"
                placeholder="admin@allevent.local"
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({ ...current, email: event.target.value }))
                }
                required
              />
            </label>
            <label>
              Mot de passe
              <input
                type="password"
                placeholder="********"
                value={form.password}
                onChange={(event) =>
                  setForm((current) => ({ ...current, password: event.target.value }))
                }
                required
              />
            </label>
            {error && <p className="admin-auth-feedback">{error}</p>}
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Connexion...' : 'Acceder au back-office'}
            </button>
          </form>
          <div className="admin-login-links">
            <Link to="/admin/dashboard?demo=1">Entrer en mode demo</Link>
            <Link to="/">Retour au site public</Link>
          </div>
        </article>
      </div>
    </section>
  )
}
