import { getDisplayName, getMobileDisplayName } from '@/components/rankings/utils'

export function PlayerDisplayName({ name }: { name: string }) {
  return (
    <>
      <span className="sm:hidden">{getMobileDisplayName(name)}</span>
      <span className="hidden sm:inline">{getDisplayName(name)}</span>
    </>
  )
}
