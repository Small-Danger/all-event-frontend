import { useState } from 'react'
import { adminNotificationsSeed } from '../adminMockData'
import './AdminNotificationsPage.css'

export function AdminNotificationsPage() {
  const [rows, setRows] = useState(adminNotificationsSeed)
  const toggle = (id) => setRows((current) => current.map((item) => (item.id === id ? { ...item, enabled: !item.enabled } : item)))
  return (
    <section className="admin-notifications-page">
      <h1>Notifications</h1>
      <div className="admin-list">
        {rows.map((item) => (
          <article key={item.id} className="admin-row">
            <div><h2>{item.message}</h2><p>{item.channel}</p></div>
            <label className="switch">
              <input type="checkbox" checked={item.enabled} onChange={() => toggle(item.id)} />
              <span>{item.enabled ? 'Active' : 'Inactive'}</span>
            </label>
          </article>
        ))}
      </div>
    </section>
  )
}
