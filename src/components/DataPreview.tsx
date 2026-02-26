import React, { useState, useEffect, useCallback } from 'react'
import { useApp } from '../stores/AppContext'

interface Props {
  adTypeSummary: Record<string, number>
  columns: string[]
  totalRows: number
}

const PAGE_SIZE = 50

export default function DataPreview({ adTypeSummary, columns, totalRows }: Props): React.JSX.Element {
  const app = useApp()
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [showSummary, setShowSummary] = useState(false)

  const loadPage = useCallback(
    (p: number) => {
      setLoading(true)
      try {
        const result = app.getPreviewData(p, PAGE_SIZE)
        setRows(result.rows)
        setTotalPages(result.totalPages)
        setPage(result.page)
      } finally {
        setLoading(false)
      }
    },
    [app]
  )

  useEffect(() => {
    loadPage(0)
  }, [loadPage])

  const sortedSummary = Object.entries(adTypeSummary).sort((a, b) => b[1] - a[1])

  return (
    <div className="flex flex-col gap-4 w-full max-w-5xl">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-100">Preview & Classify</h2>
        <div className="flex items-center gap-3">
          <span className="text-gray-400 text-sm">
            {totalRows.toLocaleString()} rows, {columns.length} columns
          </span>
          <button
            onClick={() => setShowSummary(!showSummary)}
            className="text-sm text-blue-400 hover:text-blue-300 underline"
          >
            {showSummary ? 'Hide' : 'Show'} Ad Type Summary
          </button>
        </div>
      </div>

      {showSummary && (
        <div className="bg-gray-800 rounded-lg p-4 max-h-60 overflow-y-auto">
          <h3 className="text-sm font-medium text-gray-300 mb-2">
            Ad Type Distribution ({sortedSummary.length} categories)
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-1">
            {sortedSummary.map(([adType, count]) => (
              <div key={adType} className="flex justify-between text-xs px-2 py-1">
                <span className="text-gray-300 truncate mr-2">{adType}</span>
                <span className="text-gray-500 shrink-0">{count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-xs">
            <thead className="bg-gray-700 sticky top-0">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col}
                    className={`text-left px-3 py-2 text-gray-300 whitespace-nowrap ${
                      col === 'Ad Type' ? 'bg-blue-900/40' : ''
                    }`}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={columns.length} className="text-center py-8 text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                      Loading...
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((row, i) => (
                  <tr
                    key={`${page}-${i}`}
                    className="border-t border-gray-700 hover:bg-gray-750"
                  >
                    {columns.map((col) => (
                      <td
                        key={col}
                        className={`px-3 py-1.5 text-gray-400 whitespace-nowrap max-w-[200px] truncate ${
                          col === 'Ad Type' ? 'text-blue-300 font-medium bg-blue-900/20' : ''
                        }`}
                        title={String(row[col] ?? '')}
                      >
                        {String(row[col] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 bg-gray-700/50 border-t border-gray-700">
          <button
            onClick={() => loadPage(page - 1)}
            disabled={page === 0 || loading}
            className="text-sm text-gray-300 hover:text-white disabled:text-gray-600 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>
          <span className="text-sm text-gray-400">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => loadPage(page + 1)}
            disabled={page >= totalPages - 1 || loading}
            className="text-sm text-gray-300 hover:text-white disabled:text-gray-600 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  )
}
