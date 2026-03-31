export const proProfile = {
  name: 'Savana Adventure',
  city: 'Douala',
  category: 'Loisir et aventure',
}

export const proActivitiesSeed = [
  {
    id: 'ACT-1',
    title: 'Quad Sunset',
    city: 'Kribi',
    price: 45000,
    status: 'published',
    seats: 12,
    category: 'Loisir',
    coverUrl: 'https://picsum.photos/seed/allevent-a1/400/250',
    mediasCount: 1,
    creneauxCount: 0,
  },
  {
    id: 'ACT-2',
    title: 'Safari Urbain',
    city: 'Douala',
    price: 30000,
    status: 'pending_review',
    seats: 20,
    category: 'Loisir',
    coverUrl: 'https://picsum.photos/seed/allevent-a2/400/250',
    mediasCount: 1,
    creneauxCount: 0,
  },
  {
    id: 'ACT-3',
    title: 'Randonnee Premium',
    city: 'Bafoussam',
    price: 38000,
    status: 'published',
    seats: 15,
    category: 'Nature',
    coverUrl: 'https://picsum.photos/seed/allevent-a3/400/250',
    mediasCount: 1,
    creneauxCount: 0,
  },
]

export const proReservationsSeed = [
  { id: 'R-1001', activity: 'Quad Sunset', customer: 'Aline M.', date: '2026-04-02', people: 2, amount: 90000, status: 'confirmed' },
  { id: 'R-1002', activity: 'Randonnee Premium', customer: 'Brice T.', date: '2026-04-04', people: 4, amount: 152000, status: 'pending' },
  { id: 'R-1003', activity: 'Quad Sunset', customer: 'Nina K.', date: '2026-03-21', people: 3, amount: 135000, status: 'done' },
]

export const proReviewsSeed = [
  { id: 'PV-1', client: 'Aline M.', score: 5, date: '2026-03-19', text: 'Organisation nickel et equipe tres pro.' },
  { id: 'PV-2', client: 'Ibrahim D.', score: 4, date: '2026-03-11', text: 'Tres bonne experience, depart un peu en retard.' },
]

export const proAdsSeed = [
  { id: 'AD-1', title: 'Campagne Weekend', budget: 120000, clicks: 420, status: 'active' },
  { id: 'AD-2', title: 'Retargeting Mars', budget: 80000, clicks: 190, status: 'paused' },
]

export const proRevenueSeed = [
  { id: 'REV-01', month: 'Jan 2026', gross: 980000, commission: 98000, net: 882000 },
  { id: 'REV-02', month: 'Fev 2026', gross: 1120000, commission: 112000, net: 1008000 },
  { id: 'REV-03', month: 'Mar 2026', gross: 1240000, commission: 124000, net: 1116000 },
]

export const proSuggestionsSeed = [
  { id: 'SG-1', label: 'Ajouter une option de transfert client', votes: 27 },
  { id: 'SG-2', label: 'Mode de paiement en 2 fois', votes: 41 },
]
