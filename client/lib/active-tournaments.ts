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
    id: 'mombasa-open-2026',
    name: 'Mombasa Open - Grand Prix',
    short_name: 'Mombasa Open',
    startDate: '2026-10-09',
    endDate: '2026-10-11',
    location: 'TBA',
    confirmed: true,
    registrationUrl: 'https://mchessacademy.co.ke/tournaments',
    detailsUrl: null
  },
  {
    id: 'kisii-open-2026',
    name: 'Kisii Open Chess Championship - Grand Prix',
    short_name: 'Kisii Open',
    startDate: '2026-10-23',
    endDate: '2026-10-25',
    location: 'Kisii',
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
    id: 'kenya-open-2026',
    name: 'KCB Kenya Open - Grand Prix',
    short_name: 'KCB Kenya Open',
    startDate: '2026-10-17',
    endDate: '2026-10-20',
    location: 'TBA',
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
    confirmed: true,
    detailsUrl: null
  }
]
