'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { ArrowDownIcon, ArrowUpIcon, ArrowUpDownIcon } from 'lucide-react'
import { formatTournamentDateWithOrdinals } from '@/utils/tournament'
import {
  CustomTable,
  CustomTableHeader,
  CustomTableBody,
  CustomTableRow,
  CustomTableHead,
  CustomTableCell
} from '@/components/ui/custom-table'
import { cn } from '@/lib/utils'
import type { TournamentWithStats } from '@/lib/tournament-data'

type SortField = 'name' | 'dates' | 'location' | 'players' | 'rounds' | 'avgTop10TPR' | 'avgTop24Rating'

interface TournamentTableProps {
  tournaments: TournamentWithStats[]
}

export function TournamentTable({ tournaments }: TournamentTableProps) {
  const [sortField, setSortField] = useState<SortField>('dates')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

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

  const sortedTournaments = [...tournaments].sort((a, b) => {
    let aValue: string | number, bValue: string | number

    switch (sortField) {
      case 'name':
        aValue = a.short_name || a.name
        bValue = b.short_name || b.name
        break
      case 'dates':
        aValue = new Date(a.start_date || '').getTime()
        bValue = new Date(b.start_date || '').getTime()
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
        aValue = a.avgTop10TPR
        bValue = b.avgTop10TPR
        break
      case 'avgTop24Rating':
        aValue = a.avgTop24Rating
        bValue = b.avgTop24Rating
        break
    }

    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : aValue < bValue ? -1 : 0
    } else {
      return aValue < bValue ? 1 : aValue > bValue ? -1 : 0
    }
  })

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDownIcon className="h-4 w-4" />
    }
    return sortDirection === 'asc' ? <ArrowUpIcon className="h-4 w-4" /> : <ArrowDownIcon className="h-4 w-4" />
  }

  return (
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
            <CustomTableHead
              className="cursor-pointer select-none text-right hidden sm:table-cell"
              onClick={() => handleSort('avgTop10TPR')}>
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
          {sortedTournaments.map((tournament, index) => {
            const location = getLocation(tournament.name)
            const rounds = tournament.rounds || 6
            const dates = formatTournamentDateWithOrdinals(tournament?.start_date, tournament?.end_date)

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
                <CustomTableCell className="text-right tabular-nums hidden sm:table-cell">
                  {tournament.avgTop10TPR || '-'}
                </CustomTableCell>
                <CustomTableCell className="text-right tabular-nums hidden xl:table-cell">
                  {tournament.avgTop24Rating || '-'}
                </CustomTableCell>
              </CustomTableRow>
            )
          })}
        </CustomTableBody>
      </CustomTable>
    </Card>
  )
}