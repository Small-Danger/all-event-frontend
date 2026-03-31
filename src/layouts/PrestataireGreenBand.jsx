/**
 * Bandeau vert type identite prestataire (fond #14532d, CTA pilule blanche).
 * Les styles sont dans prestataire-layout.css (charge par PrestataireLayout).
 */
export function PrestataireGreenBand({ kicker, title, subtitle, action, variant = 'default' }) {
  return (
    <div
      className={
        variant === 'compact'
          ? 'prestataire-green-band prestataire-green-band--compact'
          : 'prestataire-green-band'
      }
    >
      <div className="prestataire-green-band-inner">
        <div className="prestataire-green-band-text">
          {kicker ? <p className="prestataire-green-band-kicker">{kicker}</p> : null}
          <h1 className="prestataire-green-band-title">{title}</h1>
          {subtitle ? <p className="prestataire-green-band-sub">{subtitle}</p> : null}
        </div>
        {action != null && action !== false ? (
          <div className="prestataire-green-band-action">{action}</div>
        ) : null}
      </div>
    </div>
  )
}
