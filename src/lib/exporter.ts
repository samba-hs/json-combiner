import Papa from 'papaparse'
import ExcelJS from 'exceljs'

export type ExportFormat = 'csv' | 'tsv' | 'json' | 'xlsx'

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function exportData(
  rows: Record<string, unknown>[],
  format: ExportFormat,
  filename: string
): Promise<void> {
  switch (format) {
    case 'csv':
      return exportDelimited(rows, filename, ',')
    case 'tsv':
      return exportDelimited(rows, filename, '\t')
    case 'json':
      return exportJson(rows, filename)
    case 'xlsx':
      return exportExcel(rows, filename)
  }
}

function exportDelimited(
  rows: Record<string, unknown>[],
  filename: string,
  delimiter: string
): void {
  const csv = Papa.unparse(rows, { delimiter })
  const blob = new Blob([csv], { type: 'text/plain;charset=utf-8' })
  triggerDownload(blob, filename)
}

function exportJson(rows: Record<string, unknown>[], filename: string): void {
  const json = JSON.stringify(rows, null, 2)
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
  triggerDownload(blob, filename)
}

async function exportExcel(rows: Record<string, unknown>[], filename: string): Promise<void> {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Combined Data')

  if (rows.length === 0) {
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
    triggerDownload(blob, filename)
    return
  }

  // Collect all columns across all rows
  const columnSet = new Set<string>()
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      columnSet.add(key)
    }
  }
  const columns = Array.from(columnSet)

  sheet.columns = columns.map((col) => ({
    header: col,
    key: col,
    width: Math.max(col.length + 2, 12)
  }))

  // Style header row
  const headerRow = sheet.getRow(1)
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  }
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }

  for (const row of rows) {
    const values: Record<string, unknown> = {}
    for (const col of columns) {
      values[col] = row[col] ?? ''
    }
    sheet.addRow(values)
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
  triggerDownload(blob, filename)
}
