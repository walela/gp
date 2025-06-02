'use client'

import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import { useState } from 'react'

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
      className={className}
    >
      <Download className="h-4 w-4 mr-2" />
      {loading ? 'Exporting...' : (children || 'Export CSV')}
    </Button>
  )
} 