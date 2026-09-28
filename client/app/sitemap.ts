import { MetadataRoute } from 'next'
import { getTournaments } from '@/services/api'
import { SITE_URL as BASE_URL } from '@/lib/site'

export const revalidate = 86400

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Base routes
  const baseRoutes = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 1,
    },
    {
      url: `${BASE_URL}/?category=ladies`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/tournaments`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
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
