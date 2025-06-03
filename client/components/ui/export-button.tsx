'use client'

import { Download } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface ExportButtonProps {
  url: string
  filename?: string
  className?: string
  children?: React.ReactNode
}

export function ExportButton({ url, filename, className, children }: ExportButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleExport = async () => {
    setLoading(true)
    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error('Export failed')
      
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = filename || 'export.csv'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(downloadUrl)
    } catch (error) {
      console.error('Export error:', error)
      alert('Failed to export data')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className={cn(
        "group relative inline-flex items-center justify-center gap-2 rounded-lg",
        "hidden sm:inline-flex",
        "px-3 py-2 sm:px-4",
        "bg-gradient-to-b from-blue-500 to-blue-600 text-white",
        "shadow-lg shadow-blue-500/25",
        "hover:from-blue-600 hover:to-blue-700 hover:shadow-xl hover:shadow-blue-500/30",
        "active:from-blue-700 active:to-blue-600 active:shadow-md",
        "disabled:from-gray-400 disabled:to-gray-500 disabled:shadow-none disabled:cursor-not-allowed",
        "transition-all duration-200 ease-out",
        "font-medium text-sm",
        "border border-blue-600",
        className
      )}
      title="Export data as CSV"
    >
      <Download className={cn(
        "h-4 w-4 transition-transform duration-200",
        "group-hover:scale-110",
        loading && "animate-bounce"
      )} />
      {loading ? (
        <span className="hidden sm:inline">Exporting...</span>
      ) : (
        children || <span className="hidden sm:inline">Export CSV</span>
      )}
      {/* Shine effect */}
      <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="absolute inset-0 rounded-lg bg-gradient-to-t from-transparent via-white/10 to-transparent"></div>
      </div>
    </button>
  )
} 