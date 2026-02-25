import { readdir, readFile } from 'fs/promises'
import { join, basename } from 'path'

export interface LoadedFile {
  filename: string
  rowCount: number
  error?: string
}

export interface LoadResult {
  rows: Record<string, unknown>[]
  files: LoadedFile[]
  allColumns: string[]
}

export async function loadJsonFiles(folderPath: string): Promise<LoadResult> {
  const entries = await readdir(folderPath)
  const jsonFiles = entries.filter((f) => f.toLowerCase().endsWith('.json'))

  const rows: Record<string, unknown>[] = []
  const files: LoadedFile[] = []
  const columnSet = new Set<string>()

  for (const file of jsonFiles) {
    const filePath = join(folderPath, file)
    const sourceName = basename(file, '.json')

    try {
      const content = await readFile(filePath, 'utf-8')
      const parsed = JSON.parse(content)

      if (!Array.isArray(parsed)) {
        files.push({ filename: file, rowCount: 0, error: 'Not a JSON array' })
        continue
      }

      if (parsed.length === 0) {
        files.push({ filename: file, rowCount: 0, error: 'Empty array' })
        continue
      }

      for (const row of parsed) {
        if (typeof row === 'object' && row !== null) {
          const taggedRow = { ...row, source_file: sourceName }
          rows.push(taggedRow)
          for (const key of Object.keys(taggedRow)) {
            columnSet.add(key)
          }
        }
      }

      files.push({ filename: file, rowCount: parsed.length })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      files.push({ filename: file, rowCount: 0, error: message })
    }
  }

  return {
    rows,
    files,
    allColumns: Array.from(columnSet)
  }
}
