'use client'

import { SegmentedControl } from '@/components/ui/segmented-control'

interface ViewSelectorProps {
  view: string
}

const viewOptions = [
  { value: 'best_1', label: 'Best TPR' },
  { value: 'best_2', label: 'Best 2' },
  { value: 'best_3', label: 'Best 3' },
  { value: 'best_4', label: 'Best 4' }
]

export function ViewSelector({ view }: ViewSelectorProps) {
  return (
    <div className="sm:hidden overflow-x-auto pb-2">
      <SegmentedControl
        value={view}
        options={viewOptions}
        onChange={value => {
          const url = new URL(window.location.href)
          url.searchParams.set('view', value)
          url.searchParams.set('sort', value)
          window.location.href = url.toString()
        }}
      />
    </div>
  )
}
