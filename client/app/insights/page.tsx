import { getInsights, getSeasons } from '@/services/api'
import { SeasonSelector } from '@/components/season-selector'
import { Metadata } from 'next'
import {
  Target, TrendingUp, Zap, Ghost, Award, BarChart3,
  Trophy, Dumbbell, Scale, Clock, AlertTriangle, Activity, Crosshair
} from 'lucide-react'

export const revalidate = 120

export const metadata: Metadata = {
  title: 'Season Insights - Chess Kenya Grand Prix',
  description: 'Data-driven analysis of the Chess Kenya Grand Prix season. Explore patterns, outliers, and what it takes to qualify.',
}

const CATEGORY_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string; border: string }> = {
  'The Field': { icon: BarChart3, color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
  'The Cutoff': { icon: Target, color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
  'Peak vs Consistency': { icon: Zap, color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  'What If': { icon: Ghost, color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
  'Overperformers': { icon: TrendingUp, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  'Consistency': { icon: Activity, color: 'text-cyan-700', bg: 'bg-cyan-50', border: 'border-cyan-200' },
  'Tournament Strength': { icon: Trophy, color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
  "The Grinder's Edge": { icon: Dumbbell, color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  'Rating \u2260 Destiny': { icon: Scale, color: 'text-pink-700', bg: 'bg-pink-50', border: 'border-pink-200' },
  'Season Arc': { icon: Clock, color: 'text-teal-700', bg: 'bg-teal-50', border: 'border-teal-200' },
  'The Walkover Tax': { icon: AlertTriangle, color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200' },
  'Spike Dependency': { icon: Award, color: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-200' },
  'Bellwether': { icon: Crosshair, color: 'text-sky-700', bg: 'bg-sky-50', border: 'border-sky-200' },
}

const DEFAULT_CONFIG = { icon: BarChart3, color: 'text-gray-700', bg: 'bg-gray-50', border: 'border-gray-200' }

function InsightCard({ insight }: { insight: { category: string; title: string; detail: string; data: unknown } }) {
  const config = CATEGORY_CONFIG[insight.category] || DEFAULT_CONFIG
  const Icon = config.icon

  // Render data tables for certain insight types
  const dataTable = renderDataTable(insight)

  return (
    <div className={`rounded-lg border ${config.border} ${config.bg}/30 bg-white overflow-hidden`}>
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className={`shrink-0 mt-0.5 rounded-md ${config.bg} p-1.5`}>
            <Icon className={`h-4 w-4 ${config.color}`} />
          </div>
          <div className="min-w-0 flex-1">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${config.color}`}>
              {insight.category}
            </span>
            <h3 className="text-sm sm:text-base font-semibold text-gray-900 mt-0.5 leading-snug">
              {insight.title}
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 mt-2 leading-relaxed">
              {insight.detail}
            </p>
          </div>
        </div>
      </div>
      {dataTable && (
        <div className="border-t border-gray-100 bg-gray-50/50 px-4 sm:px-5 py-3 overflow-x-auto">
          {dataTable}
        </div>
      )}
    </div>
  )
}

function renderDataTable(insight: { category: string; data: unknown }) {
  const { category, data } = insight

  if (category === 'The Field' && data && typeof data === 'object') {
    const dist = data as Record<string, number>
    return (
      <div className="flex flex-wrap gap-2">
        {Object.entries(dist).map(([events, count]) => (
          <div key={events} className="text-center bg-white rounded-md px-2.5 py-1.5 border border-gray-200">
            <div className="text-xs font-semibold text-gray-900">{count}</div>
            <div className="text-[10px] text-gray-500">{events} event{events === '1' ? '' : 's'}</div>
          </div>
        ))}
      </div>
    )
  }

  if (category === 'Peak vs Consistency' && Array.isArray(data)) {
    return (
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-gray-500">
            <th className="pb-1.5 font-medium">Player</th>
            <th className="pb-1.5 font-medium text-right">Peak TPR</th>
            <th className="pb-1.5 font-medium text-right">Best 4</th>
            <th className="pb-1.5 font-medium text-right">Rank</th>
            <th className="pb-1.5 font-medium text-right hidden sm:table-cell">Events</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map((p: Record<string, unknown>) => (
            <tr key={String(p.name)}>
              <td className="py-1 font-medium text-gray-900">{String(p.name)}</td>
              <td className="py-1 text-right tabular-nums text-amber-700 font-semibold">{String(p.peak_tpr)}</td>
              <td className="py-1 text-right tabular-nums">{p.best_4 ? String(Math.round(Number(p.best_4))) : '\u2014'}</td>
              <td className="py-1 text-right tabular-nums">#{String(p.rank)}</td>
              <td className="py-1 text-right tabular-nums hidden sm:table-cell">{String(p.tournaments)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  if (category === 'The Cutoff' && Array.isArray(data)) {
    return (
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-gray-500">
            <th className="pb-1.5 font-medium">Rank</th>
            <th className="pb-1.5 font-medium">Player</th>
            <th className="pb-1.5 font-medium text-right">Best 4</th>
            <th className="pb-1.5 font-medium text-right">Gap to #9</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map((p: Record<string, unknown>) => (
            <tr key={String(p.name)}>
              <td className="py-1 tabular-nums">#{String(p.rank)}</td>
              <td className="py-1 font-medium text-gray-900">{String(p.name)}</td>
              <td className="py-1 text-right tabular-nums">{String(Math.round(Number(p.best_4)))}</td>
              <td className="py-1 text-right tabular-nums text-red-600 font-semibold">-{String(Math.round(Number(p.gap_to_9)))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  if (category === 'What If' && Array.isArray(data)) {
    return (
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-gray-500">
            <th className="pb-1.5 font-medium">Player</th>
            <th className="pb-1.5 font-medium text-right">Peak TPR</th>
            <th className="pb-1.5 font-medium text-right">Events</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map((p: Record<string, unknown>) => (
            <tr key={String(p.name)}>
              <td className="py-1 font-medium text-gray-900">{String(p.name)}</td>
              <td className="py-1 text-right tabular-nums text-purple-700 font-semibold">{String(p.peak_tpr)}</td>
              <td className="py-1 text-right tabular-nums">{String(p.events)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  if (category === 'Overperformers' && Array.isArray(data)) {
    return (
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-gray-500">
            <th className="pb-1.5 font-medium">Player</th>
            <th className="pb-1.5 font-medium text-right">Rating</th>
            <th className="pb-1.5 font-medium text-right">Best 4</th>
            <th className="pb-1.5 font-medium text-right">Gap</th>
            <th className="pb-1.5 font-medium text-right">Rank</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map((p: Record<string, unknown>) => (
            <tr key={String(p.name)}>
              <td className="py-1 font-medium text-gray-900">{String(p.name)}</td>
              <td className="py-1 text-right tabular-nums">{String(p.rating)}</td>
              <td className="py-1 text-right tabular-nums">{String(p.best_4)}</td>
              <td className="py-1 text-right tabular-nums text-emerald-700 font-semibold">+{String(p.gap)}</td>
              <td className="py-1 text-right tabular-nums">#{String(p.rank)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  if (category === 'Tournament Strength' && Array.isArray(data)) {
    return (
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-gray-500">
            <th className="pb-1.5 font-medium">Tournament</th>
            <th className="pb-1.5 font-medium text-right">Avg TPR</th>
            <th className="pb-1.5 font-medium text-right">Players</th>
            <th className="pb-1.5 font-medium text-right hidden sm:table-cell">Rounds</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map((t: Record<string, unknown>, i: number) => (
            <tr key={i}>
              <td className="py-1 font-medium text-gray-900 max-w-[180px] truncate">{String(t.name)}</td>
              <td className="py-1 text-right tabular-nums text-orange-700 font-semibold">{String(t.avg_tpr)}</td>
              <td className="py-1 text-right tabular-nums">{String(t.players)}</td>
              <td className="py-1 text-right tabular-nums hidden sm:table-cell">{t.rounds ? String(t.rounds) : '\u2014'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  if (category === 'Spike Dependency' && Array.isArray(data)) {
    return (
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-gray-500">
            <th className="pb-1.5 font-medium">Player</th>
            <th className="pb-1.5 font-medium text-right">Peak</th>
            <th className="pb-1.5 font-medium text-right">Best 4</th>
            <th className="pb-1.5 font-medium text-right">Gap</th>
            <th className="pb-1.5 font-medium text-right">Rank</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map((p: Record<string, unknown>) => (
            <tr key={String(p.name)}>
              <td className="py-1 font-medium text-gray-900">{String(p.name)}</td>
              <td className="py-1 text-right tabular-nums">{String(p.best_1)}</td>
              <td className="py-1 text-right tabular-nums">{String(p.best_4)}</td>
              <td className="py-1 text-right tabular-nums text-violet-700 font-semibold">{String(p.gap)}</td>
              <td className="py-1 text-right tabular-nums">#{String(p.rank)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  if (category === 'Consistency' && data && typeof data === 'object' && !Array.isArray(data)) {
    const d = data as Record<string, unknown[]>
    const consistent = (d.most_consistent || []) as Record<string, unknown>[]
    const volatile_ = (d.most_volatile || []) as Record<string, unknown>[]
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-600 mb-1.5">Most Consistent</div>
          {consistent.map((v) => (
            <div key={String(v.name)} className="flex justify-between text-xs py-0.5">
              <span className="text-gray-900">{String(v.name)}</span>
              <span className="tabular-nums text-gray-500">{String(v.range)}pt range / {String(v.events)} events</span>
            </div>
          ))}
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-red-600 mb-1.5">Most Volatile</div>
          {volatile_.map((v) => (
            <div key={String(v.name)} className="flex justify-between text-xs py-0.5">
              <span className="text-gray-900">{String(v.name)}</span>
              <span className="tabular-nums text-gray-500">{String(v.range)}pt range / {String(v.events)} events</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (category === 'Season Arc' && data && typeof data === 'object' && !Array.isArray(data)) {
    const d = data as Record<string, unknown[]>
    const surgers = (d.surgers || []) as Record<string, unknown>[]
    const faders = (d.faders || []) as Record<string, unknown>[]
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-teal-600 mb-1.5">H2 Surgers</div>
          {surgers.map((v) => (
            <div key={String(v.name)} className="flex justify-between text-xs py-0.5">
              <span className="text-gray-900">{String(v.name)}</span>
              <span className="tabular-nums text-emerald-600 font-medium">+{String(v.change)}</span>
            </div>
          ))}
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-red-600 mb-1.5">H2 Faders</div>
          {faders.map((v) => (
            <div key={String(v.name)} className="flex justify-between text-xs py-0.5">
              <span className="text-gray-900">{String(v.name)}</span>
              <span className="tabular-nums text-red-600 font-medium">{String(v.change)}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (category === 'The Walkover Tax' && Array.isArray(data)) {
    return (
      <div className="flex flex-wrap gap-2">
        {data.slice(0, 6).map((w: Record<string, unknown>) => (
          <div key={String(w.name)} className="bg-white rounded-md px-2.5 py-1.5 border border-gray-200 text-xs">
            <span className="font-medium text-gray-900">{String(w.name)}</span>
            <span className="text-gray-500 ml-1">{String(w.walkovers)}W / {String(w.total_events)}E</span>
            {w.rank ? <span className="text-gray-400 ml-1">#{String(w.rank)}</span> : null}
          </div>
        ))}
      </div>
    )
  }

  if (category === 'Bellwether' && Array.isArray(data)) {
    return (
      <div className="space-y-3">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="pb-1.5 font-medium">Tournament</th>
              <th className="pb-1.5 font-medium text-right">Avg Error</th>
              <th className="pb-1.5 font-medium text-right hidden sm:table-cell">Median Error</th>
              <th className="pb-1.5 font-medium text-right">Players</th>
              <th className="pb-1.5 font-medium text-right hidden sm:table-cell">Rounds</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((t: Record<string, unknown>, i: number) => {
              const err = Number(t.avg_abs_error)
              const barWidth = Math.min(100, Math.round(err / 2))
              return (
                <tr key={i}>
                  <td className="py-1.5 font-medium text-gray-900 max-w-[160px] truncate">{String(t.tournament)}</td>
                  <td className="py-1.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <div className="hidden sm:block w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${err <= 80 ? 'bg-emerald-400' : err <= 120 ? 'bg-amber-400' : 'bg-red-400'}`}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                      <span className={`tabular-nums font-semibold ${err <= 80 ? 'text-emerald-700' : err <= 120 ? 'text-amber-700' : 'text-red-700'}`}>
                        {String(t.avg_abs_error)}
                      </span>
                    </div>
                  </td>
                  <td className="py-1.5 text-right tabular-nums hidden sm:table-cell">{String(t.median_abs_error)}</td>
                  <td className="py-1.5 text-right tabular-nums">{String(t.players_matched)}</td>
                  <td className="py-1.5 text-right tabular-nums hidden sm:table-cell">{t.rounds ? String(t.rounds) : '\u2014'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <div className="flex items-center gap-3 text-[10px] text-gray-400 pt-1">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" />{'<'}80 (predictive)</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" />80-120</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" />{'>'}120 (noisy)</span>
        </div>
      </div>
    )
  }

  return null
}

interface InsightsPageProps {
  searchParams: { season?: string }
}

export default async function InsightsPage({ searchParams }: InsightsPageProps) {
  const params = await searchParams
  const { seasons } = await getSeasons()
  const currentYear = new Date().getFullYear()
  const season = params.season ? Number(params.season) : (seasons[0] || currentYear)

  let data
  try {
    data = await getInsights(season)
  } catch {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-sm">No insights available for {season}.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-gray-900">{season} Season Insights</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            {data.total_players} players across {data.total_tournaments} tournaments
          </p>
        </div>
        <SeasonSelector seasons={seasons} currentSeason={season} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {data.insights.map((insight, i) => (
          <InsightCard key={i} insight={insight} />
        ))}
      </div>
    </div>
  )
}
