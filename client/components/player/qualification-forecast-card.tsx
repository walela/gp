'use client'

import { Fragment, useId, useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  chanceTier,
  formatChance,
  TIER_LABEL,
  type ChanceTier,
  type ForecastFactors,
  type PlayerCategoryForecast,
  type PlayerForecast,
} from '@/lib/qualification-odds'

const TIER_PILL: Record<ChanceTier, string> = {
  lock: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  'very-likely': 'bg-teal-50 text-teal-700 ring-teal-600/20',
  likely: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  'toss-up': 'bg-amber-50 text-amber-800 ring-amber-600/20',
  'outside-chance': 'bg-orange-50 text-orange-700 ring-orange-600/20',
  'long-shot': 'bg-rose-50 text-rose-700 ring-rose-600/20',
  unlikely: 'bg-gray-100 text-gray-600 ring-gray-500/20',
}

const CATEGORY_LABEL = { open: 'Open team', ladies: 'Ladies team' } as const

// Projections this close to the cutoff are effectively level.
const NEAR_CUTOFF = 15
// Walkover rates above this are well over the typical ~9%.
const HIGH_WALKOVER = 0.12

type Tone = 'good' | 'bad'

function signed(n: number): string {
  return n > 0 ? `+${n}` : n < 0 ? `\u2212${-n}` : '0'
}

function toneOf(n: number): Tone | undefined {
  return n > 0 ? 'good' : n < 0 ? 'bad' : undefined
}

const TONE_TEXT: Record<Tone, string> = { good: 'text-emerald-700', bad: 'text-red-600' }

function Delta({ value }: { value: number }) {
  const tone = toneOf(value)
  return (
    <span
      className={cn(
        'rounded px-1.5 py-0.5 text-xs font-medium tabular-nums',
        tone === 'good' ? 'bg-emerald-50 text-emerald-700' : tone === 'bad' ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-600',
      )}
    >
      {signed(value)}
    </span>
  )
}

function DetailRow({ label, children, total }: { label: string; children: ReactNode; total?: boolean }) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 py-1 text-sm',
        total && 'mt-1 border-t border-gray-200 pt-2 font-medium text-gray-900',
      )}
    >
      <dt className={total ? undefined : 'text-gray-600'}>{label}</dt>
      <dd className="shrink-0 tabular-nums text-gray-900">{children}</dd>
    </div>
  )
}

function Driver({ title, value, tone, children }: {
  title: string
  value?: ReactNode
  tone?: Tone
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  return (
    <div className="border-t border-gray-100 first:border-t-0">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center gap-3 py-2.5 text-left"
      >
        <span className="min-w-0 flex-1 text-sm text-gray-900">{title}</span>
        {value && <span className={cn('text-sm font-semibold tabular-nums text-gray-900', tone && TONE_TEXT[tone])}>{value}</span>}
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-gray-400 transition-transform duration-200 ease-in-out motion-reduce:transition-none',
            open && 'rotate-180',
          )}
          aria-hidden
        />
      </button>
      <div
        id={panelId}
        inert={!open}
        className={cn(
          'grid transition-[grid-template-rows,opacity] duration-[250ms] ease-[cubic-bezier(0.25,0.46,0.45,0.94)] motion-reduce:transition-none',
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
        )}
      >
        <div className="overflow-hidden">
          <div className="mb-3 rounded-md bg-gray-50 px-3 py-2">{children}</div>
        </div>
      </div>
    </div>
  )
}

function OffPaceDriver({ best4, line }: { best4: number | null; line: number | null }) {
  const gap = best4 != null && line != null ? best4 - line : null
  return (
    <Driver title="Current Best 4 TPR vs. cutoff" value={gap == null ? 'No Best 4' : signed(gap)} tone="bad">
      <dl>
        {best4 != null && <DetailRow label="Current Best 4">{best4}</DetailRow>}
        {line != null && <DetailRow label="Projected cutoff">{line}</DetailRow>}
      </dl>
      <p className="mt-1 text-xs text-muted-foreground">Too far below the cutoff to simulate.</p>
    </Driver>
  )
}

