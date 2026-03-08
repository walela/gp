'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { ArrowDownIcon, ArrowUpIcon, ArrowUpDownIcon } from 'lucide-react'
import { formatTournamentDateWithOrdinals, inferTournamentLocation } from '@/utils/tournament'
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
        aValue = (a.location || inferTournamentLocation(a.name)).toLowerCase()
        bValue = (b.location || inferTournamentLocation(b.name)).toLowerCase()
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

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDownIcon className="h-4 w-4" aria-hidden="true" />
    }
    return sortDirection === 'asc' ? <ArrowUpIcon className="h-4 w-4" aria-hidden="true" /> : <ArrowDownIcon className="h-4 w-4" aria-hidden="true" />
  }

  return (
    <Card className="rounded-lg border-0 shadow-elevation-low overflow-hidden bg-white/90 backdrop-blur-sm p-0">
      <CustomTable className="h-full">
        <CustomTableHeader>
          <CustomTableRow>
            <CustomTableHead className="cursor-pointer select-none min-w-[200px]" onClick={() => handleSort('name')} onKeyDown={e => e.key === 'Enter' && handleSort('name')} role="button" tabIndex={0}>
              <div className="flex items-center gap-1">
                <span>Tournament</span>
                <span className="text-muted-foreground">
                  {getSortIcon("name")}
                </span>
              </div>
            </CustomTableHead>
            <CustomTableHead
              className="cursor-pointer select-none min-w-[140px] hidden sm:table-cell"
              onClick={() => handleSort('dates')} onKeyDown={e => e.key === 'Enter' && handleSort('dates')} role="button" tabIndex={0}>
              <div className="flex items-center gap-1">
                <span>Dates</span>
                <span className="text-muted-foreground">
                  {getSortIcon("dates")}
                </span>
              </div>
            </CustomTableHead>
            <CustomTableHead
              className="cursor-pointer select-none hidden md:table-cell"
              onClick={() => handleSort('location')} onKeyDown={e => e.key === 'Enter' && handleSort('location')} role="button" tabIndex={0}>
              <div className="flex items-center gap-1">
                <span>Location</span>
                <span className="text-muted-foreground">
                  {getSortIcon("location")}
                </span>
              </div>
            </CustomTableHead>
            <CustomTableHead className="cursor-pointer select-none text-right hidden sm:table-cell" onClick={() => handleSort('players')} onKeyDown={e => e.key === 'Enter' && handleSort('players')} role="button" tabIndex={0}>
              <div className="flex items-center gap-1 justify-end">
                <span>Valid TPRs</span>
                <span className="text-muted-foreground">
                  {getSortIcon("players")}
                </span>
              </div>
            </CustomTableHead>
            <CustomTableHead
              className="cursor-pointer select-none text-right hidden lg:table-cell"
              onClick={() => handleSort('rounds')} onKeyDown={e => e.key === 'Enter' && handleSort('rounds')} role="button" tabIndex={0}>
              <div className="flex items-center gap-1 justify-end">
                <span>Rounds</span>
                <span className="text-muted-foreground">
                  {getSortIcon("rounds")}
                </span>
              </div>
            </CustomTableHead>
            <CustomTableHead
              className="cursor-pointer select-none text-right hidden sm:table-cell"
              onClick={() => handleSort('avgTop10TPR')} onKeyDown={e => e.key === 'Enter' && handleSort('avgTop10TPR')} role="button" tabIndex={0}>
              <div className="flex items-center gap-1 justify-end">
                <span className="hidden lg:inline">Avg Top 10 TPR</span>
                <span className="lg:hidden">Avg TPR</span>
                <span className="text-muted-foreground">
                  {getSortIcon("avgTop10TPR")}
                </span>
              </div>
            </CustomTableHead>
            <CustomTableHead
              className="cursor-pointer select-none text-right hidden xl:table-cell"
              onClick={() => handleSort('avgTop24Rating')} onKeyDown={e => e.key === 'Enter' && handleSort('avgTop24Rating')} role="button" tabIndex={0}>
              <div className="flex items-center gap-1 justify-end">
                <span>Avg Top 24 Rating</span>
                <span className="text-muted-foreground">
                  {getSortIcon("avgTop24Rating")}
                </span>
              </div>
            </CustomTableHead>
          </CustomTableRow>
        </CustomTableHeader>
        <CustomTableBody>
          {sortedTournaments.map((tournament, index) => {
            const location = tournament.location || inferTournamentLocation(tournament.name)
            const rounds = tournament.rounds ?? 6
            const dates = formatTournamentDateWithOrdinals(tournament?.start_date, tournament?.end_date)

            return (
              <CustomTableRow
                key={tournament.id}
                className={cn(index % 2 === 0 ? 'bg-white hover:bg-gray-200 transition-colors' : 'bg-gray-200/50 hover:bg-gray-200 transition-colors')}>
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
                <CustomTableCell className="text-right tabular-nums hidden sm:table-cell">{tournament.results}</CustomTableCell>
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
