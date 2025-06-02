'use client'

import { Button } from '@/components/ui/button'
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
    <Button
      onClick={handleExport}
      disabled={loading}
      size="sm"
      variant="outline"
      className={cn(
        "flex items-center gap-2 transition-all duration-200",
        "hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
    >
      <Download className={cn(
        "h-4 w-4",
        loading && "animate-bounce"
      )} />
      {loading ? (
        <span className="hidden sm:inline">Exporting...</span>
      ) : (
        children || <span className="hidden sm:inline">Export CSV</span>
      )}
    </Button>
  )
} 