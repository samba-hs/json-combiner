export interface FileInfo {
  filename: string
  rowCount: number
  error?: string
}

export interface FolderSummary {
  id: string
  label: string
  totalRows: number
  allColumns: string[]
}

export interface AddFolderResult extends FolderSummary {
  files: FileInfo[]
}

export interface RawColumnInfo {
  name: string
  folders: { id: string; label: string }[]
}

export interface OutputColumn {
  name: string
  sourceColumns: string[]
  isJoinKey: boolean
}

export interface PreviewData {
  rows: Record<string, unknown>[]
  totalRows: number
  page: number
  pageSize: number
  totalPages: number
}

export type ExportFormat = 'csv' | 'tsv' | 'json' | 'xlsx'
