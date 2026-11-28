import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { LiveStandings } from '@/components/rankings/live-standings'
import { forecastMatchesResults, getCategoryForecast } from '@/lib/qualification-forecast'
import { pageMetadata } from '@/lib/site'
import { getLiveStandings, type LiveCategory } from '@/services/api'

export const revalidate = 0

export async function generateMetadata(): Promise<Metadata> {
  const live = await getLiveStandings()
  return pageMetadata({
    title: live ? `${live.event} live` : 'Live',
    description: 'Live standings and qualification odds while a Chess Kenya Grand Prix event is being played.',
    path: '/live',
  })
}

export default async function LivePage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams
  const season = new Date().getFullYear()
  const [live, forecastCurrent] = await Promise.all([getLiveStandings(), forecastMatchesResults(season)])
  if (!live) redirect('/tournaments')

  return (
    <LiveStandings
      data={live}
      category={(category === 'ladies' ? 'ladies' : 'open') satisfies LiveCategory}
      season={season}
      published={{
        open: getCategoryForecast('open', season, forecastCurrent),
        ladies: getCategoryForecast('ladies', season, forecastCurrent),
      }}
    />
  )
}
