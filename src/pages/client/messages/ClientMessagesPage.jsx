import { useEffect, useMemo, useState } from 'react'
import { messageThreads } from '../clientMockData'
import { clientApi } from '../../../services/clientApi'
import './ClientMessagesPage.css'

export function ClientMessagesPage() {
  const [threads, setThreads] = useState(messageThreads)
  const [activeId, setActiveId] = useState(messageThreads[0]?.id || '')
  const [draft, setDraft] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    clientApi
      .getLitiges()
      .then(async (list) => {
        if (!active || !list.length) return
        const mapped = list.map((item) => ({
          id: String(item.id),
          with: item?.prestataire?.nom || `Litige #${item.id}`,
          unread: 0,
          messages: [],
        }))
        setThreads(mapped)
        setActiveId(mapped[0]?.id || '')

        const firstId = mapped[0]?.id
        if (firstId) {
          const detail = await clientApi.getLitigeDetail(firstId)
          if (!active) return
          setThreads((current) =>
            current.map((thread) =>
              thread.id === firstId
                ? {
                    ...thread,
                    messages: (detail?.messages || []).map((message) => ({
                      id: String(message.id),
                      from: message?.auteur?.role === 'client' ? 'me' : 'them',
                      text: message.message,
                      time: message?.created_at?.slice(11, 16) || '--:--',
                    })),
                  }
                : thread,
            ),
          )
        }
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

  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === activeId),
    [threads, activeId],
  )

  const sendMessage = async () => {
    if (!draft.trim() || !activeThread) return

    try {
      const numericLitigeId = Number(activeThread.id)
      if (Number.isFinite(numericLitigeId)) {
        await clientApi.sendLitigeMessage(numericLitigeId, draft.trim())
      }
    } catch (apiError) {
      setError(apiError.message)
      return
    }

    setThreads((current) =>
      current.map((thread) =>
        thread.id === activeThread.id
          ? {
              ...thread,
              messages: [
                ...thread.messages,
                {
                  id: `M-${Date.now()}`,
                  from: 'me',
                  text: draft.trim(),
                  time: 'Maintenant',
                },
              ],
            }
          : thread,
      ),
    )
    setDraft('')
  }

  return (
    <section className="client-messages-page">
      <header>
        <h1>Messages</h1>
        <p>Echangez avec les prestataires depuis vos dossiers de litige.</p>
      </header>
      {isLoading && <div className="chat-panel">Chargement des conversations...</div>}
      {!isLoading && error && <div className="chat-panel">{error}</div>}

      <div className="messages-layout">
        <aside className="thread-list">
          {threads.map((thread) => (
            <button
              key={thread.id}
              type="button"
              onClick={() => setActiveId(thread.id)}
              className={thread.id === activeId ? 'active' : ''}
            >
              <strong>{thread.with}</strong>
              <small>
                {thread.unread > 0 ? `${thread.unread} non lus` : 'Aucun non lu'}
              </small>
            </button>
          ))}
        </aside>

        <article className="chat-panel">
          {activeThread && (
            <>
              <h2>{activeThread.with}</h2>
              <div className="chat-messages">
                {activeThread.messages.map((message) => (
                  <div
                    key={message.id}
                    className={message.from === 'me' ? 'chat-bubble me' : 'chat-bubble'}
                  >
                    <p>{message.text}</p>
                    <small>{message.time}</small>
                  </div>
                ))}
              </div>
              <div className="chat-composer">
                <input
                  type="text"
                  placeholder="Votre message..."
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                />
                <button type="button" onClick={sendMessage}>
                  Envoyer
                </button>
              </div>
            </>
          )}
        </article>
      </div>
    </section>
  )
}
