import { useState, useCallback, DragEvent } from 'react'

interface LoadedFolder {
  id: string
  label: string
  folderPath: string
  files: FileInfo[]
  totalRows: number
  allColumns: string[]
  columnConfigs: FolderColumnConfig[]
}

interface Props {
  folders: LoadedFolder[]
  onFoldersChanged: (folders: LoadedFolder[]) => void
}

export default function FolderPicker({ folders, onFoldersChanged }: Props): JSX.Element {
  const [loading, setLoading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addFolders = useCallback(
    async (folderPaths: string[]) => {
      setLoading(true)
      setError(null)
      const newFolders: LoadedFolder[] = []
      const errors: string[] = []
      try {
        for (const folderPath of folderPaths) {
          try {
            const result = await window.api.addFolder(folderPath)
            if (result.files.length === 0) {
              errors.push(`${folderPath}: No JSON files found`)
              continue
            }
            newFolders.push(result)
          } catch (err) {
            errors.push(`${folderPath}: ${err instanceof Error ? err.message : 'Failed to load'}`)
          }
        }
        if (newFolders.length > 0) {
          onFoldersChanged([...folders, ...newFolders])
        }
        if (errors.length > 0) {
          setError(errors.join('\n'))
        }
      } finally {
        setLoading(false)
      }
    },
    [folders, onFoldersChanged]
  )

  const handleBrowse = async (): Promise<void> => {
    const paths = await window.api.selectFolders()
    if (paths.length > 0) addFolders(paths)
  }

  const handleDrop = (e: DragEvent): void => {
    e.preventDefault()
    setDragOver(false)
    const files = e.dataTransfer.files
    const paths: string[] = []
    for (let i = 0; i < files.length; i++) {
      const path = window.api.getPathForFile(files[i])
      if (path) paths.push(path)
    }
    if (paths.length > 0) addFolders(paths)
  }

  const removeFolder = async (id: string): Promise<void> => {
    await window.api.removeFolder(id)
    onFoldersChanged(folders.filter((f) => f.id !== id))
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-2xl">
      <h2 className="text-2xl font-bold text-gray-100">Load Folders</h2>
      <p className="text-gray-400 text-center max-w-md">
        Add folders containing JSON files. Each folder can have different columns — you'll
        configure which fields to keep and how to join them next.
      </p>

      {/* Loaded folders list */}
      {folders.length > 0 && (
        <div className="w-full space-y-2">
          {folders.map((f) => {
            const okFiles = f.files.filter((fi) => !fi.error)
            const errFiles = f.files.filter((fi) => fi.error)
            return (
              <div
                key={f.id}
                className="bg-gray-800 rounded-lg px-4 py-3 flex items-center gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-gray-200 font-medium truncate">{f.label}</div>
                  <div className="text-xs text-gray-500 font-mono truncate">{f.folderPath}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {okFiles.length} files, {f.totalRows.toLocaleString()} rows,{' '}
                    {f.allColumns.length} columns
                    {errFiles.length > 0 && (
                      <span className="text-red-400 ml-2">
                        ({errFiles.length} errors)
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => removeFolder(f.id)}
                  className="text-gray-500 hover:text-red-400 shrink-0 p-1"
                  title="Remove folder"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={handleBrowse}
        className={`
          w-full border-2 border-dashed rounded-xl p-8
          flex flex-col items-center gap-3 transition-colors cursor-pointer
          ${dragOver ? 'border-blue-400 bg-blue-400/10' : 'border-gray-600 hover:border-gray-400'}
        `}
      >
        {loading ? (
          <>
            <div className="w-8 h-8 border-3 border-blue-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-gray-300">Loading files...</span>
          </>
        ) : (
          <>
            <svg
              className="w-10 h-10 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span className="text-gray-300">
              {folders.length === 0
                ? 'Drop folders here or click to browse'
                : 'Drop or browse to add more folders'}
            </span>
          </>
        )}
      </div>

      {error && (
        <div className="bg-red-900/40 border border-red-700 text-red-300 px-4 py-3 rounded-lg w-full">
          {error}
        </div>
      )}
    </div>
  )
}
