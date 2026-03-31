export function PagePlaceholder({ title, scope }) {
  return (
    <section style={{ padding: '24px' }}>
      <h1 style={{ marginBottom: '8px' }}>{title}</h1>
      <p style={{ margin: 0, opacity: 0.8 }}>
        Zone: {scope} - page squelette prete pour l'integration metier.
      </p>
    </section>
  )
}
