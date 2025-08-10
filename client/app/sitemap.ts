import { MetadataRoute } from 'next'
import { getTournaments } from '@/services/api'

const BASE_URL = 'https://1700chess.vercel.app'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Get all tournaments
  const tournaments = await getTournaments()
  
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

  // Tournament routes
  const tournamentRoutes = tournaments.map((tournament) => ({
    url: `${BASE_URL}/tournament/${tournament.id}`,
    lastModified: tournament.end_date ? new Date(tournament.end_date) : new Date(),
    changeFrequency: 'yearly' as const,
    priority: 0.8,
  }))

  // Note: We're not including player pages because there could be thousands
  // Search engines will discover them through navigation

  return [...baseRoutes, ...tournamentRoutes]
}