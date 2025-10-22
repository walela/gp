export type TournamentStatus = 'Upcoming' | 'Completed' | 'postponed'

export interface Tournament {
  id: string
  name: string
  startDate?: string
  endDate?: string
  location: string
  rounds?: number
  confirmed: boolean
  status?: TournamentStatus
  short_name?: string
  tentativeRounds?: number
  month?: string
  registrationDeadline?: string
  registrationUrl?: string
  detailsUrl?: string | null
}

// Tournaments happening within roughly the next two months
export const upcomingTournaments: Tournament[] = [
  {
    id: '742163',
    name: 'Bungoma Open Chess Championship 2025',
    short_name: 'Bungoma Open',
    startDate: '2025-11-01',
    endDate: '2025-11-02',
    location: 'Bungoma',
    rounds: 6,
    confirmed: true,
    status: 'Upcoming',
    registrationDeadline: '2025-10-30',
    registrationUrl: 'https://forms.gle/odf5bn2j4rXfC9T68',
    detailsUrl: 'https://s2.chess-results.com/tnr1277313.aspx?lan=1&SNode=S0'
  },
  {
    id: 'nakuru-open-2025',
    name: 'Nakuru Open Chess Championship 2025',
    short_name: 'Nakuru Open',
    startDate: '2025-11-15',
    endDate: '2025-11-16',
    location: 'Nakuru',
    rounds: 6,
    confirmed: true,
    status: 'Upcoming',
    registrationDeadline: '2025-11-13',
    registrationUrl: 'https://forms.gle/vEzV2p5nx6rkyeNn7',
    detailsUrl: null
  },
  {
    id: '742164',
    name: 'Chess Through Challenges',
    startDate: '2025-11-20',
    endDate: '2025-11-23',
    location: 'Nairobi',
    rounds: 8,
    confirmed: true,
    status: 'Upcoming',
    detailsUrl: '/tournament/742164'
  }
]

// No additional Grand Prix tournaments currently outside the 60-day window
export const plannedTournaments: Tournament[] = []
