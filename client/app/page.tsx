'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CalendarDays, MapPin, Hash, Calendar, ArrowDownIcon, ArrowUpIcon, ArrowUpDownIcon } from 'lucide-react'
import { getTournaments, getTournamentAllResults } from '@/services/api'
import { formatTournamentDateWithOrdinals } from '@/utils/tournament'
import { Countdown } from '@/components/ui/countdown'
import {
  CustomTable,
  CustomTableHeader,
  CustomTableBody,
  CustomTableRow,
  CustomTableHead,
  CustomTableCell
} from '@/components/ui/custom-table'
import { cn } from '@/lib/utils'

type TournamentStatus = 'Upcoming' | 'Completed' | 'postponed'

export default function HomePage() {
  const [tournaments, setTournaments] = useState([])
  const [loading, setLoading] = useState(true)
  const [sortField, setSortField] = useState<SortField>('dates')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [tournamentStats, setTournamentStats] = useState<Record<string, { avgTop10TPR: number; avgTop24Rating: number }>>({})

  useEffect(() => {
    async function fetchData() {
      const data = await getTournaments()
      setTournaments(data)

      // Fetch detailed results for each tournament to compute averages
      const stats: Record<string, { avgTop10TPR: number; avgTop24Rating: number }> = {}

      await Promise.all(
        data.map(async tournament => {
          try {
            const results = await getTournamentAllResults(tournament.id)

            // Calculate average top 10 TPR
            const top10TPRs = results
              .filter(r => r.tpr !== null)
              .sort((a, b) => (b.tpr || 0) - (a.tpr || 0))
              .slice(0, 10)
              .map(r => r.tpr || 0)

            const avgTop10TPR =
              top10TPRs.length > 0 ? Math.round(top10TPRs.reduce((sum, tpr) => sum + tpr, 0) / top10TPRs.length) : 0

            // Calculate average top 24 rating
            const top24Ratings = results
              .filter(r => r.rating !== null)
              .sort((a, b) => (b.rating || 0) - (a.rating || 0))
              .slice(0, 24)
              .map(r => r.rating || 0)

            const avgTop24Rating =
              top24Ratings.length > 0
                ? Math.round(top24Ratings.reduce((sum, rating) => sum + rating, 0) / top24Ratings.length)
                : 0

            stats[tournament.id] = { avgTop10TPR, avgTop24Rating }
          } catch (error) {
            console.error(`Failed to fetch results for tournament ${tournament.id}:`, error)
            stats[tournament.id] = { avgTop10TPR: 0, avgTop24Rating: 0 }
          }
        })
      )

      setTournamentStats(stats)
      setLoading(false)
    }

    fetchData()
  }, [])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  type SortField = 'name' | 'dates' | 'location' | 'players' | 'rounds' | 'avgTop10TPR' | 'avgTop24Rating'
  type Tournament = {
    id: string
    name: string
    short_name?: string
    start_date: string
    location: string
    results: number
    rounds?: number
    avgTop10TPR?: number
    avgTop24Rating?: number
  }

  const sortedTournaments = [...tournaments].sort((a: Tournament, b: Tournament) => {
    let aValue: string | number, bValue: string | number

    switch (sortField) {
      case 'name':
        aValue = a.short_name || a.name
        bValue = b.short_name || b.name
        break
      case 'dates':
        aValue = new Date(a.start_date).getTime()
        bValue = new Date(b.start_date).getTime()
        break
      case 'location':
        aValue = getLocation(a.name)
        bValue = getLocation(b.name)
        break
      case 'players':
        aValue = a.results
        bValue = b.results
        break
      case 'rounds':
        aValue = a.rounds || 6
        bValue = b.rounds || 6
        break
      case 'avgTop10TPR':
        aValue = tournamentStats[a.id]?.avgTop10TPR || 0
        bValue = tournamentStats[b.id]?.avgTop10TPR || 0
        break
      case 'avgTop24Rating':
        aValue = tournamentStats[a.id]?.avgTop24Rating || 0
        bValue = tournamentStats[b.id]?.avgTop24Rating || 0
        break
    }

    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : aValue < bValue ? -1 : 0
    } else {
      return aValue < bValue ? 1 : aValue > bValue ? -1 : 0
    }
  })

  function getLocation(tournamentName: string) {
    const normalizedName = tournamentName.trim().toUpperCase()
    if (normalizedName.includes('ELDORET')) return 'Eldoret'
    if (normalizedName.includes('KISUMU')) return 'Kisumu'
    if (normalizedName.includes('WARIDI')) return 'Nairobi'
    if (normalizedName.includes('MAVENS')) return 'Nairobi'
    if (normalizedName.includes('NAKURU')) return 'Nakuru'
    if (normalizedName.includes('QUO VADIS')) return 'Nyeri'
    if (normalizedName.includes('KIAMBU')) return 'Kiambu'
    if (normalizedName.includes('KITALE')) return 'Kitale'
    if (normalizedName.includes('MOMBASA')) return 'Mombasa'
    return 'Nairobi'
  }

  const upcomingTournaments: Array<{
    id: string
    name: string
    startDate: string
    endDate: string
    location: string
    rounds: number
    confirmed: boolean
    status: TournamentStatus
  }> = [
    {
      id: '742161',
      name: '3rd Jumuiya Open',
      startDate: '2025-09-20',
      endDate: '2025-09-21',
      location: 'Nairobi',
      rounds: 6,
      confirmed: true,
      status: 'Upcoming' satisfies TournamentStatus
    }
  ]

  const plannedTournaments = [
    {
      id: '742162',
      name: 'Mombasa Open 2025',
      startDate: '2025-10-10',
      endDate: '2025-10-12',
      location: 'Mombasa',
      rounds: 6,
      confirmed: true
    },
    {
      id: '742165',
      name: 'Kenya Open 2025',
      startDate: '2025-10-18',
      endDate: '2025-10-20',
      location: 'Nairobi',
      rounds: 8,
      confirmed: true
    },
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

  // Find the next upcoming tournament for countdown
  const nextTournament = upcomingTournaments
    .filter(t => t.status !== 'postponed')
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())[0]

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDownIcon className="h-4 w-4" />
    }
    return sortDirection === 'asc' ? <ArrowUpIcon className="h-4 w-4" /> : <ArrowDownIcon className="h-4 w-4" />
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-4 space-y-8 max-w-11xl">
        <div className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-3xl font-bold tracking-tight text-gray-700">Completed Tournaments</h2>
            <p className="text-pretty text-gray-600 text-sm tracking-wide leading-tighter">
              Tournament results with performance statistics
            </p>
          </div>

          <Card className="rounded-lg border-0 shadow-sm overflow-hidden bg-white/90 backdrop-blur-sm p-0">
            <CustomTable className="h-full">
              <CustomTableHeader>
                <CustomTableRow>
                  <CustomTableHead className="cursor-pointer select-none min-w-[200px]" onClick={() => handleSort('name')}>
                    <div className="flex items-center gap-1">
                      <span>Tournament</span>
                      <span className="text-muted-foreground">
                        <SortIcon field="name" />
                      </span>
                    </div>
                  </CustomTableHead>
                  <CustomTableHead
                    className="cursor-pointer select-none min-w-[140px] hidden sm:table-cell"
                    onClick={() => handleSort('dates')}>
                    <div className="flex items-center gap-1">
                      <span>Dates</span>
                      <span className="text-muted-foreground">
                        <SortIcon field="dates" />
                      </span>
                    </div>
                  </CustomTableHead>
                  <CustomTableHead
                    className="cursor-pointer select-none hidden md:table-cell"
                    onClick={() => handleSort('location')}>
                    <div className="flex items-center gap-1">
                      <span>Location</span>
                      <span className="text-muted-foreground">
                        <SortIcon field="location" />
                      </span>
                    </div>
                  </CustomTableHead>
                  <CustomTableHead className="cursor-pointer select-none text-right" onClick={() => handleSort('players')}>
                    <div className="flex items-center gap-1 justify-end">
                      <span className="hidden sm:inline">Valid TPRs</span>
                      <span className="sm:hidden">TPRs</span>
                      <span className="text-muted-foreground">
                        <SortIcon field="players" />
                      </span>
                    </div>
                  </CustomTableHead>
                  <CustomTableHead
                    className="cursor-pointer select-none text-right hidden lg:table-cell"
                    onClick={() => handleSort('rounds')}>
                    <div className="flex items-center gap-1 justify-end">
                      <span>Rounds</span>
                      <span className="text-muted-foreground">
                        <SortIcon field="rounds" />
                      </span>
                    </div>
                  </CustomTableHead>
                  <CustomTableHead className="cursor-pointer select-none text-right hidden sm:table-cell" onClick={() => handleSort('avgTop10TPR')}>
                    <div className="flex items-center gap-1 justify-end">
                      <span className="hidden lg:inline">Avg Top 10 TPR</span>
                      <span className="lg:hidden">Avg TPR</span>
                      <span className="text-muted-foreground">
                        <SortIcon field="avgTop10TPR" />
                      </span>
                    </div>
                  </CustomTableHead>
                  <CustomTableHead
                    className="cursor-pointer select-none text-right hidden xl:table-cell"
                    onClick={() => handleSort('avgTop24Rating')}>
                    <div className="flex items-center gap-1 justify-end">
                      <span>Avg Top 24 Rating</span>
                      <span className="text-muted-foreground">
                        <SortIcon field="avgTop24Rating" />
                      </span>
                    </div>
                  </CustomTableHead>
                </CustomTableRow>
              </CustomTableHeader>
              <CustomTableBody>
                {loading ? (
                  <CustomTableRow>
                    <CustomTableCell colSpan={7} className="text-center py-12">
                      Loading tournaments...
                    </CustomTableCell>
                  </CustomTableRow>
                ) : (
                  sortedTournaments.map((tournament, index) => {
                    const location = getLocation(tournament.name)
                    const rounds = tournament.rounds || 6
                    const dates = formatTournamentDateWithOrdinals(tournament?.start_date, tournament?.end_date)
                    const stats = tournamentStats[tournament.id] || { avgTop10TPR: 0, avgTop24Rating: 0 }

                    return (
                      <CustomTableRow
                        key={tournament.id}
                        className={cn(index % 2 === 0 ? 'bg-gray-50/50 hover:bg-gray-100/50' : 'bg-white hover:bg-gray-50/50')}>
                        <CustomTableCell className="whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            <Link
                              href={`/tournament/${tournament.id}`}
                              className="text-blue-600 hover:text-blue-700 hover:underline underline-offset-4 font-medium">
                              {tournament.short_name || tournament.name}
                            </Link>
                            <div className="text-xs text-gray-500 sm:hidden space-x-2">
                              <span>{dates}</span>
                              <span className="lg:hidden">•</span>
                              <span className="lg:hidden">{rounds} rounds</span>
                            </div>
                          </div>
                        </CustomTableCell>
                        <CustomTableCell className="whitespace-nowrap hidden sm:table-cell">{dates}</CustomTableCell>
                        <CustomTableCell className="hidden md:table-cell">{location}</CustomTableCell>
                        <CustomTableCell className="text-right tabular-nums">{tournament.results}</CustomTableCell>
                        <CustomTableCell className="text-right tabular-nums hidden lg:table-cell">{rounds}</CustomTableCell>
                        <CustomTableCell className="text-right tabular-nums hidden sm:table-cell">{stats.avgTop10TPR || '-'}</CustomTableCell>
                        <CustomTableCell className="text-right tabular-nums hidden xl:table-cell">
                          {stats.avgTop24Rating || '-'}
                        </CustomTableCell>
                      </CustomTableRow>
                    )
                  })
                )}
              </CustomTableBody>
            </CustomTable>
          </Card>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold tracking-tight text-gray-700">Upcoming Tournaments</h2>
          </div>
          <div className="text-pretty text-gray-600 mb-4 text-sm tracking-wide leading-tighter">
            Tournaments within the next 60 days.
          </div>

          <div className="flex flex-wrap gap-4">
            {upcomingTournaments.map(tournament => {
              const weeksAway = Math.round(
                (new Date(tournament.startDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 7)
              )

              return (
                <div key={tournament.id} className="w-full sm:w-[calc(50%-12px)] md:w-[calc(33.333%-16px)]">
                  <Card
                    className={`h-full rounded-lg ${tournament.status === 'postponed' ? 'opacity-75' : ''} relative overflow-hidden py-2 gap-4`}>
                    {tournament.status !== 'postponed' && (
                      <div className="px-4">
                        <span className="inline-block text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          {weeksAway === 0 ? 'This week' : weeksAway === 1 ? 'Next week' : `${weeksAway} weeks away`}
                        </span>
                      </div>
                    )}
                    <CardHeader className="pb-1 px-4">
                      <div className="flex items-center justify-between">
                        <CardTitle>
                          <Link
                            href={`/tournament/${tournament.id}`}
                            className={
                              tournament.status === 'postponed' ? 'line-through text-gray-500 hover:underline' : 'hover:underline'
                            }>
                            {tournament.short_name || tournament.name}
                          </Link>
                        </CardTitle>
                        {tournament.status === 'postponed' ? (
                          <Badge className="bg-gray-200 text-gray-600 hover:bg-gray-200 whitespace-nowrap">Postponed</Badge>
                        ) : (
                          <Badge
                            className={
                              tournament.confirmed
                                ? 'bg-green-100 text-green-700 hover:bg-green-100'
                                : 'bg-blue-100 text-blue-700 hover:bg-blue-100'
                            }>
                            {tournament.confirmed ? 'Confirmed' : 'Upcoming'}
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <CalendarDays className="h-4 w-4" />
                        <span>
                          {new Date(tournament.startDate)
                            .toLocaleDateString('en-US', {
                              month: 'long',
                              day: 'numeric'
                            })
                            .replace(/(\d+)/, match => {
                              const num = parseInt(match)
                              if (num >= 11 && num <= 13) return num + 'th'
                              switch (num % 10) {
                                case 1:
                                  return num + 'st'
                                case 2:
                                  return num + 'nd'
                                case 3:
                                  return num + 'rd'
                                default:
                                  return num + 'th'
                              }
                            })}{' '}
                          -{' '}
                          {new Date(tournament.endDate)
                            .toLocaleDateString('en-US', {
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric'
                            })
                            .replace(/(\d+)/, match => {
                              const num = parseInt(match)
                              if (num >= 11 && num <= 13) return num + 'th'
                              switch (num % 10) {
                                case 1:
                                  return num + 'st'
                                case 2:
                                  return num + 'nd'
                                case 3:
                                  return num + 'rd'
                                default:
                                  return num + 'th'
                              }
                            })}
                        </span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="px-4 pt-0 pb-2 flex flex-col gap-2 text-sm">
                      <div className="flex justify-between">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{tournament.location}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{tournament.rounds} rounds</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )
            })}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold tracking-tight text-gray-700">Planned Tournaments</h2>
          <p className="text-pretty text-gray-600 mb-4 text-sm tracking-wide leading-tighter">
            Future tournaments with confirmed or tentative dates and details
          </p>

          <div className="flex flex-wrap gap-4">
            {plannedTournaments.map(tournament => {
              const weeksAway =
                'startDate' in tournament && tournament.startDate
                  ? Math.round((new Date(tournament.startDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 7))
                  : null

              return (
                <div key={tournament.id} className="w-full sm:w-[calc(50%-12px)] md:w-[calc(33.333%-16px)]">
                  <Card className="h-full rounded-lg relative overflow-hidden gap-4 py-2">
                    {weeksAway !== null && (
                      <div className="px-4">
                        <span className="inline-block text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          {weeksAway === 0 ? 'This week' : weeksAway === 1 ? 'Next week' : `${weeksAway} weeks away`}
                        </span>
                      </div>
                    )}
                    <CardHeader className="px-4">
                      <div className="flex items-center justify-between">
                        <CardTitle>
                          {'startDate' in tournament ? (
                            <Link href={`/tournament/${tournament.id}`} className="hover:underline">
                              {tournament.short_name || tournament.name}
                            </Link>
                          ) : (
                            tournament.short_name || tournament.name
                          )}
                        </CardTitle>
                        <Badge
                          className={
                            tournament.confirmed
                              ? 'bg-green-100 text-green-700 hover:bg-green-100'
                              : 'bg-purple-100 text-purple-700 hover:bg-purple-100'
                          }>
                          {tournament.confirmed ? 'Confirmed' : 'Planned'}
                        </Badge>
                      </div>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {'startDate' in tournament && tournament.startDate && tournament.endDate ? (
                            <>
                              {new Date(tournament.startDate)
                                .toLocaleDateString('en-US', {
                                  month: 'long',
                                  day: 'numeric'
                                })
                                .replace(/(\d+)/, match => {
                                  const num = parseInt(match)
                                  if (num >= 11 && num <= 13) return num + 'th'
                                  switch (num % 10) {
                                    case 1:
                                      return num + 'st'
                                    case 2:
                                      return num + 'nd'
                                    case 3:
                                      return num + 'rd'
                                    default:
                                      return num + 'th'
                                  }
                                })}{' '}
                              -{' '}
                              {new Date(tournament.endDate)
                                .toLocaleDateString('en-US', {
                                  month: 'long',
                                  day: 'numeric',
                                  year: 'numeric'
                                })
                                .replace(/(\d+)/, match => {
                                  const num = parseInt(match)
                                  if (num >= 11 && num <= 13) return num + 'th'
                                  switch (num % 10) {
                                    case 1:
                                      return num + 'st'
                                    case 2:
                                      return num + 'nd'
                                    case 3:
                                      return num + 'rd'
                                    default:
                                      return num + 'th'
                                  }
                                })}
                            </>
                          ) : (
                            `${'month' in tournament ? tournament.month : ''} 2025`
                          )}
                        </span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="px-4 pt-0 pb-2 flex flex-col gap-2 text-sm">
                      <div className="flex justify-between">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{tournament.location}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>
                            {'rounds' in tournament ? `${tournament.rounds} rounds` : `~${tournament.tentativeRounds} rounds`}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
