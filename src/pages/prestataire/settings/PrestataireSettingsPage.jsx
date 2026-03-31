import { useCallback, useEffect, useState } from 'react'
import { proProfile } from '../prestataireMockData'
import { usePrestataireFlash } from '../../../context/PrestataireFlashContext'
import { prestataireApi } from '../../../services/prestataireApi'
import './PrestataireSettingsPage.css'

function formatBytes(n) {
  if (n == null || Number.isNaN(Number(n))) return '—'
  const v = Number(n)
  if (v < 1024) return `${v} o`
  if (v < 1024 * 1024) return `${(v / 1024).toFixed(1)} Ko`
  return `${(v / 1024 / 1024).toFixed(1)} Mo`
}

export function PrestataireSettingsPage() {
  const { showFlash } = usePrestataireFlash()
  const [profileId, setProfileId] = useState(null)
  const [form, setForm] = useState({
    businessName: proProfile.name,
    legalName: '',
    fiscalNumber: '',
  })
  const [profileStatus, setProfileStatus] = useState('')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [documents, setDocuments] = useState([])
  const [docsLoading, setDocsLoading] = useState(false)
  const [docLibelle, setDocLibelle] = useState('')
  const [docFile, setDocFile] = useState(null)
  const [docUploading, setDocUploading] = useState(false)
  const [docDeletingId, setDocDeletingId] = useState(null)
  const [rejectReason, setRejectReason] = useState('')

  const loadDocuments = useCallback(async (pid) => {
    if (!pid) return
    setDocsLoading(true)
    try {
      const list = await prestataireApi.getVerificationDocuments(pid)
      setDocuments(Array.isArray(list) ? list : [])
    } catch {
      setDocuments([])
    } finally {
      setDocsLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    prestataireApi
      .getProfiles()
      .then((profiles) => {
        if (!active || !profiles.length) return
        const first = profiles[0]
        setProfileId(first.id)
        setProfileStatus(first.statut || '')
        setRejectReason(first.motif_rejet || '')
        setForm((current) => ({
          ...current,
          businessName: first.nom || current.businessName,
          legalName: first.raison_sociale || '',
          fiscalNumber: first.numero_fiscal || '',
        }))
        loadDocuments(first.id)
      })
      .catch((apiError) => {
        if (!active) return
        setError(apiError.message)
      })
    return () => {
      active = false
    }
  }, [loadDocuments])

  const update = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }))
    setSaved(false)
  }

  const onSave = async () => {
    setError('')
    if (!form.businessName.trim()) {
      const msg = 'Le nom de la structure est requis.'
      setError(msg)
      showFlash(msg, 'error')
      return
    }
    try {
      const payload = {
        nom: form.businessName.trim(),
        raison_sociale: form.legalName.trim() || null,
        numero_fiscal: form.fiscalNumber.trim() || null,
      }
      let nextProfileId = profileId
      if (!nextProfileId) {
        const created = await prestataireApi.createProfile(payload)
        nextProfileId = created?.id || null
      } else {
        await prestataireApi.updateProfile(nextProfileId, payload)
      }
      if (nextProfileId) {
        setProfileId(nextProfileId)
        const profiles = await prestataireApi.getProfiles()
        const current = Array.isArray(profiles) ? profiles.find((p) => Number(p.id) === Number(nextProfileId)) : null
        if (current) {
          setProfileStatus(current.statut || '')
          setRejectReason(current.motif_rejet || '')
        }
      }
      setSaved(true)
      showFlash('Parametres enregistres sur le serveur.')
    } catch (apiError) {
      const msg = apiError.message
      setError(msg)
      showFlash(msg, 'error')
    }
  }

  const onUploadDoc = async (e) => {
    e.preventDefault()
    if (!profileId || !docFile) {
      showFlash('Choisissez un fichier PDF ou une image.', 'error')
      return
    }
    setDocUploading(true)
    setError('')
    try {
      await prestataireApi.uploadVerificationDocument(profileId, docFile, docLibelle)
      setDocFile(null)
      setDocLibelle('')
      const input = document.getElementById('presta-doc-file')
      if (input) input.value = ''
      await loadDocuments(profileId)
      showFlash('Document envoye. L equipe ALL EVENT pourra le consulter.')
    } catch (apiError) {
      const msg = apiError.message
      setError(msg)
      showFlash(msg, 'error')
    } finally {
      setDocUploading(false)
    }
  }

  const onDeleteDoc = async (docId) => {
    if (!profileId) return
    setDocDeletingId(docId)
    setError('')
    try {
      await prestataireApi.deleteVerificationDocument(profileId, docId)
      await loadDocuments(profileId)
      showFlash('Document supprime.')
    } catch (apiError) {
      const msg = apiError.message
      setError(msg)
      showFlash(msg, 'error')
    } finally {
      setDocDeletingId(null)
    }
  }

  const hasRequiredFields =
    form.businessName.trim() !== '' &&
    form.legalName.trim() !== '' &&
    form.fiscalNumber.trim() !== ''

  const canSubmit = Boolean(profileId) && hasRequiredFields && documents.length > 0 && !docUploading

  const onSubmitProfile = async () => {
    if (!profileId) {
      showFlash('Enregistrez d abord votre structure.', 'error')
      return
    }
    setError('')
    try {
      const res = await prestataireApi.submitProfileValidation(profileId)
      const p = res?.prestataire
      if (p?.statut) setProfileStatus(p.statut)
      setRejectReason(p?.motif_rejet || '')
      showFlash('Demande envoyee. Vous recevrez un email de confirmation.')
    } catch (apiError) {
      const msg = apiError.message
      setError(msg)
      showFlash(msg, 'error')
    }
  }

  return (
    <section className="pro-settings-page">
      <header className="settings-head">
        <h1>Parametres professionnels</h1>
        <p>Completez votre dossier puis soumettez-le pour validation administrative.</p>
      </header>
      {error && <p className="settings-error">{error}</p>}
      <div className="settings-card">
        <div className="settings-status-row">
          <span className={`settings-status-pill settings-status-pill--${profileStatus || 'inconnu'}`}>
            Statut: {profileStatus || 'non initialise'}
          </span>
        </div>
        {profileStatus === 'rejete' && (
          <p className="settings-reject-reason">
            Motif de rejet admin: <strong>{rejectReason || 'Non renseigne'}</strong>
          </p>
        )}
        <h2>Identite de la structure</h2>
        <div className="settings-grid">
          <label>
            Nom commercial *
            <input
              value={form.businessName}
              onChange={(e) => update('businessName', e.target.value)}
            />
          </label>
          <label>
            Raison sociale *
            <input value={form.legalName} onChange={(e) => update('legalName', e.target.value)} />
          </label>
          <label>
            Numero fiscal *
            <input value={form.fiscalNumber} onChange={(e) => update('fiscalNumber', e.target.value)} />
          </label>
        </div>
        <div className="settings-actions">
          <button type="button" onClick={onSave}>
            Sauvegarder les parametres
          </button>
          <button
            type="button"
            className="settings-submit-btn"
            disabled={!canSubmit}
            onClick={onSubmitProfile}
            title={
              canSubmit
                ? 'Soumettre le dossier pour verification admin'
                : 'Completez les champs obligatoires et deposez au moins une piece.'
            }
          >
            Soumettre le dossier
          </button>
        </div>
        <p className="settings-checklist">
          Exigences admin: nom commercial, raison sociale, numero fiscal et au moins une piece de verification.
        </p>
        {saved && <span className="settings-saved">Parametres enregistres.</span>}
      </div>

      <div className="settings-card settings-card--docs">
        <h2>Pieces de verification (administration)</h2>
        <p className="settings-doc-lead">
          Deposez des documents (PDF, JPEG, PNG, max. 10 Mo) pour que l equipe ALL EVENT puisse verifier
          votre structure avant validation. Ces fichiers ne sont pas publics.
        </p>
        {profileId ? (
          <form className="settings-doc-form" onSubmit={onUploadDoc}>
            <label className="settings-doc-libelle">
              Libelle (optionnel)
              <input
                type="text"
                placeholder="Ex. Extrait RCCM, piece d identite du representant"
                value={docLibelle}
                onChange={(e) => setDocLibelle(e.target.value)}
                maxLength={255}
              />
            </label>
            <label className="settings-doc-file">
              Fichier
              <input
                id="presta-doc-file"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                onChange={(e) => setDocFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <button type="submit" disabled={docUploading || !docFile}>
              {docUploading ? 'Envoi…' : 'Envoyer le document'}
            </button>
          </form>
        ) : (
          <p className="settings-muted">Aucun profil prestataire charge.</p>
        )}

        <h3 className="settings-doc-list-title">Documents envoyes</h3>
        {docsLoading ? (
          <p className="settings-muted">Chargement…</p>
        ) : documents.length === 0 ? (
          <p className="settings-muted">Aucun document pour l instant.</p>
        ) : (
          <ul className="settings-doc-list">
            {documents.map((d) => (
              <li key={d.id}>
                <div className="settings-doc-row">
                  <div>
                    <strong>{d.libelle ? `${d.libelle} — ` : ''}{d.nom_original}</strong>
                    <span className="settings-muted">
                      {' '}
                      {formatBytes(d.taille_octets)} ·{' '}
                      {d.created_at
                        ? new Date(d.created_at).toLocaleString('fr-FR', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })
                        : ''}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="settings-doc-delete"
                    disabled={docDeletingId === d.id}
                    onClick={() => onDeleteDoc(d.id)}
                  >
                    {docDeletingId === d.id ? '…' : 'Retirer'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
