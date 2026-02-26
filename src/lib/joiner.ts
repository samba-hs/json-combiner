export interface OutputColumn {
  /** User-chosen name for the final column, e.g. "final_channel" */
  name: string
  /** Raw column names to coalesce (first non-null wins, in order) */
  sourceColumns: string[]
  /** Whether this column is a join key */
  isJoinKey: boolean
}

export interface FolderData {
  id: string
  label: string
  folderPath: string
  rows: Record<string, unknown>[]
  allColumns: string[]
}

/**
 * Step 1: Coalesce — within each folder, produce rows with only the output columns.
 * For each row, each output column gets the first non-null/non-empty value
 * from its sourceColumns list (bfill-style).
 */
function coalesceFolder(
  folder: FolderData,
  outputColumns: OutputColumn[]
): Record<string, unknown>[] {
  return folder.rows.map((row) => {
    const out: Record<string, unknown> = {}
    for (const col of outputColumns) {
      let value: unknown = null
      for (const src of col.sourceColumns) {
        const v = row[src]
        if (v !== undefined && v !== null && v !== '') {
          value = v
          break
        }
      }
      out[col.name] = value
    }
    return out
  })
}

function buildCompositeKey(row: Record<string, unknown>, joinKeys: string[]): string {
  return joinKeys.map((k) => String(row[k] ?? '')).join('\x00')
}

/**
 * Step 2: Full outer join across folders on the join key columns.
 * Non-key columns that appear in multiple folders get suffixed with the folder label.
 */
export function executeJoin(
  folders: FolderData[],
  outputColumns: OutputColumn[]
): Record<string, unknown>[] {
  const joinKeys = outputColumns.filter((c) => c.isJoinKey).map((c) => c.name)
  const valueColumns = outputColumns.filter((c) => !c.isJoinKey).map((c) => c.name)

  // Coalesce each folder
  const coalesced = folders.map((f) => ({
    folder: f,
    rows: coalesceFolder(f, outputColumns)
  }))

  // Figure out which value columns exist in which folders
  // (a value column "exists" if at least one of its sourceColumns is in the folder)
  const folderHasColumn = new Map<string, Set<string>>() // colName → set of folder ids
  for (const oc of outputColumns) {
    if (oc.isJoinKey) continue
    const folderIds = new Set<string>()
    for (const f of folders) {
      if (oc.sourceColumns.some((src) => f.allColumns.includes(src))) {
        folderIds.add(f.id)
      }
    }
    folderHasColumn.set(oc.name, folderIds)
  }

  // Detect conflicts: value columns present in multiple folders
  const conflictColumns = new Set<string>()
  for (const [colName, folderIds] of folderHasColumn) {
    if (folderIds.size > 1) {
      conflictColumns.add(colName)
    }
  }

  // Build final column name per (folder, column) pair
  // Conflicts get suffixed; non-conflicts keep their name
  const getFinalName = (colName: string, folder: FolderData): string | null => {
    const folderIds = folderHasColumn.get(colName)
    if (!folderIds || !folderIds.has(folder.id)) return null // folder doesn't have this column
    if (conflictColumns.has(colName)) {
      return `${colName} (${folder.label})`
    }
    return colName
  }

  // Full outer join
  const index = new Map<string, Record<string, unknown>>()
  const keyOrder: string[] = []

  for (const { folder, rows } of coalesced) {
    for (const row of rows) {
      const key = buildCompositeKey(row, joinKeys)

      if (!index.has(key)) {
        const merged: Record<string, unknown> = {}
        for (const jk of joinKeys) {
          merged[jk] = row[jk]
        }
        index.set(key, merged)
        keyOrder.push(key)
      }

      const merged = index.get(key)!

      for (const colName of valueColumns) {
        const finalName = getFinalName(colName, folder)
        if (!finalName) continue

        const value = row[colName]
        // For conflicted (suffixed) columns, just write the value
        // For non-conflicted, coalesce (keep first non-null)
        if (conflictColumns.has(colName)) {
          merged[finalName] = value
        } else {
          if (merged[finalName] === undefined || merged[finalName] === null || merged[finalName] === '') {
            merged[finalName] = value
          }
        }
      }
    }
  }

  return keyOrder.map((k) => index.get(k)!)
}

/**
 * Collect all unique raw column names across all folders.
 */
export function getAllRawColumns(folders: FolderData[]): string[] {
  const set = new Set<string>()
  for (const f of folders) {
    for (const col of f.allColumns) {
      set.add(col)
    }
  }
  return Array.from(set).sort()
}

/**
 * For a given raw column name, return which folders contain it.
 */
export function getColumnPresence(
  rawColumn: string,
  folders: FolderData[]
): { id: string; label: string }[] {
  return folders
    .filter((f) => f.allColumns.includes(rawColumn))
    .map((f) => ({ id: f.id, label: f.label }))
}
