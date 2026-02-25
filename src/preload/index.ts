import { contextBridge, ipcRenderer, webUtils } from 'electron'

const api = {
  selectFolders: (): Promise<string[]> => ipcRenderer.invoke('select-folders'),

  getPathForFile: (file: File): string => webUtils.getPathForFile(file),

  addFolder: (
    folderPath: string
  ): Promise<{
    id: string
    label: string
    folderPath: string
    files: { filename: string; rowCount: number; error?: string }[]
    totalRows: number
    allColumns: string[]
  }> => ipcRenderer.invoke('add-folder', folderPath),

  removeFolder: (folderId: string): Promise<boolean> =>
    ipcRenderer.invoke('remove-folder', folderId),

  getFolders: (): Promise<FolderSummary[]> => ipcRenderer.invoke('get-folders'),

  getAllRawColumns: (): Promise<RawColumnInfo[]> => ipcRenderer.invoke('get-all-raw-columns'),

  executePipeline: (
    outputColumns: OutputColumn[]
  ): Promise<{ totalRows: number; columns: string[] }> =>
    ipcRenderer.invoke('execute-pipeline', outputColumns),

  classifyRows: (): Promise<{
    totalRows: number
    columns: string[]
    adTypeSummary: Record<string, number>
  }> => ipcRenderer.invoke('classify-rows'),

  getPreviewData: (page: number, pageSize: number): Promise<PreviewData> =>
    ipcRenderer.invoke('get-preview-data', page, pageSize),

  exportData: (format: 'csv' | 'tsv' | 'json' | 'xlsx'): Promise<string | null> =>
    ipcRenderer.invoke('export-data', format),

  resetAll: (): Promise<boolean> => ipcRenderer.invoke('reset-all')
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.api = api
}
