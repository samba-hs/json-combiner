import React, { useState, useEffect, useMemo } from 'react'
import { useApp } from '../stores/AppContext'
import type { RawColumnInfo, OutputColumn } from '../lib/types'

interface Props {
  onExecute: (result: { totalRows: number; columns: string[] }) => void
}

export default function OutputColumnBuilder({ onExecute }: Props): React.JSX.Element {
  const app = useApp()
  const [rawColumns, setRawColumns] = useState<RawColumnInfo[]>([])
  const [outputColumns, setOutputColumns] = useState<OutputColumn[]>([])
  const [loading, setLoading] = useState(true)
  const [executing, setExecuting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // New output column form
  const [newName, setNewName] = useState('')

  useEffect(() => {
    try {
      const cols = app.getAllRawColumns()
      setRawColumns(cols)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load columns')
    } finally {
      setLoading(false)
    }
  }, [app])

  // Raw columns not yet assigned to any output column
  const unassignedRawColumns = useMemo(() => {
    const assigned = new Set(outputColumns.flatMap((oc) => oc.sourceColumns))
    return rawColumns.filter((rc) => !assigned.has(rc.name))
  }, [rawColumns, outputColumns])

  const addOutputColumn = (): void => {
    const name = newName.trim()
    if (!name) return
    if (outputColumns.some((oc) => oc.name === name)) return
    setOutputColumns((prev) => [...prev, { name, sourceColumns: [], isJoinKey: false }])
    setNewName('')
  }

  const removeOutputColumn = (index: number): void => {
    setOutputColumns((prev) => prev.filter((_, i) => i !== index))
  }

  const toggleSourceColumn = (outputIndex: number, rawName: string): void => {
    setOutputColumns((prev) => {
      const updated = [...prev]
      const oc = { ...updated[outputIndex] }
      if (oc.sourceColumns.includes(rawName)) {
        oc.sourceColumns = oc.sourceColumns.filter((s) => s !== rawName)
      } else {
        oc.sourceColumns = [...oc.sourceColumns, rawName]
      }
      updated[outputIndex] = oc
      return updated
    })
  }

  const toggleJoinKey = (index: number): void => {
    setOutputColumns((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], isJoinKey: !updated[index].isJoinKey }
      return updated
    })
  }

  const moveSource = (outputIndex: number, srcIndex: number, direction: -1 | 1): void => {
    setOutputColumns((prev) => {
      const updated = [...prev]
      const oc = { ...updated[outputIndex] }
      const sources = [...oc.sourceColumns]
      const newIndex = srcIndex + direction
      if (newIndex < 0 || newIndex >= sources.length) return prev
      ;[sources[srcIndex], sources[newIndex]] = [sources[newIndex], sources[srcIndex]]
      oc.sourceColumns = sources
      updated[outputIndex] = oc
      return updated
    })
  }

  const handleExecute = async (): Promise<void> => {
    setExecuting(true)
    setError(null)
    try {
      const result = app.executePipeline(outputColumns)
      onExecute(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pipeline failed')
    } finally {
      setExecuting(false)
    }
  }

  const hasJoinKeys = outputColumns.some((oc) => oc.isJoinKey)
  const allHaveSources = outputColumns.every((oc) => oc.sourceColumns.length > 0)
  const canExecute = outputColumns.length > 0 && hasJoinKeys && allHaveSources

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-400">
        <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        Loading columns...
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 w-full max-w-5xl">
      <div>
        <h2 className="text-2xl font-bold text-gray-100">Define Output Columns</h2>
        <p className="text-gray-400 text-sm mt-1">
          Create your final columns and pick which raw columns to coalesce into each. First non-null
          value wins (priority = top to bottom).
        </p>
      </div>

      <div className="flex gap-5">
        {/* Left: Output columns */}
        <div className="flex-1 min-w-0">
          {/* Add new output column */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addOutputColumn()}
              placeholder="New column name (e.g. final_channel)"
              className="flex-1 bg-gray-800 text-gray-200 rounded-lg px-3 py-2 text-sm border border-gray-600 focus:border-blue-500 focus:outline-none"
            />
            <button
              onClick={addOutputColumn}
              disabled={!newName.trim() || outputColumns.some((oc) => oc.name === newName.trim())}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Add
            </button>
          </div>

          {outputColumns.length === 0 ? (
            <div className="bg-gray-800 rounded-lg p-8 text-center text-gray-500">
              No output columns yet. Add one above to get started.
            </div>
          ) : (
            <div className="space-y-3">
              {outputColumns.map((oc, oi) => (
                <div
                  key={oc.name}
                  className={`bg-gray-800 rounded-lg overflow-hidden border ${
                    oc.isJoinKey ? 'border-green-700/50' : 'border-gray-700'
                  }`}
                >
                  <div className="px-4 py-2 bg-gray-700/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-gray-200 font-medium">{oc.name}</span>
                      <button
                        onClick={() => toggleJoinKey(oi)}
                        className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
                          oc.isJoinKey
                            ? 'bg-green-800 text-green-300'
                            : 'bg-gray-600 text-gray-400 hover:bg-gray-500'
                        }`}
                      >
                        {oc.isJoinKey ? 'Join Key' : 'Set as Join Key'}
                      </button>
                      <span className="text-xs text-gray-500">
                        {oc.sourceColumns.length} source{oc.sourceColumns.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <button
                      onClick={() => removeOutputColumn(oi)}
                      className="text-gray-500 hover:text-red-400 p-1"
                      title="Remove"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>

                  {/* Assigned source columns with priority ordering */}
                  {oc.sourceColumns.length > 0 && (
                    <div className="px-4 py-2 space-y-1">
                      {oc.sourceColumns.map((src, si) => {
                        const info = rawColumns.find((r) => r.name === src)
                        return (
                          <div
                            key={src}
                            className="flex items-center gap-2 text-xs bg-gray-700/50 rounded px-2 py-1"
                          >
                            <span className="text-gray-500 w-4 text-right">{si + 1}.</span>
                            <span className="text-gray-300 font-mono flex-1 truncate">{src}</span>
                            <span className="text-gray-600 shrink-0">
                              {info?.folders.map((f) => f.label).join(', ')}
                            </span>
                            <button
                              onClick={() => moveSource(oi, si, -1)}
                              disabled={si === 0}
                              className="text-gray-500 hover:text-gray-300 disabled:text-gray-700"
                              title="Move up (higher priority)"
                            >
                              ↑
                            </button>
                            <button
                              onClick={() => moveSource(oi, si, 1)}
                              disabled={si === oc.sourceColumns.length - 1}
                              className="text-gray-500 hover:text-gray-300 disabled:text-gray-700"
                              title="Move down (lower priority)"
                            >
                              ↓
                            </button>
                            <button
                              onClick={() => toggleSourceColumn(oi, src)}
                              className="text-gray-500 hover:text-red-400"
                              title="Remove"
                            >
                              ×
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {oc.sourceColumns.length === 0 && (
                    <div className="px-4 py-3 text-xs text-gray-500">
                      Click raw columns on the right to add sources →
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Available raw columns */}
        <div className="w-72 shrink-0">
          <div className="bg-gray-800 rounded-lg overflow-hidden sticky top-0">
            <div className="px-3 py-2 bg-gray-700/50 text-sm font-medium text-gray-300">
              Available Raw Columns ({unassignedRawColumns.length})
            </div>
            <div className="max-h-[500px] overflow-y-auto">
              {rawColumns.map((rc) => {
                // Find which output column (if any) this raw column is assigned to
                const assignedTo = outputColumns.find((oc) => oc.sourceColumns.includes(rc.name))
                const isAssigned = !!assignedTo

                return (
                  <div
                    key={rc.name}
                    className={`px-3 py-1.5 border-t border-gray-700 flex items-center gap-2 ${
                      isAssigned ? 'opacity-40' : ''
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-gray-300 font-mono truncate" title={rc.name}>
                        {rc.name}
                      </div>
                      <div className="text-xs text-gray-600 truncate">
                        {rc.folders.map((f) => f.label).join(', ')}
                      </div>
                    </div>
                    {isAssigned ? (
                      <span className="text-xs text-gray-500 shrink-0">
                        → {assignedTo.name}
                      </span>
                    ) : (
                      outputColumns.length > 0 && (
                        <div className="flex gap-1 shrink-0">
                          {outputColumns.map((oc, oi) => (
                            <button
                              key={oc.name}
                              onClick={() => toggleSourceColumn(oi, rc.name)}
                              className="bg-gray-700 hover:bg-blue-600 text-gray-400 hover:text-white text-xs px-1.5 py-0.5 rounded transition-colors"
                              title={`Add to "${oc.name}"`}
                            >
                              +{oc.name.length > 8 ? oc.name.slice(0, 8) + '…' : oc.name}
                            </button>
                          ))}
                        </div>
                      )
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/40 border border-red-700 text-red-300 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {!hasJoinKeys && outputColumns.length > 0 && (
        <div className="bg-yellow-900/30 border border-yellow-700 text-yellow-300 px-4 py-3 rounded-lg text-sm">
          Mark at least one output column as a join key.
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={handleExecute}
          disabled={executing || !canExecute}
          className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 text-white px-8 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          {executing && (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          Run Coalesce & Join
        </button>
      </div>
    </div>
  )
}