function GapDriver({ forecast }: { forecast: PlayerCategoryForecast }) {
  const { entry, cutoff } = forecast
  if (entry.best4_now !== undefined) return <OffPaceDriver best4={entry.best4_now} line={cutoff[1]} />
  const f = entry.factors
  const best4 = entry.best4?.[1]
  const line = cutoff[1]
  const gap = best4 != null && line != null ? best4 - line : null
  const level = gap != null && Math.abs(gap) < NEAR_CUTOFF
  const value = gap == null ? 'No Best 4' : signed(gap)
  return (
    <Driver
      title="Projected Best 4 TPR vs. cutoff"
      value={value}
      tone={gap == null ? 'bad' : level ? undefined : toneOf(gap)}
    >
      <dl>
        {f && f.now[0] > 0 && <DetailRow label={`Current Best ${f.now[0]}`}>{f.now[1]}</DetailRow>}
        {entry.p_four !== undefined && entry.p_four < 0.9995 && (
          <DetailRow label="Chance of a 4th result">{formatChance(entry.p_four)}</DetailRow>
        )}
        {best4 != null && <DetailRow label="Projected Best 4">{best4}</DetailRow>}
        {line != null && <DetailRow label="Projected cutoff">{line}</DetailRow>}
      </dl>
    </Driver>
  )
}

function PerformanceDriver({ f }: { f: ForecastFactors }) {
  const base = f.expected_tpr - f.form_adj - f.group_adj - f.lift
  return (
    <Driver
      title="Expected TPR per event"
      value={<>{f.expected_tpr} <span className="font-normal text-muted-foreground">±{f.swing}</span></>}
    >
      <dl>
        {f.rating != null ? (
          <>
            <DetailRow label="Rating">{f.rating}</DetailRow>
            <DetailRow label={f.form != null ? `Form (median TPR ${f.form})` : 'Form'}>
              <Delta value={f.form_adj} />
            </DetailRow>
          </>
        ) : (
          <DetailRow label="Average TPR (unrated)">{base}</DetailRow>
        )}
        <DetailRow label="Late-season boost"><Delta value={f.lift} /></DetailRow>
        <DetailRow label="Expected TPR" total>{f.expected_tpr} <span className="font-normal text-muted-foreground">±{f.swing}</span></DetailRow>
      </dl>
    </Driver>
  )
}

// A weak result in the best 4 is easy to replace; a tight cluster near the expected TPR isn't.
function WeakestDriver({ f }: { f: ForecastFactors }) {
  if (f.weakest == null) return null
  const room = f.expected_tpr - f.weakest
  return (
    <Driver
      title="Current replacement TPR"
      value={f.weakest}
      tone={Math.abs(room) < NEAR_CUTOFF ? undefined : toneOf(room)}
    >
      <dl>
        <DetailRow label="Expected TPR per event">{f.expected_tpr}</DetailRow>
        {f.p_improve != null && <DetailRow label="Chance an event beats it">{formatChance(f.p_improve)}</DetailRow>}
      </dl>
    </Driver>
  )
}

function expectedResults(f: ForecastFactors): number {
  return f.by_new.reduce((sum, [share], n) => sum + share * n, 0)
}

function EventsDriver({ f }: { f: ForecastFactors }) {
  return (
    <Driver
      title="Expected tournaments left"
      value={<>{f.expected_entries.toFixed(1)} <span className="font-normal text-muted-foreground">of {f.events_left}</span></>}
    >
      <dl>
        <DetailRow label="Events entered">{f.entered[0]} of {f.entered[1]}</DetailRow>
        {f.boost === 'near_lock' && (
          <DetailRow label="Plays again (near lock)"><span className="text-emerald-700">{formatChance(f.near_lock_entry)}</span></DetailRow>
        )}
        <DetailRow label="Walkover risk">
          <span className={f.walkover >= HIGH_WALKOVER ? 'text-red-600' : undefined}>{formatChance(f.walkover)}</span>
        </DetailRow>
        <DetailRow label="Expected new results" total>{expectedResults(f).toFixed(1)}</DetailRow>
      </dl>
    </Driver>
  )
}

function TitleDriver({ title, entryChance }: { title: number; entryChance?: number }) {
  return (
    <Driver
      title="Wins the National Junior Championship"
      value={formatChance(title)}
      tone="good"
    >
      <dl>
        {entryChance ? (
          <>
            <DetailRow label="Enters">{formatChance(entryChance)}</DetailRow>
            <DetailRow label="Wins if entered">{formatChance(title / entryChance)}</DetailRow>
          </>
        ) : (
          <DetailRow label="Wins">{formatChance(title)}</DetailRow>
        )}
      </dl>
    </Driver>
  )
}

// Below 1% of seasons (200 of 20,000) a row's qualify rate is mostly noise.
const MIN_ROW_SHARE = 0.01

// The middle half of seasons by new results.
function likelyRange(byNew: ForecastFactors['by_new']): [number, number] {
  let before = 0
  let lo = 0
  let hi = byNew.length - 1
  byNew.forEach(([share], n) => {
    if (before < 0.25 && before + share >= 0.25) lo = n
    if (before < 0.75 && before + share >= 0.75) hi = n
    before += share
  })
  return [lo, hi]
}

