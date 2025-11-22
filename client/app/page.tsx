import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CalendarDays, MapPin, Hash, Calendar, Activity } from 'lucide-react'
import { getTournamentData } from '@/lib/tournament-data'
import { TournamentTable } from '@/components/tournament-table'
import { CustomTable, CustomTableHead, CustomTableHeader, CustomTableRow, CustomTableBody, CustomTableCell } from '@/components/ui/custom-table'
import { upcomingTournaments, plannedTournaments } from '@/lib/active-tournaments'
import dayjs from '@/lib/dayjs'
import { Metadata } from 'next'
import { CountdownBadge } from '@/components/countdown-badge'
import { getPlayer, getRankings } from '@/services/api'

// Smart name abbreviation (mirrors rankings page with shorter threshold for the live table)
function getDisplayName(fullName: string): string {
  const trimmed = fullName.trim()
  const parts = trimmed.split(' ')
  if (parts.length >= 3) {
    const firstTwo = parts.slice(0, 2).join(' ')
    const lastPart = parts[parts.length - 1]
    const abbreviatedLast = lastPart.length > 1 ? `${lastPart[0]}.` : lastPart
    return `${firstTwo} ${abbreviatedLast}`
  }
  return trimmed
}

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Chess Kenya 2025 Grand Prix - Official Tournament Tracker',
  description:
    'Track Chess Kenya Grand Prix tournaments, view results, player rankings and upcoming events. Official standings for the 2025 chess season in Kenya.',
  openGraph: {
    title: 'Chess Kenya 2025 Grand Prix',
    description: 'Official tournament tracker for Chess Kenya Grand Prix. View results, rankings and upcoming chess tournaments across Kenya.',
    type: 'website',
    siteName: 'Chess Kenya Grand Prix',
    url: 'https://1700chess.vercel.app'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Chess Kenya 2025 Grand Prix',
    description: 'Track chess tournaments, results and rankings for the Kenya Grand Prix series'
  }
}

function formatTimeAway(startDateIso: string) {
  const startDate = dayjs(startDateIso)
  const now = dayjs()
  const daysAway = startDate.diff(now, 'day')
  const weeksAway = Math.floor(daysAway / 7)
  const remainingDays = daysAway % 7

  if (daysAway <= 0) return daysAway === 0 ? 'Today' : 'In progress'
  if (daysAway === 1) return 'Tomorrow'
  if (daysAway < 7) return `${daysAway} days away`
  if (weeksAway === 1 && remainingDays === 0) return '1 week away'
  if (weeksAway === 1) return `1 week ${remainingDays} ${remainingDays === 1 ? 'day' : 'days'} away`
  if (remainingDays === 0) return `${weeksAway} weeks away`
  return `${weeksAway} weeks ${remainingDays} ${remainingDays === 1 ? 'day' : 'days'} away`
}

function getBubbleStatus(name: string) {
  const lower = name.toLowerCase()
  const isFelix = lower.includes('felix')
  const isMethu = lower.includes('methu')

  if (isFelix) {
    return { label: 'Not playing', dotClass: 'bg-gray-300 ring-gray-200', animate: '' }
  }
  if (isMethu) {
    return { label: 'Not playing', dotClass: 'bg-gray-300 ring-gray-200', animate: '' }
  }
  return { label: 'Playing live', dotClass: 'bg-emerald-500 ring-emerald-200', animate: 'animate-pulse' }
}

function normalizeName(name: string) {
  const cleaned = name.replace(/\s+/g, ' ').trim().toLowerCase()
  const titlePrefixes = ['cm', 'wfm', 'wcm', 'wgm', 'agm', 'aim', 'im', 'fm', 'gm', 'aim', 'aim']
  const parts = cleaned.split(' ')
  const stripped = titlePrefixes.includes(parts[0]) ? parts.slice(1).join(' ') : cleaned
  return stripped.replace(/[^\w\s.-]/g, '').trim()
}

