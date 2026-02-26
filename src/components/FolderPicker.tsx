import React, { useState, useCallback, useRef, type DragEvent, type ChangeEvent } from 'react'
import { useApp } from '../stores/AppContext'
import type { FileInfo } from '../lib/types'

interface LoadedFolder {
  id: string
  label: string
  files: FileInfo[]
  totalRows: number
  allColumns: string[]
}

interface Props {
  folders: LoadedFolder[]
  onFoldersChanged: (folders: LoadedFolder[]) => void
}

export default function FolderPicker({ folders, onFoldersChanged }: Props): React.JSX.Element {
  const app = useApp()
  const [loading, setLoading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const addFolderFiles = useCallback(
    async (filesByFolder: Map<string, File[]>) => {
      setLoading(true)
      setError(null)
      const newFolders: LoadedFolder[] = []
      const errors: string[] = []
      try {
        for (const [label, files] of filesByFolder) {
          try {
            const result = await app.addFolder(label, files)
            if (result.files.length === 0) {
              errors.push(`${label}: No JSON files found`)
              continue
            }
            newFolders.push(result)
          } catch (err) {
            errors.push(`${label}: ${err instanceof Error ? err.message : 'Failed to load'}`)
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
    [folders, onFoldersChanged, app]
  )

  const groupFilesByFolder = (fileList: FileList): Map<string, File[]> => {
    const groups = new Map<string, File[]>()
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i]
      // webkitRelativePath is "folderName/subpath/file.json"
      const relativePath = file.webkitRelativePath
      const folderName = relativePath ? relativePath.split('/')[0] : 'Uploaded Files'
      if (!groups.has(folderName)) {
        groups.set(folderName, [])
      }
      groups.get(folderName)!.push(file)
    }
    return groups
  }

  const handleBrowse = (): void => {
    inputRef.current?.click()
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const files = e.target.files
    if (!files || files.length === 0) return
    const grouped = groupFilesByFolder(files)
    addFolderFiles(grouped)
    // Reset input so the same folder can be selected again
    e.target.value = ''
  }

  const handleDrop = async (e: DragEvent): Promise<void> => {
    e.preventDefault()
    setDragOver(false)

    const items = e.dataTransfer.items
    if (!items) return

    const groups = new Map<string, File[]>()

    // Try to read directory entries
    const entries: FileSystemEntry[] = []
    for (let i = 0; i < items.length; i++) {
      const entry = items[i].webkitGetAsEntry?.()
      if (entry) entries.push(entry)
    }

    if (entries.length > 0 && entries.some((e) => e.isDirectory)) {
      // Read files from directories
      for (const entry of entries) {
        if (entry.isDirectory) {
          const dirReader = (entry as FileSystemDirectoryEntry).createReader()
          const files = await new Promise<File[]>((resolve) => {
            dirReader.readEntries(async (dirEntries) => {
              const filePromises = dirEntries
                .filter((e) => e.isFile && e.name.toLowerCase().endsWith('.json'))
                .map(
                  (e) =>
                    new Promise<File>((res, rej) => {
                      ;(e as FileSystemFileEntry).file(res, rej)
                    })
                )
              resolve(await Promise.all(filePromises))
            })
          })
          if (files.length > 0) {
            groups.set(entry.name, files)
          }
        }
      }
    } else {
      // Fallback: treat dropped files as a single group
      const files: File[] = []
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        files.push(e.dataTransfer.files[i])
      }
      if (files.length > 0) {
        groups.set('Dropped Files', files)
      }
    }

    if (groups.size > 0) {
      addFolderFiles(groups)
    }
  }

  const removeFolder = (id: string): void => {
    app.removeFolder(id)
    onFoldersChanged(folders.filter((f) => f.id !== id))
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-2xl">
      <h2 className="text-2xl font-bold text-gray-100">Load Folders</h2>
      <p className="text-gray-400 text-center max-w-md">
        Add folders containing JSON files. Each folder can have different columns — you'll configure
        which fields to keep and how to join them next.
      </p>

      {/* Hidden file input for folder selection */}
      <input
        ref={inputRef}
        type="file"
        // @ts-expect-error webkitdirectory is non-standard but widely supported
        webkitdirectory=""
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Loaded folders list */}
      {folders.length > 0 && (
        <div className="w-full space-y-2">
          {folders.map((f) => {
            const okFiles = f.files.filter((fi) => !fi.error)
            const errFiles = f.files.filter((fi) => fi.error)
            return (
              <div key={f.id} className="bg-gray-800 rounded-lg px-4 py-3 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="text-gray-200 font-medium truncate">{f.label}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {okFiles.length} files, {f.totalRows.toLocaleString()} rows,{' '}
                    {f.allColumns.length} columns
                    {errFiles.length > 0 && (
                      <span className="text-red-400 ml-2">({errFiles.length} errors)</span>
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
