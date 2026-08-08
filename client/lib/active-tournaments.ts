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
    name: 'Minichess Open Chess Championship - Grand Prix Circuit',
    short_name: 'Minichess GP',
    startDate: '2026-08-29',
    endDate: '2026-08-30',
    location: 'KICC, Nairobi',
    locationUrl: 'https://maps.google.com/?q=KICC,+Nairobi,+Kenya',
    confirmed: true,
    registrationUrl: 'https://forms.gle/8Kd598aSVEnKQE1b9',
    detailsUrl: null
  }
]

// Grand Prix tournaments beyond the 60-day window
export const plannedTournaments: Tournament[] = [
  {
    id: 'mao-open-2026',
    name: 'The MAO Open - Grand Prix Circuit',
    short_name: 'MAO Open',
    startDate: '2026-09-05',
    endDate: '2026-09-06',
    location: 'TBA',
    confirmed: true,
    detailsUrl: null
  },
  {
    id: 'jumuiya-2026',
    name: 'Jumuiya Ya Afrika Mashariki Open - Grand Prix',
    short_name: 'Jumuiya Open',
    startDate: '2026-09-19',
    endDate: '2026-09-20',
    location: 'SABIS International School, Runda',
    confirmed: true,
    registrationUrl: 'https://forms.gle/pTNQTupnMBVUSENH7-',
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
    confirmed: true,
    detailsUrl: null
  },
  {
    id: 'ctc-classical-2026',
    name: 'CTC Open - Grand Prix',
    short_name: 'CTC Open',
    startDate: '2026-11-21',
    endDate: '2026-11-22',
    location: 'Nairobi',
    confirmed: true,
    detailsUrl: null
  },
  {
    id: 'nairobi-county-open-2026',
    name: 'Nairobi County Open - Grand Prix',
    short_name: 'Nairobi County Open',
    startDate: '2026-09-26',
    endDate: '2026-09-27',
    location: 'Nairobi',
    locationUrl: 'https://maps.google.com/?q=Nairobi,+Kenya',
    confirmed: true,
    registrationUrl: 'https://ncca.or.ke/Events/register/13',
    detailsUrl: null
  },
  {
    id: 'kisii-open-2026',
    name: 'Kisii Open - Grand Prix',
    short_name: 'Kisii Open',
    startDate: '2026-09-11',
    endDate: '2026-09-13',
    location: 'Kisii',
    confirmed: true,
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
