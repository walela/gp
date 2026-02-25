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
}

// Tournaments happening within roughly the next two months
export const upcomingTournaments: Tournament[] = [
  {
    id: 'kisumu-open-2026',
    name: '2nd Edition Kisumu Open Chess Championship - Grand Prix',
    short_name: 'Kisumu Open',
    startDate: '2026-03-07',
    endDate: '2026-03-08',
    location: 'Kisumu Social Hall',
    rounds: 6,
    confirmed: true,
    registrationUrl: 'https://forms.gle/gqHvBQ1ohFJ5jnEM7',
    detailsUrl: null
  },
  {
    id: 'mavens-2026',
    name: 'Mavens International Open 2026 - Grand Prix',
    short_name: 'Mavens Open',
    startDate: '2026-03-20',
    endDate: '2026-03-22',
    location: 'ALX The Piano, Westlands',
    rounds: 8,
    confirmed: true,
    registrationUrl: 'https://mavens.co.ke/event/register/16',
    detailsUrl: null
  },
  {
    id: 'kenya-open-2026',
    name: 'Kenya Open International - Grand Prix',
    short_name: 'Kenya Open',
    startDate: '2026-04-03',
    endDate: '2026-04-06',
    location: 'TBA',
    rounds: 8,
    confirmed: true,
    detailsUrl: null
  },
  {
    id: 'sataranji-2026',
    name: 'Sataranji Africa Chess Festival - Grand Prix',
    short_name: 'Sataranji Africa Chess Festival',
    startDate: '2026-04-18',
    endDate: '2026-04-19',
    location: 'TBA',
    rounds: 6,
    confirmed: true,
    detailsUrl: null
  }
]

// Grand Prix tournaments beyond the 60-day window
export const plannedTournaments: Tournament[] = [
  {
    id: 'kericho-open-2026',
    name: 'Kericho Open International Chess Championship - Grand Prix',
    short_name: 'Kericho Open',
    startDate: '2026-05-01',
    endDate: '2026-05-03',
    location: 'Kericho',
    confirmed: true,
    detailsUrl: null
  },
  {
    id: 'east-africa-open-2026',
    name: 'East Africa Open 2nd Edition - Grand Prix',
    short_name: 'East Africa Open',
    startDate: '2026-05-01',
    endDate: '2026-05-03',
    location: 'Nakuru',
    confirmed: true,
    detailsUrl: null
  },
  {
    id: 'kiambu-open-2026',
    name: 'Kiambu Open - Grand Prix',
    short_name: 'Kiambu Open',
    startDate: '2026-05-09',
    endDate: '2026-05-10',
    location: 'Rainbow Ruiru Resort',
    confirmed: true,
    detailsUrl: null
  },
  {
    id: 'kakamega-open-2026',
    name: 'Kakamega Open - Grand Prix',
    short_name: 'Kakamega Open',
    startDate: '2026-05-09',
    endDate: '2026-05-10',
    location: 'Kakamega',
    confirmed: true,
    detailsUrl: null
  },
  {
    id: 'nakuru-open-2026',
    name: 'Nakuru Open - Grand Prix',
    short_name: 'Nakuru Open',
    startDate: '2026-05-30',
    endDate: '2026-05-31',
    location: 'Nakuru',
    confirmed: true,
    detailsUrl: null
  },
  {
    id: 'nairobi-open-2026',
    name: 'Nairobi Open - Grand Prix',
    short_name: 'Nairobi Open',
    startDate: '2026-05-30',
    endDate: '2026-06-01',
    location: 'Nairobi',
    confirmed: true,
    detailsUrl: null
  },
  {
    id: 'quo-vadis-2026',
    name: 'Quo Vadis Nyeri Chess Open - Grand Prix',
    short_name: 'Quo Vadis Nyeri Open',
    startDate: '2026-06-05',
    endDate: '2026-06-07',
    location: 'Quo Vadis Hub, Nyeri',
    confirmed: true,
    detailsUrl: null
  },
  {
    id: 'siaya-open-2026',
    name: 'Siaya Open - Grand Prix',
    short_name: 'Siaya Open',
    startDate: '2026-06-25',
    endDate: '2026-06-27',
    location: 'Pride Hotel, Bondo',
    confirmed: true,
    detailsUrl: null
  },
  {
    id: 'lighthouse-open-2026',
    name: 'Lighthouse Open - Grand Prix',
    short_name: 'Lighthouse Open',
    startDate: '2026-07-03',
    endDate: '2026-07-05',
    location: 'Mombasa',
    confirmed: true,
    detailsUrl: null
  },
  {
    id: 'mombasa-festival-2026',
    name: 'Mombasa International Chess Festival - Grand Prix',
    short_name: 'Mombasa Chess Festival',
    startDate: '2026-07-19',
    endDate: '2026-07-19',
    location: 'City Mall, Mombasa',
    confirmed: true,
    detailsUrl: null
  },
  {
    id: 'kitale-open-2026',
    name: 'Kitale Open - Grand Prix',
    short_name: 'Kitale Open',
    startDate: '2026-07-24',
    endDate: '2026-07-25',
    location: 'Kitale',
    confirmed: true,
    detailsUrl: null
  },
  {
    id: 'minichess-gp-2026',
    name: 'Minichess Kenya Grand Prix',
    short_name: 'Minichess GP',
    startDate: '2026-08-29',
    endDate: '2026-08-30',
    location: 'KICC, Nairobi',
    confirmed: true,
    detailsUrl: null
  },
  {
    id: 'jumuiya-2026',
    name: 'Jumuiya Ya Afrika Mashariki Open - Grand Prix',
    short_name: 'Jumuiya Open',
    startDate: '2026-09-19',
    endDate: '2026-09-20',
    location: 'TBA',
    confirmed: true,
    detailsUrl: null
  },
  {
    id: 'mombasa-open-2026',
    name: 'Mombasa Open - Grand Prix',
    short_name: 'Mombasa Open',
    startDate: '2026-10-09',
    endDate: '2026-10-11',
    location: 'Light Academy, Mombasa',
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
    name: 'CTC Classical - Grand Prix',
    short_name: 'CTC Classical',
    startDate: '2026-11-21',
    endDate: '2026-11-22',
    location: 'Nairobi',
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
    id: 'coast-open-2026',
    name: 'Coast Open 2026 - Grand Prix',
    short_name: 'Coast Open',
    month: 'TBA',
    location: 'TBA',
    confirmed: false,
    detailsUrl: null
  }
]
