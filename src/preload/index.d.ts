interface FileInfo {
  filename: string
  rowCount: number
  error?: string
}

interface FolderSummary {
  id: string
  label: string
  folderPath: string
  totalRows: number
  allColumns: string[]
}

interface AddFolderResult extends FolderSummary {
  files: FileInfo[]
}

interface RawColumnInfo {
  name: string
  folders: { id: string; label: string }[]
}

interface OutputColumn {
  name: string
  sourceColumns: string[]
  isJoinKey: boolean
}

interface PreviewData {
  rows: Record<string, unknown>[]
  totalRows: number
  page: number
  pageSize: number
  totalPages: number
}

interface Api {
  selectFolders: () => Promise<string[]>
  getPathForFile: (file: File) => string
  addFolder: (folderPath: string) => Promise<AddFolderResult>
  removeFolder: (folderId: string) => Promise<boolean>
  getFolders: () => Promise<FolderSummary[]>
  getAllRawColumns: () => Promise<RawColumnInfo[]>
  executePipeline: (
    outputColumns: OutputColumn[]
  ) => Promise<{ totalRows: number; columns: string[] }>
  classifyRows: () => Promise<{
    totalRows: number
    columns: string[]
    adTypeSummary: Record<string, number>
  }>
  getPreviewData: (page: number, pageSize: number) => Promise<PreviewData>
  exportData: (format: 'csv' | 'tsv' | 'json' | 'xlsx') => Promise<string | null>
  resetAll: () => Promise<boolean>
}

declare global {
  interface Window {
    api: Api
  }
}
