import React, { useState, useCallback } from 'react'
import { useApp } from './stores/AppContext'
import FolderPicker from './components/FolderPicker'
import OutputColumnBuilder from './components/OutputColumnBuilder'
import DataPreview from './components/DataPreview'
import ExportPanel from './components/ExportPanel'
import type { FileInfo } from './lib/types'

const STEPS = ['Load Folders', 'Define Columns & Join', 'Preview & Classify', 'Export']

interface LoadedFolder {
  id: string
  label: string
  files: FileInfo[]
  totalRows: number
  allColumns: string[]
}

function App(): React.JSX.Element {
  const app = useApp()
  const [step, setStep] = useState(0)
  const [folders, setFolders] = useState<LoadedFolder[]>([])

  const [classifyResult, setClassifyResult] = useState<{
    totalRows: number
    columns: string[]
    adTypeSummary: Record<string, number>
  } | null>(null)
  const [classifying, setClassifying] = useState(false)

  const handleFoldersChanged = useCallback((updated: LoadedFolder[]) => {
    setFolders(updated)
  }, [])

  const handlePipelineExecuted = useCallback(
    (_result: { totalRows: number; columns: string[] }) => {
      setClassifying(true)
      setStep(2)
      try {
        const classified = app.classifyRows()
        setClassifyResult(classified)
      } catch (err) {
        console.error('Classification failed:', err)
      } finally {
        setClassifying(false)
      }
    },
    [app]
  )

  const handleReset = (): void => {
    app.resetAll()
    setStep(0)
    setFolders([])
    setClassifyResult(null)
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col">
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto w-full">
          <h1 className="text-xl font-bold">JSON Combiner</h1>
          {step > 0 && (
            <button onClick={handleReset} className="text-sm text-gray-400 hover:text-gray-200">
              Start Over
            </button>
          )}
        </div>
      </header>

      <nav className="bg-gray-800/50 border-b border-gray-700 px-6 py-3">
        <div className="flex items-center gap-1 max-w-6xl mx-auto w-full overflow-x-auto">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center shrink-0">
              {i > 0 && <div className="w-6 h-px bg-gray-700 mx-1" />}
              <button
                onClick={() => {
                  if (i < step) setStep(i)
                }}
                disabled={i > step}
                className={`
                  flex items-center gap-1.5 px-3 py-1 rounded-full text-xs transition-colors
                  ${
                    i === step
                      ? 'bg-blue-600 text-white'
                      : i < step
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 cursor-pointer'
                        : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                  }
                `}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                    i < step ? 'bg-green-500 text-white' : 'bg-gray-600 text-gray-300'
                  }`}
                >
                  {i < step ? '\u2713' : i + 1}
                </span>
                {label}
              </button>
            </div>
          ))}
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center px-6 py-8 overflow-y-auto">
        {step === 0 && (
          <div className="flex flex-col items-center gap-6 w-full max-w-2xl">
            <FolderPicker folders={folders} onFoldersChanged={handleFoldersChanged} />
            {folders.length >= 2 && (
              <button
                onClick={() => setStep(1)}
                className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-2.5 rounded-lg font-medium transition-colors"
              >
                Define Output Columns
              </button>
            )}
            {folders.length === 1 && (
              <p className="text-gray-500 text-sm">Add at least 2 folders to join.</p>
            )}
          </div>
        )}

        {step === 1 && <OutputColumnBuilder onExecute={handlePipelineExecuted} />}

        {step === 2 && (
          <>
            {classifying ? (
              <div className="flex items-center gap-3 text-gray-400">
                <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                Coalescing, joining, and classifying...
              </div>
            ) : classifyResult ? (
              <div className="flex flex-col items-center gap-6 w-full">
                <DataPreview
                  adTypeSummary={classifyResult.adTypeSummary}
                  columns={classifyResult.columns}
                  totalRows={classifyResult.totalRows}
                />
                <button
                  onClick={() => setStep(3)}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-2.5 rounded-lg font-medium transition-colors"
                >
                  Continue to Export
                </button>
              </div>
            ) : (
              <div className="text-red-400">Classification failed. Go back and try again.</div>
            )}
          </>
        )}

        {step === 3 && classifyResult && <ExportPanel totalRows={classifyResult.totalRows} />}
      </main>
    </div>
  )
}

export default App