function getDropScoreFromAverages(player: { best_1: number; best_2: number; best_3: number; best_4: number }) {
  // Reconstruct the four scores from rounded averages to reduce rounding drift
  const s1 = player.best_1
  const s2 = 2 * player.best_2 - s1
  const s3 = 3 * player.best_3 - s1 - s2
  const s4 = 4 * player.best_4 - s1 - s2 - s3
  const ordered = [s1, s2, s3, s4].sort((a, b) => b - a)
  // Bias slightly upward to counteract double-rounding drift from stored averages
  return Math.round(ordered[3] + 0.5)
}

function recomputeBest4(currentBest3: number, currentBest4: number, liveTpr: number | null): number {
  if (liveTpr === null || Number.isNaN(liveTpr)) return currentBest4
  // Derive existing 4th best from stored averages and replace if the live TPR is better
  const currentFourth = 4 * currentBest4 - 3 * currentBest3
  const improvedFourth = Math.max(liveTpr, currentFourth)
  return Math.round((3 * currentBest3 + improvedFourth) / 4)
}

const liveTprs = [
  { name: 'Magana Ben', tpr: 2201 },
  { name: 'Okonga Hugh Misiko', tpr: 2059 },
  { name: 'Kaloki Hawi', tpr: 2033 },
  { name: 'Madol Garang Panthou Joh', tpr: 2020 },
  { name: 'Nhial Jeremiah Machar', tpr: 1791 },
  { name: 'Ngony John Thon', tpr: 1876 },
  { name: 'Njuki Gabriel', tpr: 1924 },
  { name: 'Karani Ezekiel', tpr: 2010 },
  { name: 'Kiplangat Baraka', tpr: 1559 },
  { name: 'Cheruiyot Elly', tpr: 1907 },
  { name: 'Adrian Kariuki', tpr: 1617 },
  { name: 'Mongeli Sasha', tpr: 1706 },
  { name: 'Wanjiru Chrisphinus', tpr: 1892 },
  { name: 'Chumba Allan', tpr: 1823 },
  { name: 'Chege Kairu', tpr: 1865 },
  { name: 'Mugambi Christian Mwamba', tpr: 1762 },
  { name: 'Omondi Stanley', tpr: 1807 },
  { name: 'Nicole Albright', tpr: 1758 },
  { name: 'Kelly Mwaniki', tpr: 1634 },
  { name: 'Shile Lenny Mataiga', tpr: 1849 },
  { name: 'Mathenge Gichuga', tpr: 1678 },
  { name: 'Nthiga Blair Wema', tpr: 1668 },
  { name: 'Waweru Davidson Mugo', tpr: 1699 },
  { name: 'Nashipae Bella', tpr: 1774 },
  { name: 'Mubi Hillary', tpr: 1594 },
  { name: 'Amwai Tom', tpr: 1834 },
  { name: 'Kyalo Cynthia Wayua', tpr: 1684 },
  { name: 'Omolo Kenneth', tpr: 1907 },
  { name: 'Kagambi Lawrence', tpr: 1812 },
  { name: 'Akhanyinya Bryan Toboso', tpr: 1744 },
  { name: 'Mulaga Geoffrey', tpr: 1912 },
  { name: 'Mitei Cosmas', tpr: 1681 },
  { name: 'Kaloki Zuri', tpr: 1806 },
  { name: 'Chagwaya Brenda', tpr: 1697 },
  { name: 'Ndirangu Joyce Nyaruai', tpr: 1834 },
  { name: 'Sagwa Hillary', tpr: 1870 },
  { name: 'Kimani Wanjiru', tpr: 1672 },
  { name: 'Jasmine Akinyi Ochieng', tpr: 1535 },
  { name: 'Kagambi Samuel', tpr: 1677 },
  { name: 'Gwada James', tpr: 1660 },
  { name: 'Waweru Trevor Kipngetich', tpr: 1558 },
  { name: 'Remiel Ahadi', tpr: 1532 },
  { name: 'Ochieng James', tpr: 1604 },
  { name: 'Onyango Shirlyn Gathoni', tpr: 1742 },
  { name: 'James Mungai', tpr: 1568 },
  { name: 'Ann Nakieny', tpr: 1431 },
  { name: 'Jacob Mandela', tpr: 1609 },
  { name: 'Tyron Gaya', tpr: 1604 },
  { name: 'Isaac Bahati', tpr: 1471 },
  { name: 'Baden Fred Eric', tpr: 1669 },
  { name: 'Getange Johnpaul', tpr: 1665 },
  { name: 'Salma Nkatha Mwenda', tpr: 1468 },
  { name: 'Osundwa Ihabi', tpr: 1479 },
  { name: 'Gilana Angel Muthoni', tpr: 1312 },
  { name: 'Muli Faraja Mumo', tpr: 1665 },
  { name: 'Elias Cheruiyot', tpr: 1607 },
  { name: 'Hillary Mukabwa', tpr: 1270 },
  { name: 'Kitongamirriam', tpr: 1479 },
  { name: 'Dancun Silali', tpr: 1534 },
  { name: 'Kipkoech Hekima', tpr: 1524 },
  { name: 'Ayabei Shadrack', tpr: 1388 },
  { name: 'Kayden Sankau Oloitiptip', tpr: 1223 },
  { name: 'Kamoni Elvin', tpr: 1581 },
  { name: 'Maiyani Oloitiptip Trevor', tpr: 1413 },
  { name: 'Lehman Okoyo', tpr: 1337 },
  { name: 'Okello John', tpr: 1389 },
  { name: 'Methu Joseph Muragu', tpr: 1768 },
  { name: 'Miriti Angela Kendi', tpr: 1488 },
  { name: 'Chepkoiwo Blessing Jerutich', tpr: 1370 },
  { name: 'Manuel Mwine Bujara', tpr: 1405 },
  { name: 'Jayden Kiogora Mwenda', tpr: 1474 },
  { name: 'Njuguna Lisa Wanjiru', tpr: 1354 },
  { name: 'Shannon Bulimo', tpr: 1578 },
  { name: 'Kagambi Jeremiah', tpr: 1588 },
  { name: 'Gichuga Wanjiru Wanjiku', tpr: 1378 },
  { name: 'Chepkoiwo Patience Jepkemoi', tpr: 1315 },
  { name: 'Kamoni Elsie Wambui', tpr: 1195 },
  { name: 'Brian Ayodi', tpr: 1349 },
  { name: 'Kagambi Angel', tpr: 1598 },
  { name: 'Oscar Jesus', tpr: 1227 },
  { name: 'Jeremy Nganga', tpr: 1367 },
  { name: 'Gloria Wakoli', tpr: 1202 },
  { name: 'Kamau Kange', tpr: 1525 },
  { name: 'Mark Kisia', tpr: 1132 },
  { name: 'Precious Makena', tpr: 676 },
  { name: 'Josphat Wanambisi', tpr: 1212 },
  { name: 'Levi Marco', tpr: 1168 },
  { name: 'Deng Deng', tpr: 1380 },
  { name: 'Anger Deng', tpr: 1377 },
  { name: 'Clement Onyango', tpr: 1549 },
  { name: 'Kioko Keith', tpr: 1525 },
  { name: 'Belyse Uwitonze', tpr: 1148 },
  { name: 'Palanga Boston', tpr: 803 },
  { name: 'Yvonne Kageha Khanari', tpr: 625 },
  { name: 'Lisa Shanie Edemba', tpr: 600 },
  { name: 'Mbaabu Cyprian', tpr: 0 },
  { name: 'Opon Nicodemus', tpr: 0 },
  { name: 'Andrew Kuria', tpr: 0 },
  { name: 'Arnold Wekesa', tpr: 1593 },
  { name: 'Emmanuel Wekesa', tpr: 0 }
]
const liveTprMap: Record<string, number | null> = liveTprs.reduce((acc, entry) => {
  acc[normalizeName(entry.name)] = entry.tpr
  return acc
}, {} as Record<string, number | null>)
function getLiveTpr(name: string): number | null {
  return liveTprMap[normalizeName(name)] ?? null
}
const liveRoundLabel = 6

