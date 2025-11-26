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
export const upcomingTournaments: Tournament[] = []

// No additional Grand Prix tournaments currently outside the 60-day window
export const plannedTournaments: Tournament[] = []
