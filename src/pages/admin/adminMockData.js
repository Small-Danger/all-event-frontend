export const adminUsersSeed = [
  { id: 'U-1', name: 'Aline Moukouri', role: 'client', status: 'active' },
  { id: 'U-2', name: 'Brice Tchoua', role: 'prestataire', status: 'active' },
  { id: 'U-3', name: 'Nina Kotto', role: 'client', status: 'suspended' },
]

export const adminPrestatairesSeed = [
  { id: 'P-1', name: 'Savana Adventure', city: 'Douala', status: 'verified' },
  { id: 'P-2', name: 'Boat Club Kribi', city: 'Kribi', status: 'pending' },
]

export const adminActivitiesSeed = [
  { id: 'A-1', title: 'Quad Sunset', provider: 'Savana Adventure', status: 'published' },
  { id: 'A-2', title: 'Boat Party', provider: 'Boat Club Kribi', status: 'review' },
]

export const adminReviewsSeed = [
  { id: 'R-1', activity: 'Quad Sunset', score: 5, flagged: false },
  { id: 'R-2', activity: 'Boat Party', score: 2, flagged: true },
]

export const adminNotificationsSeed = [
  { id: 'N-1', message: 'Nouveau signalement recu', channel: 'email', enabled: true },
  { id: 'N-2', message: 'Pic d annulations detecte', channel: 'in-app', enabled: true },
]
