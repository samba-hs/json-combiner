import { writeFile } from 'fs/promises'
import Papa from 'papaparse'
import ExcelJS from 'exceljs'

export type ExportFormat = 'csv' | 'tsv' | 'json' | 'xlsx'

export async function exportData(
  rows: Record<string, unknown>[],
  filePath: string,
  format: ExportFormat
): Promise<void> {
  switch (format) {
    case 'csv':
      return exportDelimited(rows, filePath, ',')
    case 'tsv':
      return exportDelimited(rows, filePath, '\t')
    case 'json':
      return exportJson(rows, filePath)
    case 'xlsx':
      return exportExcel(rows, filePath)
  }
}

function exportDelimited(
  rows: Record<string, unknown>[],
  filePath: string,
  delimiter: string
): Promise<void> {
  const csv = Papa.unparse(rows, { delimiter })
  return writeFile(filePath, csv, 'utf-8')
}

function exportJson(rows: Record<string, unknown>[], filePath: string): Promise<void> {
  return writeFile(filePath, JSON.stringify(rows, null, 2), 'utf-8')
}

async function exportExcel(rows: Record<string, unknown>[], filePath: string): Promise<void> {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Combined Data')

  if (rows.length === 0) {
    await workbook.xlsx.writeFile(filePath)
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
  headerRow.font = { bold: true }
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

  await workbook.xlsx.writeFile(filePath)
}
