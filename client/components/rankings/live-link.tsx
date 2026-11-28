import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import type { LiveCategory, LiveStandings } from '@/services/api'

export function LiveLink({ data, category }: { data: LiveStandings, category: LiveCategory }) {
  const sections = Object.values(data.sections)
  const completed = Math.max(...sections.map(section => section?.completed_round ?? 0))
  const current = Math.max(...sections.map(section => section?.paired_round ?? 0), completed, 1)
  const round = completed === data.rounds ? 'Final' : `Round ${current} of ${data.rounds}`
  return (
    <Link
      href={category === 'ladies' ? '/live?category=ladies' : '/live'}
      className="group flex items-center gap-2.5 rounded-lg bg-white/95 px-4 py-2.5 text-sm shadow-elevation-low transition-colors hover:bg-white sm:px-6">
      <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
        <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-60 motion-safe:animate-ping" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
      </span>
      <span className="truncate font-semibold text-gray-900">{data.event}</span>
      <span className="whitespace-nowrap text-xs tabular-nums text-gray-500">{round}</span>
      <span className="ml-auto flex shrink-0 items-center gap-0.5 text-xs font-medium text-primary">
        Live standings
        <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </span>
    </Link>
  )
}