function BreakdownDriver({ f, p }: { f: ForecastFactors; p: number }) {
  const [lo, hi] = likelyRange(f.by_new)
  return (
    <Driver title="Odds by number of new results">
      <table className="w-full text-sm tabular-nums">
        <thead>
          <tr className="text-[11px] uppercase tracking-wide text-muted-foreground">
            <th className="py-1 text-left font-medium">New results</th>
            <th className="py-1 text-right font-medium">Chance</th>
            <th className="py-1 text-right font-medium">Qualifies</th>
          </tr>
        </thead>
        <tbody>
          {f.by_new.map(([share, qualifies], n) => (
            <tr key={n} className={cn('border-t border-gray-200', n >= lo && n <= hi && 'bg-blue-50 font-medium')}>
              <td className="px-1 py-1">{n}</td>
              <td className="py-1 text-right">{formatChance(share)}</td>
              <td className="px-1 py-1 text-right">{qualifies == null || share < MIN_ROW_SHARE ? '\u2013' : formatChance(qualifies)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-muted-foreground">
        Each row&apos;s chance times its qualify rate, summed, gives the {formatChance(p)}. Shaded rows are the likely range.
      </p>
    </Driver>
  )
}

function Chance({ forecast }: { forecast: PlayerCategoryForecast }) {
  const { entry } = forecast
  if (entry.status !== 'forecast') {
    return (
      <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-medium text-white ring-1 ring-inset ring-emerald-700">
        Qualified
      </span>
    )
  }
  const p = entry.p ?? 0
  const tier = chanceTier(p)
  return (
    <span className="flex items-center gap-2">
      <span className="text-xl font-semibold leading-none tabular-nums text-gray-900">{formatChance(p)}</span>
      <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset', TIER_PILL[tier])}>
        {TIER_LABEL[tier]}
      </span>
    </span>
  )
}

function CategoryForecast({ forecast, single }: { forecast: PlayerCategoryForecast; single: boolean }) {
  const { category, entry } = forecast
  const f = entry.factors
  const title = entry.p_junior_title ?? 0
  return (
    <div className="px-3 pt-3 sm:px-4">
      {single ? (
        <h3 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {entry.status === 'forecast' ? 'Factors' : CATEGORY_LABEL[category]}
        </h3>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-gray-900">{CATEGORY_LABEL[category]}</h3>
          <Chance forecast={forecast} />
        </div>
      )}
      {entry.status === 'forecast' ? (
        <div className="mt-1">
          <GapDriver forecast={forecast} />
          {f && <WeakestDriver f={f} />}
          {f && <PerformanceDriver f={f} />}
          {f && <EventsDriver f={f} />}
          {title >= 0.01 && <TitleDriver title={title} entryChance={entry.p_title_entry} />}
          {f && <BreakdownDriver f={f} p={entry.p ?? 0} />}
        </div>
      ) : (
        <p className="mt-0.5 pb-3 text-sm text-gray-700">
          {entry.status === 'kenya1' ? 'Qualifies automatically as Kenya #1.' : 'Qualified as national junior champion.'}
        </p>
      )}
    </div>
  )
}

export function QualificationForecastCard({ forecast }: { forecast: PlayerForecast }) {
  const [primary] = forecast.categories
  const single = forecast.categories.length === 1
  return (
    <section className="overflow-hidden rounded-lg border border-gray-200/60 bg-white/95 shadow-elevation-low sm:border-gray-200 sm:bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-gray-200/60 bg-gray-50/80 h-12 px-3 sm:border-gray-200 sm:bg-gray-50 sm:px-4">
        <p className="min-w-0 text-sm text-muted-foreground">After {forecast.afterEvent}</p>
        {single && <div className="shrink-0"><Chance forecast={primary} /></div>}
      </div>
      {forecast.categories.map((c, i) => (
        <Fragment key={c.category}>
          {i > 0 && <div className="h-2 border-y border-gray-200/60 bg-gray-50 sm:border-gray-200" aria-hidden />}
          <CategoryForecast forecast={c} single={single} />
        </Fragment>
      ))}
      {forecast.categories.some(c => c.entry.status === 'forecast') && (
        <p className="border-t border-gray-100 px-3 py-2 text-[11px] text-muted-foreground sm:px-4">
          From {forecast.sims.toLocaleString('en-US')} simulated seasons. Trust the tier more than the exact number.
        </p>
      )}
    </section>
  )
}
