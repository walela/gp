export type TournamentStatus = 'Upcoming' | 'Completed' | 'postponed' | 'Ongoing'

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
  locationUrl?: string
}

// Tournaments happening within roughly the next two months
export const upcomingTournaments: Tournament[] = [
]

// Grand Prix tournaments beyond the 60-day window
export const plannedTournaments: Tournament[] = [
  {
    id: 'kisii-open-2026',
    name: 'Kisii Open Chess Championship - Grand Prix',
    short_name: 'Kisii Open',
    startDate: '2026-10-23',
    endDate: '2026-10-25',
    location: 'Kisii ATC',
    locationUrl: 'https://maps.google.com/?q=Kisii+ATC,+Kisii,+Kenya',
    rounds: 8,
    confirmed: true,
    registrationDeadline: '2026-10-15',
    registrationUrl: 'https://forms.gle/iS6Pn7Yk5DSubxMy7',
    detailsUrl: null
  },
  {
    id: 'ctc-classical-2026',
    name: 'CTC Open - Grand Prix',
    short_name: 'CTC Open',
    startDate: '2026-11-21',
    endDate: '2026-11-22',
    location: 'Nairobi',
    locationUrl: 'https://maps.google.com/?q=Nairobi,+Kenya',
    rounds: 6,
    confirmed: true,
    detailsUrl: null
  },
  {
    id: 'karen-open-2026',
    name: 'Karen Open Grand Prix Tournament',
    short_name: 'Karen Open',
    startDate: '2026-11-28',
    endDate: '2026-11-29',
    location: 'Karen',
    locationUrl: 'https://maps.google.com/?q=Karen,+Nairobi,+Kenya',
    rounds: 6,
    confirmed: true,
    registrationDeadline: '2026-11-25',
    registrationUrl: 'https://forms.gle/2RVP6B1z75MVtpqe9',
    detailsUrl: null
  }
]
