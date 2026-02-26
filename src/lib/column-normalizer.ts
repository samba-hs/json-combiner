export interface ColumnMapping {
  raw: string
  canonical: string
  auto: boolean // true if auto-detected, false if user override
}

// Synonym dictionary: all keys are lowercase, values are canonical names
const SYNONYMS: Record<string, string> = {
  channel: 'Channel',
  'unified channel': 'Channel',
  'channel name': 'Channel',
  lead: 'Lead',
  leads: 'Lead',
  'new lead': 'Lead',
  'new leads': 'Lead',
  'deals created': 'Deals Created',
  'deal created': 'Deals Created',
  'new deals created': 'Deals Created',
  'closed won': 'Closed Won',
  'closed wons': 'Closed Won',
  'closed wons (sequence)': 'Closed Won',
  'closed won (sequence)': 'Closed Won',
  revenue: 'Revenue',
  'closed won revenue': 'Revenue',
  'total revenue': 'Revenue',
  cost: 'Cost',
  spend: 'Cost',
  'ad spend': 'Cost',
  'total cost': 'Cost',
  impressions: 'Impressions',
  impression: 'Impressions',
  clicks: 'Clicks',
  click: 'Clicks',
  'marketing qualified lead': 'MQL',
  'marketing qualified leads': 'MQL',
  mql: 'MQL',
  mqls: 'MQL',
  'sales qualified lead': 'SQL',
  'sales qualified leads': 'SQL',
  sql: 'SQL',
  sqls: 'SQL',
  'opportunity': 'Opportunity',
  'opportunities': 'Opportunity',
  sessions: 'Sessions',
  session: 'Sessions',
  'web sessions': 'Sessions',
  'new contacts': 'New Contacts',
  'new contact': 'New Contacts',
  contacts: 'New Contacts'
}

function cleanColumnName(raw: string): string {
  let cleaned = raw.trim()
  // Remove bracket suffixes like [HS], [SF], etc.
  cleaned = cleaned.replace(/\s*\[.*?\]\s*$/, '')
  // Collapse multiple spaces
  cleaned = cleaned.replace(/\s+/g, ' ')
  return cleaned.trim()
}

export function detectMappings(rawColumns: string[]): ColumnMapping[] {
  const mappings: ColumnMapping[] = []

  for (const raw of rawColumns) {
    if (raw === 'source_file') {
      mappings.push({ raw, canonical: 'source_file', auto: true })
      continue
    }

    const cleaned = cleanColumnName(raw)
    const lower = cleaned.toLowerCase()

    if (SYNONYMS[lower]) {
      mappings.push({ raw, canonical: SYNONYMS[lower], auto: true })
    } else {
      // Use the cleaned version as canonical
      mappings.push({ raw, canonical: cleaned, auto: true })
    }
  }

  return mappings
}

export function applyMappings(
  rows: Record<string, unknown>[],
  mappings: ColumnMapping[]
): Record<string, unknown>[] {
  const mappingMap = new Map<string, string>()
  for (const m of mappings) {
    mappingMap.set(m.raw, m.canonical)
  }

  return rows.map((row) => {
    const newRow: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(row)) {
      const canonical = mappingMap.get(key) || key
      // If multiple raw columns map to the same canonical, keep the first non-null value
      if (newRow[canonical] === undefined || newRow[canonical] === null || newRow[canonical] === '') {
        newRow[canonical] = value
      }
    }
    return newRow
  })
}

export function getCanonicalColumns(mappings: ColumnMapping[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const m of mappings) {
    if (!seen.has(m.canonical)) {
      seen.add(m.canonical)
      result.push(m.canonical)
    }
  }
  return result
}
