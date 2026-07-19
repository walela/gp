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
    id: 'minichess-gp-2026',
    name: 'Minichess Kenya Grand Prix',
    short_name: 'Minichess GP',
    startDate: '2026-08-29',
    endDate: '2026-08-30',
    location: 'KICC, Nairobi',
    locationUrl: 'https://maps.google.com/?q=KICC,+Nairobi,+Kenya',
    confirmed: false,
    detailsUrl: null
  }
]

// Grand Prix tournaments beyond the 60-day window
export const plannedTournaments: Tournament[] = [
  {
    id: 'jumuiya-2026',
    name: 'Jumuiya Ya Afrika Mashariki Open - Grand Prix',
    short_name: 'Jumuiya Open',
    startDate: '2026-09-19',
    endDate: '2026-09-20',
    location: 'TBA',
    confirmed: false,
    detailsUrl: null
  },
  {
    id: 'mombasa-open-2026',
    name: 'Mombasa Open - Grand Prix',
    short_name: 'Mombasa Open',
    startDate: '2026-10-09',
    endDate: '2026-10-11',
    location: 'TBA',
    confirmed: true,
    detailsUrl: null
  },
  {
    id: 'kajiado-open-2026',
    name: 'Kajiado Open - Grand Prix',
    short_name: 'Kajiado Open',
    startDate: '2026-10-24',
    endDate: '2026-10-25',
    location: 'Kajiado',
    confirmed: false,
    detailsUrl: null
  },
  {
    id: 'ctc-classical-2026',
    name: 'CTC Classical - Grand Prix',
    short_name: 'CTC Classical',
    startDate: '2026-11-21',
    endDate: '2026-11-22',
    location: 'Nairobi',
    confirmed: false,
    detailsUrl: null
  },
  {
    id: 'nairobi-county-open-2026',
    name: 'Nairobi County Open - Grand Prix',
    short_name: 'Nairobi County Open',
    startDate: '2026-12-12',
    endDate: '2026-12-14',
    location: 'Nairobi',
    locationUrl: 'https://maps.google.com/?q=Nairobi,+Kenya',
    confirmed: true,
    detailsUrl: null
  },
  {
    id: 'grandmasters-open-2026',
    name: 'Grandmasters Open - Grand Prix',
    short_name: 'Grandmasters Open',
    month: 'October 2026',
    location: 'Kakamega',
    confirmed: false,
    detailsUrl: null
  },
  {
    id: 'kenya-open-2026',
    name: 'KCB Kenya Open - Grand Prix',
    short_name: 'KCB Kenya Open',
    startDate: '2026-10-17',
    endDate: '2026-10-20',
    location: 'TBA',
    confirmed: true,
    detailsUrl: null
  }
]
