import { MetadataRoute } from 'next'
import { getTournaments } from '@/services/api'

export const dynamic = 'force-dynamic'

const BASE_URL = 'https://1700chess.vercel.app'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Base routes
  const baseRoutes = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 1,
    },
    {
      url: `${BASE_URL}/rankings`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.9,
    },
  ]

  // Tournament routes - try to fetch, but gracefully handle failures
  let tournamentRoutes: MetadataRoute.Sitemap = []
  
  try {
    const tournaments = await getTournaments()
    tournamentRoutes = tournaments.map((tournament) => ({
      url: `${BASE_URL}/tournament/${tournament.id}`,
      lastModified: tournament.end_date ? new Date(tournament.end_date) : new Date(),
      changeFrequency: 'yearly' as const,
      priority: 0.8,
    }))
  } catch (error) {
    // If API is unavailable during build, just return base routes
    console.warn('Could not fetch tournaments for sitemap:', error)
  }

  // Note: We're not including player pages because there could be thousands
  // Search engines will discover them through navigation

  return [...baseRoutes, ...tournamentRoutes]
}