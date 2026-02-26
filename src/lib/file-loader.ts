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

export async function loadJsonFiles(files: File[]): Promise<LoadResult> {
  const jsonFiles = files.filter((f) => f.name.toLowerCase().endsWith('.json'))

  const rows: Record<string, unknown>[] = []
  const loadedFiles: LoadedFile[] = []
  const columnSet = new Set<string>()

  for (const file of jsonFiles) {
    const sourceName = file.name.replace(/\.json$/i, '')

    try {
      const content = await file.text()
      const parsed = JSON.parse(content)

      if (!Array.isArray(parsed)) {
        loadedFiles.push({ filename: file.name, rowCount: 0, error: 'Not a JSON array' })
        continue
      }

      if (parsed.length === 0) {
        loadedFiles.push({ filename: file.name, rowCount: 0, error: 'Empty array' })
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

      loadedFiles.push({ filename: file.name, rowCount: parsed.length })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      loadedFiles.push({ filename: file.name, rowCount: 0, error: message })
    }
  }

  return {
    rows,
    files: loadedFiles,
    allColumns: Array.from(columnSet)
  }
}
