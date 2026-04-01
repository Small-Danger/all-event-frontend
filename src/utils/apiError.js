/**
 * Extrait le premier message d'erreur Laravel (422) pour l'afficher à l'utilisateur.
 */
export function messageFromApiPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return null
  }
  if (payload.errors && typeof payload.errors === 'object') {
    for (const key of Object.keys(payload.errors)) {
      const arr = payload.errors[key]
      if (Array.isArray(arr) && arr[0] != null && String(arr[0]).trim() !== '') {
        return String(arr[0])
      }
    }
  }
  if (typeof payload.message === 'string' && payload.message.trim() !== '') {
    return payload.message
  }
  return null
}
