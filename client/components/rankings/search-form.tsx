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
          className="pr-16 pl-4 h-11 bg-white/80 backdrop-blur-sm border-gray-200 transition-all duration-200 shadow-sm hover:shadow-md group-focus-within:shadow-md rounded-l-[0.625rem]" 
        />
        <button 
          type="submit" 
          disabled={isPending}
          className="absolute right-0 top-0 h-full px-4 bg-gray-200 hover:bg-blue-100 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-l-none rounded-r-[0.625rem] transition-all duration-200 border border-l-0 border-gray-200"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 text-gray-600 animate-spin" />
          ) : (
            <SearchIcon className="h-4 w-4 text-gray-600" />
          )}
        </button>
      </form>
    </div>
  )
} 