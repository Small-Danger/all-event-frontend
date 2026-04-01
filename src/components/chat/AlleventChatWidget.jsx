import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { getLocalBotReply } from './chatbotReplies'
import './AlleventChatWidget.css'

const STORAGE_KEY = 'allevent_chat_thread_v1'

function loadThread() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    return Array.isArray(data) ? data : null
  } catch {
    return null
  }
}

function saveThread(messages) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
  } catch {
    /* ignore */
  }
}

async function fetchRemoteReply(userText) {
  const url = import.meta.env.VITE_CHATBOT_API_URL
  if (!url || typeof url !== 'string') return null
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  }
  const token = localStorage.getItem('allevent_auth_token')
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ message: userText }),
  })
  if (!res.ok) return null
  const data = await res.json().catch(() => null)
  if (data == null) return null
  const reply = data.reply ?? data.message ?? data.text ?? data.answer
  return typeof reply === 'string' && reply.trim() ? reply.trim() : null
}

export function AlleventChatWidget() {
  const panelId = useId()
  const listRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [pending, setPending] = useState(false)
  const [messages, setMessages] = useState(() => {
    const saved = loadThread()
    if (saved?.length) return saved
    return [
      {
        id: 'welcome',
        role: 'bot',
        text: "Bonjour ! Je suis l’assistant ALL EVENT. Comment puis-je vous aider aujourd’hui ?",
        ts: Date.now(),
      },
    ]
  })

  useEffect(() => {
    saveThread(messages)
  }, [messages])

  useEffect(() => {
    if (!open) return
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [open, messages, pending])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || pending) return
    setInput('')
    const userMsg = { id: `u-${Date.now()}`, role: 'user', text, ts: Date.now() }
    setMessages((m) => [...m, userMsg])
    setPending(true)
    try {
      let answer = await fetchRemoteReply(text)
      if (answer == null) answer = getLocalBotReply(text)
      setMessages((m) => [...m, { id: `b-${Date.now()}`, role: 'bot', text: answer, ts: Date.now() }])
    } catch {
      setMessages((m) => [
        ...m,
        {
          id: `b-${Date.now()}`,
          role: 'bot',
          text: getLocalBotReply(text),
          ts: Date.now(),
        },
      ])
    } finally {
      setPending(false)
    }
  }, [input, pending])

  const onSubmit = (e) => {
    e.preventDefault()
    send()
  }

  return (
    <div className="allevent-chat-root">
      {open ? (
        <section
          id={panelId}
          className="allevent-chat-panel"
          role="dialog"
          aria-modal="true"
          aria-label="Assistant ALL EVENT"
        >
          <header className="allevent-chat-head">
            <div className="allevent-chat-head-text">
              <span className="allevent-chat-title">ALL EVENT</span>
              <span className="allevent-chat-sub">Assistant — réponses automatiques</span>
            </div>
            <button
              type="button"
              className="allevent-chat-close"
              aria-label="Fermer le chat"
              onClick={() => setOpen(false)}
            >
              ×
            </button>
          </header>
          <div className="allevent-chat-messages" ref={listRef} role="log" aria-live="polite">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`allevent-chat-bubble allevent-chat-bubble--${msg.role}`}
              >
                {msg.text}
              </div>
            ))}
            {pending ? (
              <div className="allevent-chat-bubble allevent-chat-bubble--bot allevent-chat-typing" aria-hidden>
                <span />
                <span />
                <span />
              </div>
            ) : null}
          </div>
          <form className="allevent-chat-form" onSubmit={onSubmit}>
            <label htmlFor="allevent-chat-input" className="allevent-chat-sr-only">
              Votre message
            </label>
            <input
              id="allevent-chat-input"
              type="text"
              autoComplete="off"
              placeholder="Écrivez votre message…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={2000}
            />
            <button type="submit" className="allevent-chat-send" disabled={pending || !input.trim()}>
              Envoyer
            </button>
          </form>
        </section>
      ) : null}

      <button
        type="button"
        className="allevent-chat-launcher"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? 'Fermer l’assistant ALL EVENT' : 'Ouvrir l’assistant ALL EVENT'}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="allevent-chat-launcher-icon" aria-hidden>
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        </span>
        <span className="allevent-chat-launcher-label">Aide</span>
      </button>
    </div>
  )
}