export default async function HomePage() {
  const tournaments = await getTournamentData()
  // Grab the top page, then re-rank locally using live TPRs
  const { rankings: latestTop } = await getRankings({ sort: 'best_4', dir: 'desc', page: 1 })

  // Pull precise drop scores (4th best TPR) and top-4 from player histories when possible
  const preciseDropMap: Record<string, number> = {}
  const preciseTop4Map: Record<string, number[]> = {}
  await Promise.all(
    latestTop.map(async player => {
      const playerId = player.fide_id || player.name
      if (!player.fide_id) return
      try {
        const details = await getPlayer(player.fide_id)
        const eligible = (details.results || [])
          .filter(r => (r.result_status ?? 'valid') === 'valid' && r.tpr !== null)
          .map(r => r.tpr as number)
          .sort((a, b) => b - a)
        if (eligible.length >= 4) {
          preciseDropMap[playerId] = eligible[3]
          preciseTop4Map[playerId] = eligible.slice(0, 4)
        } else if (eligible.length > 0) {
          preciseTop4Map[playerId] = eligible
        }
      } catch {
        // Ignore fetch errors; fallback to reconstructed drop
      }
    })
  )

  const adjustedStandings = latestTop
    .map(player => {
      const playerId = player.fide_id || player.name
      const liveTprRaw = getLiveTpr(player.name)
      const isMethu = normalizeName(player.name).includes('methu')
      const liveTpr = isMethu ? null : liveTprRaw
      const baseStatus = getBubbleStatus(player.name)
      const isPlaying = liveTpr !== null && baseStatus.label !== 'Not playing'
      const status = isPlaying
        ? { label: 'Playing live', dotClass: 'bg-emerald-500 ring-emerald-200', animate: 'animate-pulse' }
        : { label: 'Not playing', dotClass: '', animate: '' }
      const currentTpr = liveTpr ?? (player as { current_tpr?: number; tpr?: number }).current_tpr ?? (player as { current_tpr?: number; tpr?: number }).tpr ?? '-'
      const dropFromHistory = preciseDropMap[playerId]
      const dropScore = isPlaying
        ? dropFromHistory !== undefined
          ? dropFromHistory
          : getDropScoreFromAverages(player)
        : null
      // Build adjusted Best 4 using precise top-4 when available (only adjust if playing)
      let adjustedBest4: number
      if (!isPlaying) {
        adjustedBest4 = player.best_4
      } else {
        const baseTop4 = preciseTop4Map[playerId]
        if (baseTop4 && baseTop4.length) {
          const top4 = [...baseTop4]
          if (liveTpr !== null) {
            top4.push(liveTpr)
          }
          const sorted = top4.sort((a, b) => b - a).slice(0, 4)
          const avg = sorted.reduce((sum, val) => sum + val, 0) / sorted.length
          adjustedBest4 = Math.round(avg)
        } else {
          adjustedBest4 =
            liveTpr !== null
              ? recomputeBest4(player.best_3, player.best_4, liveTpr)
              : player.best_4
        }
      }

      return {
        player,
        playerId,
        status,
        liveTpr,
        currentTpr,
        dropScore,
        adjustedBest4
      }
    })
    .sort((a, b) => b.adjustedBest4 - a.adjustedBest4)
    .map((row, idx) => ({
      ...row,
      overallRank: idx + 1,
      isQualifier: idx + 1 <= 10
    }))

  const bubbleWatch = adjustedStandings.slice(0, 15)

  return (
    <div className="min-h-screen">
      <div className="container mx-auto sm:px-4 py-4 space-y-8 max-w-11xl">
        {bubbleWatch.length > 0 && (
          <section id="live-standings">
            <Card className="border border-gray-200 shadow-sm bg-white/95 p-0 py-0 gap-0 rounded-md sm:rounded-lg">
              <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-600" />
                <Link
                  href="https://s1.chess-results.com/tnr1297454.aspx?lan=1&art=1&rd=6&SNode=S0"
                  className="text-sm font-semibold text-gray-800 hover:text-blue-700 hover:underline inline-flex items-center gap-1"
                  target="_blank"
                  rel="noreferrer">
                  <span>Live standings after round {liveRoundLabel}</span>
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
              <div className="p-0">
                <CustomTable className="text-xs sm:text-sm" containerClassName="shadow-none rounded-none">
                  <CustomTableHeader>
                    <CustomTableRow>
                      <CustomTableHead className="w-[48px] text-center">#</CustomTableHead>
                      <CustomTableHead>Player</CustomTableHead>
                      <CustomTableHead className="text-right">Drop score</CustomTableHead>
                      <CustomTableHead className="text-right">TPR</CustomTableHead>
                      <CustomTableHead className="text-right">Best 4</CustomTableHead>
                    </CustomTableRow>
                  </CustomTableHeader>
                  <CustomTableBody>
                    {bubbleWatch.map(row => (
                        <CustomTableRow
                          key={row.playerId}
                          className={
                            row.isQualifier
                              ? 'border-l-2 border-l-blue-600 bg-blue-50/60 hover:bg-blue-100/80'
                              : ''
                          }>
                          <CustomTableCell className="text-center font-semibold tabular-nums">#{row.overallRank}</CustomTableCell>
                          <CustomTableCell className="font-semibold text-gray-900">
                            <span className="relative inline-flex items-center max-w-full pr-2">
                              {row.player.fide_id ? (
                                <Link
                                  href={`/player/${row.player.fide_id}`}
                                  className="truncate text-blue-600 hover:text-blue-700 hover:underline">
                                  {getDisplayName(row.player.name)}
                                </Link>
                              ) : (
                                <span className="truncate text-gray-900">{getDisplayName(row.player.name)}</span>
                              )}
                              {row.status.dotClass ? (
                                <span
                                  title={row.status.label}
                                  className={`absolute right-0 top-0 inline-flex h-[6px] w-[6px] rounded-full ring-1 ring-white ${row.status.dotClass} ${row.status.animate}`}
                                  aria-label={row.status.label}
                                />
                              ) : null}
                            </span>
                          </CustomTableCell>
                          <CustomTableCell className="text-right tabular-nums text-gray-700">
                            {row.dropScore === null ? '-' : row.dropScore}
                          </CustomTableCell>
                          <CustomTableCell className="text-right tabular-nums font-semibold text-gray-900">
                            {row.currentTpr}
                          </CustomTableCell>
                          <CustomTableCell className="text-right tabular-nums font-semibold text-gray-900">
                            {row.adjustedBest4}
                          </CustomTableCell>
                        </CustomTableRow>
                      ))}
                  </CustomTableBody>
                </CustomTable>
              </div>
            </Card>
          </section>
        )}

        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold tracking-tight text-gray-700">Upcoming Tournaments</h2>
          </div>
          <p className="text-pretty text-gray-600 mb-4 text-sm tracking-wide leading-tighter">
            Grand Prix events happening within the next 60 days.
          </p>

          <div className="flex flex-wrap gap-4">
            {upcomingTournaments.map(tournament => {
              if (!tournament.startDate || !tournament.endDate) return null

              const timeAwayText = formatTimeAway(tournament.startDate)
              const detailHref =
                typeof tournament.detailsUrl === 'string'
                  ? tournament.detailsUrl
                  : tournament.detailsUrl === undefined && /^\d+$/.test(tournament.id)
                    ? `/tournament/${tournament.id}`
                    : null

              return (
                <div key={tournament.id} className="w-full sm:w-[calc(50%-12px)] md:w-[calc(33.333%-16px)]">
                  <Card
                    className={`h-full rounded-lg ${
                      tournament.status === 'postponed' ? 'opacity-75' : ''
                    } relative overflow-hidden py-2 gap-4`}>
                    {(tournament.status !== 'postponed' || tournament.registrationUrl) && (
                      <div className="px-4 flex items-center justify-between gap-3">
                        {tournament.status !== 'postponed' ? (
                          <CountdownBadge targetDate={tournament.startDate} title={timeAwayText} />
                        ) : (
                          <span />
                        )}
                        {tournament.registrationUrl && (
                          <Link
                            href={tournament.registrationUrl}
                            className="text-sm font-semibold text-blue-600 hover:text-blue-700 underline underline-offset-4"
                            target="_blank"
                            rel="noopener noreferrer"
                            prefetch={false}>
                            Register
                          </Link>
                        )}
                      </div>
                    )}

                    <CardHeader className="pb-1 px-4">
                      <div className="flex items-center justify-between">
                        <CardTitle>
                          {detailHref ? (
                            <Link
                              href={detailHref}
                              className={
                                tournament.status === 'postponed'
                                  ? 'line-through text-gray-500 hover:underline'
                                  : 'hover:underline'
                              }>
                              {tournament.short_name || tournament.name}
                            </Link>
                          ) : (
                            <span className={tournament.status === 'postponed' ? 'line-through text-gray-500' : ''}>
                              {tournament.short_name || tournament.name}
                            </span>
                          )}
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
                          {dayjs(tournament.startDate).format('MMMM Do')} - {dayjs(tournament.endDate).format('MMMM Do, YYYY')}
                        </span>
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="px-4 pt-0 pb-2 flex flex-col gap-3 text-sm">
                      <div className="flex justify-between">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{tournament.location}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{tournament.rounds ? `${tournament.rounds} rounds` : 'TBA'}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )
            })}
          </div>
        </section>

        {plannedTournaments.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold tracking-tight text-gray-700">Planned Tournaments</h2>
            <p className="text-pretty text-gray-600 mb-4 text-sm tracking-wide leading-tighter">
              Future tournaments with confirmed or tentative dates and details.
            </p>

            <div className="flex flex-wrap gap-4">
              {plannedTournaments.map(tournament => {
                const hasDates = Boolean(tournament.startDate && tournament.endDate)
                const timeAwayText = tournament.startDate ? formatTimeAway(tournament.startDate) : ''

                const detailHref =
                  typeof tournament.detailsUrl === 'string'
                    ? tournament.detailsUrl
                    : tournament.detailsUrl === undefined && hasDates && /^\d+$/.test(tournament.id)
                      ? `/tournament/${tournament.id}`
                      : null

                return (
                  <div key={tournament.id} className="w-full sm:w-[calc(50%-12px)] md:w-[calc(33.333%-16px)]">
                    <Card className="h-full rounded-lg relative overflow-hidden gap-4 py-2">
                      {timeAwayText && (
                        <div className="px-4">
                          <CountdownBadge
                            targetDate={tournament.startDate as string}
                            title={timeAwayText}
                          />
                        </div>
                      )}

                      <CardHeader className="px-4">
                        <div className="flex items-center justify-between">
                          <CardTitle>
                            {detailHref ? (
                              <Link href={detailHref} className="hover:underline">
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
                            {hasDates
                              ? `${dayjs(tournament.startDate!).format('MMM Do')} - ${dayjs(tournament.endDate!).format(
                                  'MMM Do, YYYY'
                                )}`
                              : `${tournament.month ?? 'TBA'} 2025`}
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
                              {tournament.rounds
                                ? `${tournament.rounds} rounds`
                                : `~${tournament.tentativeRounds ?? tournament.rounds ?? 6} rounds`}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        <section className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight text-gray-700">Completed Tournaments</h2>
            <p className="text-pretty text-gray-600 text-sm tracking-wide leading-tighter">
              Completed Grand Prix tournaments
            </p>
          </div>

          <TournamentTable tournaments={tournaments} />
        </section>
      </div>
    </div>
  )
}
