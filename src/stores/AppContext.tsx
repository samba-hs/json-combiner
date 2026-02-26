import React, { createContext, useContext, useRef, useCallback, type ReactNode } from 'react'
import { loadJsonFiles } from '../lib/file-loader'
import { exportData as doExport } from '../lib/exporter'
import { classifyRows, getAdTypeSummary } from '../lib/ad-type-classifier'
import {
  executeJoin,
  getAllRawColumns,
  getColumnPresence,
  type FolderData,
  type OutputColumn
} from '../lib/joiner'
import type {
  AddFolderResult,
  RawColumnInfo,
  PreviewData,
  ExportFormat
} from '../lib/types'

interface AppContextValue {
  addFolder: (label: string, files: File[]) => Promise<AddFolderResult>
  removeFolder: (folderId: string) => void
  getFolders: () => { id: string; label: string; totalRows: number; allColumns: string[] }[]
  getAllRawColumns: () => RawColumnInfo[]
  executePipeline: (outputColumns: OutputColumn[]) => { totalRows: number; columns: string[] }
  classifyRows: () => {
    totalRows: number
    columns: string[]
    adTypeSummary: Record<string, number>
  }
  getPreviewData: (page: number, pageSize: number) => PreviewData
  exportData: (format: ExportFormat, filename: string) => Promise<void>
  resetAll: () => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}

export function AppProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const foldersRef = useRef(new Map<string, FolderData>())
  const nextIdRef = useRef(1)
  const currentOutputColumnsRef = useRef<OutputColumn[]>([])
  const currentJoinedRowsRef = useRef<Record<string, unknown>[]>([])
  const currentClassifiedRowsRef = useRef<Record<string, unknown>[]>([])

  const addFolder = useCallback(async (label: string, files: File[]): Promise<AddFolderResult> => {
    const loadResult = await loadJsonFiles(files)
    const id = String(nextIdRef.current++)

    const folder: FolderData = {
      id,
      label,
      folderPath: '',
      rows: loadResult.rows,
      allColumns: loadResult.allColumns
    }

    foldersRef.current.set(id, folder)

    return {
      id,
      label,
      files: loadResult.files,
      totalRows: loadResult.rows.length,
      allColumns: loadResult.allColumns
    }
  }, [])

  const removeFolder = useCallback((folderId: string) => {
    foldersRef.current.delete(folderId)
  }, [])

  const getFolders = useCallback(() => {
    return Array.from(foldersRef.current.values()).map((f) => ({
      id: f.id,
      label: f.label,
      totalRows: f.rows.length,
      allColumns: f.allColumns
    }))
  }, [])

  const getAllRawColumnsCtx = useCallback((): RawColumnInfo[] => {
    const allFolders = Array.from(foldersRef.current.values())
    const rawColumns = getAllRawColumns(allFolders)
    return rawColumns.map((col) => ({
      name: col,
      folders: getColumnPresence(col, allFolders)
    }))
  }, [])

  const executePipeline = useCallback(
    (outputColumns: OutputColumn[]): { totalRows: number; columns: string[] } => {
      const allFolders = Array.from(foldersRef.current.values())
      if (allFolders.length === 0) throw new Error('No folders loaded')

      currentOutputColumnsRef.current = outputColumns
      currentJoinedRowsRef.current = executeJoin(allFolders, outputColumns)
      currentClassifiedRowsRef.current = []

      const columnSet = new Set<string>()
      for (const row of currentJoinedRowsRef.current) {
        for (const key of Object.keys(row)) {
          columnSet.add(key)
        }
      }

      return {
        totalRows: currentJoinedRowsRef.current.length,
        columns: Array.from(columnSet)
      }
    },
    []
  )

  const classifyRowsCtx = useCallback(() => {
    if (currentJoinedRowsRef.current.length === 0) throw new Error('No data to classify')

    currentClassifiedRowsRef.current = classifyRows(currentJoinedRowsRef.current)
    const summary = getAdTypeSummary(currentClassifiedRowsRef.current)

    const columnSet = new Set<string>()
    for (const row of currentClassifiedRowsRef.current) {
      for (const key of Object.keys(row)) {
        columnSet.add(key)
      }
    }

    return {
      totalRows: currentClassifiedRowsRef.current.length,
      columns: Array.from(columnSet),
      adTypeSummary: summary
    }
  }, [])

  const getPreviewData = useCallback((page: number, pageSize: number): PreviewData => {
    const start = page * pageSize
    const end = start + pageSize
    const rows = currentClassifiedRowsRef.current.slice(start, end)

    return {
      rows,
      totalRows: currentClassifiedRowsRef.current.length,
      page,
      pageSize,
      totalPages: Math.ceil(currentClassifiedRowsRef.current.length / pageSize)
    }
  }, [])

  const exportDataCtx = useCallback(async (format: ExportFormat, filename: string) => {
    if (currentClassifiedRowsRef.current.length === 0) throw new Error('No data to export')
    await doExport(currentClassifiedRowsRef.current, format, filename)
  }, [])

  const resetAll = useCallback(() => {
    foldersRef.current.clear()
    nextIdRef.current = 1
    currentOutputColumnsRef.current = []
    currentJoinedRowsRef.current = []
    currentClassifiedRowsRef.current = []
  }, [])

  const value: AppContextValue = {
    addFolder,
    removeFolder,
    getFolders,
    getAllRawColumns: getAllRawColumnsCtx,
    executePipeline,
    classifyRows: classifyRowsCtx,
    getPreviewData,
    exportData: exportDataCtx,
    resetAll
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
