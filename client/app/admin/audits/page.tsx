import Link from 'next/link'
import { BarChart3, ChevronRight } from 'lucide-react'

export default function AdminAuditsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Audits</h1>
        <p className="mt-1 text-sm text-gray-600">
          Admin comparison tools for checking external standings against the tracker.
        </p>
      </div>

      <Link
        href="/admin/audits/chess-kenya-open-2026"
        className="group block max-w-2xl border-2 border-black bg-white p-5 transition-colors hover:bg-gray-50">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex size-9 items-center justify-center border-2 border-black bg-black text-white">
              <BarChart3 className="size-4" />
            </div>
            <div>
              <h2 className="font-bold">Chess Kenya 2026 standings</h2>
              <p className="mt-1 text-sm text-gray-600">
                Compare Chess Kenya Open and Ladies CSVs against eligible tracker results.
              </p>
            </div>
          </div>
          <ChevronRight className="size-5 shrink-0 text-gray-400 transition-transform group-hover:translate-x-0.5 group-hover:text-black" />
        </div>
        <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-200 pt-4">
          {['Event TPR checks', 'Identity checks', 'Ranking summaries'].map(tag => (
            <span key={tag} className="border border-gray-300 bg-gray-50 px-2 py-1 text-xs font-medium text-gray-700">
              {tag}
            </span>
          ))}
        </div>
      </Link>
    </div>
  )
}
