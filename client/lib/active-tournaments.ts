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
}

// Tournaments happening within roughly the next two months
export const upcomingTournaments: Tournament[] = [
  {
    id: '742165',
    name: 'Kenya Open 2025',
    startDate: '2025-10-18',
    endDate: '2025-10-20',
    location: 'Nairobi',
    rounds: 8,
    confirmed: true,
    status: 'Upcoming'
  }
]

// Grand-Prix events that have dates or at least confirmed months but are further out in the calendar
export const plannedTournaments: Tournament[] = [
  {
    id: '742163',
    name: 'Bungoma Open 2025',
    startDate: '2025-11-01',
    endDate: '2025-11-02',
    location: 'Bungoma',
    rounds: 6,
    confirmed: true
  },
  {
    id: '742164',
    name: 'Chess Through Challenges',
    startDate: '2025-11-20',
    endDate: '2025-11-23',
    location: 'Nairobi',
    rounds: 6,
    confirmed: true
  }
]
