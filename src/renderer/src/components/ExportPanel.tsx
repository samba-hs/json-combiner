import { useState } from 'react'

type ExportFormat = 'csv' | 'tsv' | 'json' | 'xlsx'

interface Props {
  totalRows: number
}

const FORMATS: { value: ExportFormat; label: string; desc: string }[] = [
  { value: 'csv', label: 'CSV', desc: 'Comma-separated values' },
  { value: 'tsv', label: 'TSV', desc: 'Tab-separated values' },
  { value: 'json', label: 'JSON', desc: 'JSON array of objects' },
  { value: 'xlsx', label: 'Excel', desc: 'Excel workbook (.xlsx)' }
]

export default function ExportPanel({ totalRows }: Props): JSX.Element {
  const [format, setFormat] = useState<ExportFormat>('csv')
  const [exporting, setExporting] = useState(false)
  const [result, setResult] = useState<{ path: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleExport = async (): Promise<void> => {
    setExporting(true)
    setError(null)
    setResult(null)
    try {
      const filePath = await window.api.exportData(format)
      if (filePath) {
        setResult({ path: filePath })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-lg">
      <h2 className="text-2xl font-bold text-gray-100">Export Data</h2>
      <p className="text-gray-400 text-center">
        Export {totalRows.toLocaleString()} rows with Ad Type classifications.
      </p>

      <div className="grid grid-cols-2 gap-3 w-full">
        {FORMATS.map((f) => (
          <button
            key={f.value}
            onClick={() => {
              setFormat(f.value)
              setResult(null)
            }}
            className={`
              p-4 rounded-lg border-2 text-left transition-colors
              ${
                format === f.value
                  ? 'border-blue-500 bg-blue-900/30'
                  : 'border-gray-700 bg-gray-800 hover:border-gray-500'
              }
            `}
          >
            <div className="font-bold text-gray-200">{f.label}</div>
            <div className="text-xs text-gray-400 mt-1">{f.desc}</div>
          </button>
        ))}
      </div>

      <button
        onClick={handleExport}
        disabled={exporting}
        className="bg-green-600 hover:bg-green-500 disabled:bg-gray-600 text-white px-8 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 text-lg"
      >
        {exporting ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Exporting...
          </>
        ) : (
          <>Save as {FORMATS.find((f) => f.value === format)?.label}</>
        )}
      </button>

      {result && (
        <div className="bg-green-900/40 border border-green-700 text-green-300 px-4 py-3 rounded-lg w-full">
          <div className="font-medium mb-1">Export successful!</div>
          <div className="font-mono text-xs text-green-400 break-all">{result.path}</div>
        </div>
      )}

      {error && (
        <div className="bg-red-900/40 border border-red-700 text-red-300 px-4 py-3 rounded-lg w-full">
          {error}
        </div>
      )}
    </div>
  )
}
