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
  {
    id: 'karen-open-2026',
    name: 'Karen Open Grand Prix Tournament',
    short_name: 'Karen Open',
    startDate: '2026-11-28',
    endDate: '2026-11-29',
    location: 'The Co-operative University of Kenya, Karen',
    locationUrl: 'https://maps.google.com/?q=The+Co-operative+University+of+Kenya,+Karen,+Nairobi',
    rounds: 6,
    confirmed: true,
    registrationDeadline: '2026-11-25',
    registrationUrl: 'https://forms.gle/2RVP6B1z75MVtpqe9',
    detailsUrl: 'https://chess-results.com/tnr1544731.aspx?lan=1'
  }
]

// Grand Prix tournaments beyond the 60-day window
export const plannedTournaments: Tournament[] = []
