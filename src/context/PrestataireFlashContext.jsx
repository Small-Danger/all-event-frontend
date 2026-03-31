import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'

const PrestataireFlashContext = createContext(null)

const DEFAULT_DURATION = 4500

/**
 * Notifications visuelles (succes / erreur) pour l espace prestataire.
 */
export function PrestataireFlashProvider({ children }) {
  const [state, setState] = useState({ message: '', variant: 'success' })
  const timerRef = useRef(null)

  const showFlash = useCallback((message, variant = 'success', duration = DEFAULT_DURATION) => {
    if (!message) return
    if (timerRef.current) clearTimeout(timerRef.current)
    setState({ message, variant })
    timerRef.current = setTimeout(() => {
      setState((s) => ({ ...s, message: '' }))
      timerRef.current = null
    }, duration)
  }, [])

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    },
    [],
  )

  return (
    <PrestataireFlashContext.Provider value={{ showFlash }}>
      {state.message ? (
        <div
          className={`prestataire-flash prestataire-flash--${state.variant}`}
          role="status"
          aria-live="polite"
        >
          <span className="prestataire-flash-icon" aria-hidden>
            {state.variant === 'success' ? '✓' : '!'}
          </span>
          <span className="prestataire-flash-text">{state.message}</span>
        </div>
      ) : null}
      {children}
    </PrestataireFlashContext.Provider>
  )
}

export function usePrestataireFlash() {
  const ctx = useContext(PrestataireFlashContext)
  if (!ctx) {
    throw new Error('usePrestataireFlash doit etre utilise sous PrestataireFlashProvider')
  }
  return ctx
}
