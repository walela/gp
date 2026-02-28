'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { SearchIcon, Loader2 } from 'lucide-react'

interface SearchFormProps {
  defaultValue?: string
}

export function SearchForm({ defaultValue = '' }: SearchFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [searchValue, setSearchValue] = useState(defaultValue)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    startTransition(() => {
      const params = new URLSearchParams(searchParams)
      if (searchValue.trim()) {
        params.set('q', searchValue.trim())
      } else {
        params.delete('q')
      }
      params.delete('page') // Reset to first page on new search
      
      router.push(`/rankings?${params.toString()}`)
    })
  }

  return (
    <div className="relative w-full sm:w-[350px]">
      <form onSubmit={handleSubmit} className="relative group">
        <Input
          type="search"
          name="q"
          placeholder="Search player list..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="h-11 rounded-md border-gray-200 bg-white/90 pr-12 shadow-sm transition-colors focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:ring-offset-0 focus-visible:border-blue-500"
        />
        <button
          type="submit"
          disabled={isPending}
          className="absolute right-1 top-1 bottom-1 inline-flex w-9 items-center justify-center rounded-md bg-slate-100 text-slate-600 transition-colors hover:bg-blue-100 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <SearchIcon className="h-4 w-4" />
          )}
        </button>
      </form>
    </div>
  )
} 