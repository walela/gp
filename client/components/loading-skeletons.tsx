import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

function Bone({ className }: { className?: string }) {
  return <Skeleton className={cn('bg-gray-200/80 motion-reduce:animate-none', className)} />
}

function TableCard({ rows }: { rows: number }) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200/60 bg-white/95 shadow-elevation-low sm:border-gray-200">
      <div className="flex h-12 items-center gap-4 border-b border-gray-200 bg-gray-50 px-3 sm:px-4">
        <Bone className="h-3 w-24" />
        <Bone className="ml-auto h-3 w-12" />
        <Bone className="h-3 w-12" />
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex h-13 items-center gap-4 border-b border-gray-200 px-3 last:border-b-0 odd:bg-white even:bg-gray-200/50 sm:h-14 sm:px-4">
          <Bone className="h-4 w-40 max-w-[50%]" />
          <Bone className="ml-auto h-4 w-10" />
          <Bone className="h-4 w-10" />
        </div>
      ))}
    </div>
  )
}

export function TablePageSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      <div className="flex items-center justify-between gap-3">
        <Bone className="h-7 w-48" />
        <Bone className="h-9 w-28" />
      </div>
      <TableCard rows={10} />
    </div>
  )
}

export function PlayerPageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-3 py-2" aria-busy="true" aria-label="Loading">
      <div className="flex justify-end">
        <Bone className="h-9 w-28" />
      </div>
      <div className="overflow-hidden rounded-lg border border-gray-200/60 bg-white/95 shadow-elevation-low sm:border-gray-200">
        <div className="space-y-2 border-b border-gray-200 bg-gray-50 px-3 py-3 sm:px-4 sm:py-4">
          <Bone className="h-6 w-52" />
          <Bone className="h-4 w-32" />
        </div>
        <div className="grid grid-cols-3 gap-2.5 p-2.5 sm:grid-cols-5 sm:gap-4 sm:p-4">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="flex flex-col items-center gap-2 rounded border border-gray-100 bg-white px-2.5 py-3">
              <Bone className="h-3 w-12" />
              <Bone className="h-5 w-14" />
            </div>
          ))}
        </div>
      </div>
      <Bone className="h-6 w-44" />
      <TableCard rows={5} />
    </div>
  )
}
