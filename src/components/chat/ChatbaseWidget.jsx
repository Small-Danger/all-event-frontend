import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../context/useAuth'

const CHATBASE_DOMAIN = 'www.chatbase.co'
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api'

function ensureChatbaseProxy() {
  if (window.chatbase && window.chatbase('getState') === 'initialized') {
    return
  }

  window.chatbase = (...args) => {
    if (!window.chatbase.q) window.chatbase.q = []
    window.chatbase.q.push(args)
  }

  window.chatbase = new Proxy(window.chatbase, {
    get(target, prop) {
      if (prop === 'q') return target.q
      return (...args) => target(prop, ...args)
    },
  })
}

export function ChatbaseWidget() {
  const { auth } = useAuth()
  const [isScriptReady, setIsScriptReady] = useState(false)
  const identifiedUserIdRef = useRef(null)

  useEffect(() => {
    const botId = import.meta.env.VITE_CHATBASE_BOT_ID
    if (!botId) return

    ensureChatbaseProxy()

    const existing = document.getElementById(botId)
    if (existing) {
      setIsScriptReady(true)
      return
    }

    const script = document.createElement('script')
    script.src = 'https://www.chatbase.co/embed.min.js'
    script.id = botId
    script.domain = CHATBASE_DOMAIN
    script.defer = true
    script.onload = () => setIsScriptReady(true)
    script.onerror = () => setIsScriptReady(false)
    document.body.appendChild(script)
  }, [])

  useEffect(() => {
    if (!auth.isAuthenticated || !auth.token) {
      identifiedUserIdRef.current = null
      return
    }

    if (!isScriptReady || !window.chatbase || !auth.user?.id) {
      return
    }

    if (identifiedUserIdRef.current === auth.user.id) {
      return
    }

    const identify = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/chatbase/identity-token`, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${auth.token}`,
          },
        })

        if (!response.ok) return
        const payload = await response.json()
        if (!payload?.token) return

        window.chatbase('identify', {
          userId: String(auth.user.id),
          token: payload.token,
        })
        identifiedUserIdRef.current = auth.user.id
      } catch {
        // no-op: le chat continue de fonctionner sans identification.
      }
    }

    identify()
  }, [auth.isAuthenticated, auth.token, auth.user?.id, isScriptReady])

  // [DESIGN] Remonte le launcher Chatbase pour libérer l'accès au bouton "Mon compte" mobile.
  useEffect(() => {
    const applyLauncherOffset = () => {
      const candidates = document.querySelectorAll(
        'iframe[src*="chatbase"], [id*="chatbase"], [class*="chatbase"]',
      )
      candidates.forEach((node) => {
        if (!(node instanceof HTMLElement)) return
        const computed = window.getComputedStyle(node)
        if (computed.position !== 'fixed') return
        node.style.setProperty('bottom', 'calc(108px + env(safe-area-inset-bottom, 0px))', 'important')
      })
    }

    applyLauncherOffset()
    const observer = new MutationObserver(() => applyLauncherOffset())
    observer.observe(document.body, { childList: true, subtree: true })

    window.addEventListener('resize', applyLauncherOffset)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', applyLauncherOffset)
    }
  }, [])

  return null
}

