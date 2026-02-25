import { ipcMain, dialog, BrowserWindow } from 'electron'
import { loadJsonFiles } from './file-loader'
import { classifyRows, getAdTypeSummary } from './ad-type-classifier'
import { exportData, type ExportFormat } from './exporter'
import {
  executeJoin,
  getAllRawColumns,
  getColumnPresence,
  type FolderData,
  type OutputColumn
} from './joiner'

// In-memory state
const folders = new Map<string, FolderData>()
let nextFolderId = 1
let currentOutputColumns: OutputColumn[] = []
let currentJoinedRows: Record<string, unknown>[] = []
let currentClassifiedRows: Record<string, unknown>[] = []

export function registerIpcHandlers(): void {
  ipcMain.handle('select-folders', async () => {
    const window = BrowserWindow.getFocusedWindow()
    if (!window) return []

    const result = await dialog.showOpenDialog(window, {
      properties: ['openDirectory', 'multiSelections'],
      title: 'Select folders containing JSON files'
    })

    if (result.canceled || result.filePaths.length === 0) return []
    return result.filePaths
  })

  ipcMain.handle('add-folder', async (_event, folderPath: string) => {
    const loadResult = await loadJsonFiles(folderPath)
    const id = String(nextFolderId++)
    const label = folderPath.split('/').pop() || folderPath.split('\\').pop() || `Folder ${id}`

    const folder: FolderData = {
      id,
      folderPath,
      label,
      rows: loadResult.rows,
      allColumns: loadResult.allColumns
    }

    folders.set(id, folder)

    return {
      id,
      label,
      folderPath,
      files: loadResult.files,
      totalRows: loadResult.rows.length,
      allColumns: loadResult.allColumns
    }
  })

  ipcMain.handle('remove-folder', (_event, folderId: string) => {
    folders.delete(folderId)
    return true
  })

  ipcMain.handle('get-folders', () => {
    return Array.from(folders.values()).map((f) => ({
      id: f.id,
      label: f.label,
      folderPath: f.folderPath,
      totalRows: f.rows.length,
      allColumns: f.allColumns
    }))
  })

  // Get all unique raw column names across all loaded folders
  ipcMain.handle('get-all-raw-columns', () => {
    const allFolders = Array.from(folders.values())
    const rawColumns = getAllRawColumns(allFolders)
    // For each raw column, include which folders have it
    return rawColumns.map((col) => ({
      name: col,
      folders: getColumnPresence(col, allFolders)
    }))
  })

  // Save output column definitions and execute coalesce + join
  ipcMain.handle('execute-pipeline', (_event, outputColumns: OutputColumn[]) => {
    const allFolders = Array.from(folders.values())
    if (allFolders.length === 0) throw new Error('No folders loaded')

    currentOutputColumns = outputColumns
    currentJoinedRows = executeJoin(allFolders, outputColumns)
    currentClassifiedRows = []

    const columnSet = new Set<string>()
    for (const row of currentJoinedRows) {
      for (const key of Object.keys(row)) {
        columnSet.add(key)
      }
    }

    return {
      totalRows: currentJoinedRows.length,
      columns: Array.from(columnSet)
    }
  })

  ipcMain.handle('classify-rows', () => {
    if (currentJoinedRows.length === 0) throw new Error('No data to classify')

    currentClassifiedRows = classifyRows(currentJoinedRows)
    const summary = getAdTypeSummary(currentClassifiedRows)

    const columnSet = new Set<string>()
    for (const row of currentClassifiedRows) {
      for (const key of Object.keys(row)) {
        columnSet.add(key)
      }
    }

    return {
      totalRows: currentClassifiedRows.length,
      columns: Array.from(columnSet),
      adTypeSummary: summary
    }
  })

  ipcMain.handle('get-preview-data', (_event, page: number, pageSize: number) => {
    const start = page * pageSize
    const end = start + pageSize
    const rows = currentClassifiedRows.slice(start, end)

    return {
      rows,
      totalRows: currentClassifiedRows.length,
      page,
      pageSize,
      totalPages: Math.ceil(currentClassifiedRows.length / pageSize)
    }
  })

  ipcMain.handle('export-data', async (_event, format: ExportFormat) => {
    if (currentClassifiedRows.length === 0) throw new Error('No data to export')

    const window = BrowserWindow.getFocusedWindow()
    if (!window) throw new Error('No active window')

    const extensions: Record<ExportFormat, string[]> = {
      csv: ['csv'],
      tsv: ['tsv', 'txt'],
      json: ['json'],
      xlsx: ['xlsx']
    }
    const formatNames: Record<ExportFormat, string> = {
      csv: 'CSV',
      tsv: 'TSV',
      json: 'JSON',
      xlsx: 'Excel'
    }

    const result = await dialog.showSaveDialog(window, {
      title: `Export as ${formatNames[format]}`,
      defaultPath: `combined_data.${extensions[format][0]}`,
      filters: [{ name: formatNames[format], extensions: extensions[format] }]
    })

    if (result.canceled || !result.filePath) return null
    await exportData(currentClassifiedRows, result.filePath, format)
    return result.filePath
  })

  ipcMain.handle('reset-all', () => {
    folders.clear()
    nextFolderId = 1
    currentOutputColumns = []
    currentJoinedRows = []
    currentClassifiedRows = []
    return true
  })
}
