export const clientProfile = {
  firstName: 'Aline',
  lastName: 'Moukouri',
  email: 'aline.moukouri@email.local',
  phone: '+237 6 77 11 22 33',
  city: 'Douala',
  birthday: '1996-04-17',
  avatar:
    'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=300&q=80',
  memberSince: '2023',
}

export const reservationsSeed = [
  {
    id: 'RSV-1023',
    title: 'Escape Game Urbain',
    city: 'Douala',
    date: '2026-04-05',
    hour: '18:30',
    guests: 4,
    amount: 80000,
    status: 'upcoming',
  },
  {
    id: 'RSV-1011',
    title: 'Atelier Cuisine Locale',
    city: 'Yaounde',
    date: '2026-03-14',
    hour: '10:00',
    guests: 2,
    amount: 36000,
    status: 'done',
  },
  {
    id: 'RSV-999',
    title: 'Sunset Boat Party',
    city: 'Kribi',
    date: '2026-02-20',
    hour: '17:00',
    guests: 3,
    amount: 105000,
    status: 'cancelled',
  },
  {
    id: 'RSV-1019',
    title: 'Concert Electro en Plein Air',
    city: 'Douala',
    date: '2026-04-18',
    hour: '20:00',
    guests: 2,
    amount: 50000,
    status: 'upcoming',
  },
]

export const favoritesSeed = [
  {
    id: 1,
    title: 'Tour Street Art',
    city: 'Yaounde',
    category: 'Culture',
    price: 15000,
    rating: 4.6,
    image:
      'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 2,
    title: 'Session Kayak Lagune',
    city: 'Kribi',
    category: 'Nature',
    price: 28000,
    rating: 4.9,
    image:
      'https://images.unsplash.com/photo-1521336575822-6da63fb45455?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 3,
    title: 'Masterclass Photographie',
    city: 'Douala',
    category: 'Atelier',
    price: 22000,
    rating: 4.7,
    image:
      'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?auto=format&fit=crop&w=800&q=80',
  },
]

export const reviewsSeed = [
  {
    id: 'REV-31',
    reservationId: 'RSV-1011',
    activity: 'Atelier Cuisine Locale',
    score: 5,
    date: '2026-03-15',
    text: 'Super ambiance, chef pedagogue, recettes faciles a refaire chez soi.',
  },
  {
    id: 'REV-29',
    reservationId: 'RSV-988',
    activity: 'Randonnee Cascade',
    score: 4,
    date: '2026-01-10',
    text: 'Guide tres sympa, paysage magnifique. Prevoir de bonnes chaussures.',
  },
]

export const messageThreads = [
  {
    id: 'TH-1',
    with: 'Studio Escape Douala',
    unread: 2,
    messages: [
      {
        id: 'M-1',
        from: 'them',
        text: 'Bonjour Aline, voulez-vous ajouter 1 participant?',
        time: '09:14',
      },
      {
        id: 'M-2',
        from: 'me',
        text: "Oui, c'est possible. Quel est le supplement?",
        time: '09:18',
      },
      {
        id: 'M-3',
        from: 'them',
        text: '500 MAD, payable sur place.',
        time: '09:21',
      },
    ],
  },
  {
    id: 'TH-2',
    with: 'Boat Club Kribi',
    unread: 0,
    messages: [
      {
        id: 'M-4',
        from: 'them',
        text: "N'oubliez pas votre piece d'identite pour l'embarquement.",
        time: 'Hier',
      },
    ],
  },
]

export const paymentMethodsSeed = [
  { id: 'PM-1', type: 'Mobile Money', label: 'MTN - **** 1221', isDefault: true },
  { id: 'PM-2', type: 'Carte', label: 'VISA - **** 4508', isDefault: false },
]

export const invoicesSeed = [
  { id: 'INV-2026-041', reservationId: 'RSV-1019', date: '2026-03-12', amount: 50000, status: 'paid' },
  { id: 'INV-2026-038', reservationId: 'RSV-1011', date: '2026-03-01', amount: 36000, status: 'paid' },
  { id: 'INV-2026-022', reservationId: 'RSV-999', date: '2026-02-18', amount: 105000, status: 'refunded' },
]
