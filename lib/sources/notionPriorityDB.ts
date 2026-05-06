import type { NotionResult } from './notion'

const NOTION_HEADERS = (apiKey: string) => ({
  Authorization: `Bearer ${apiKey}`,
  'Content-Type': 'application/json',
  'Notion-Version': '2022-06-28',
})

async function fetchBlockText(blockId: string, apiKey: string, depth = 0): Promise<string> {
  if (depth > 2) return ''

  const res = await fetch(
    `https://api.notion.com/v1/blocks/${blockId}/children?page_size=50`,
    { headers: NOTION_HEADERS(apiKey) },
  )
  if (!res.ok) return ''

  const data = await res.json()
  const blocks: Record<string, unknown>[] = data.results ?? []
  const parts: string[] = []

  for (const block of blocks) {
    const type = block.type as string | undefined
    if (!type) continue

    const typeData = block[type] as Record<string, unknown> | undefined

    if (type === 'child_page') {
      const t = typeData?.title as string | undefined
      if (t) parts.push(t)
      continue
    }

    if (type === 'table_row') {
      const cells = typeData?.cells as Array<Array<Record<string, unknown>>> | undefined
      if (cells) {
        const row = cells.map((c) => c.map((t) => t.plain_text?.toString() ?? '').join('')).join(' | ')
        if (row.trim()) parts.push(row)
      }
      continue
    }

    const richText = typeData?.rich_text as Array<Record<string, unknown>> | undefined
    if (richText?.length) {
      const line = richText.map((t) => t.plain_text?.toString() ?? '').join('')
      if (line.trim()) parts.push(line)
    }

    if (block.has_children && depth < 2) {
      const child = await fetchBlockText(block.id as string, apiKey, depth + 1)
      if (child) parts.push(child)
    }
  }

  return parts.join(' ').slice(0, 3000)
}

function extractTitle(page: Record<string, unknown>): string {
  const props = (page.properties ?? {}) as Record<string, unknown>
  const titleProp =
    (props.title as Record<string, unknown> | undefined) ??
    (props.Name as Record<string, unknown> | undefined) ??
    (Object.values(props).find(
      (p) => (p as Record<string, unknown>)?.type === 'title',
    ) as Record<string, unknown> | undefined)

  const richText =
    (titleProp?.title as Array<Record<string, unknown>> | undefined) ??
    (titleProp?.rich_text as Array<Record<string, unknown>> | undefined) ??
    []

  return richText[0]?.plain_text?.toString() ?? 'Untitled'
}

export async function searchNotionPriorityDB(
  query: string,
): Promise<{ source: 'notion'; results: NotionResult[] }> {
  const apiKey = process.env.NOTION_API_KEY
  const dbId = process.env.NOTION_PRIORITY_DB_ID

  if (!apiKey) throw new Error('NOTION_API_KEY not set')
  if (!dbId) return { source: 'notion', results: [] }

  // Search all pages, then filter to those whose parent is the priority DB
  const response = await fetch('https://api.notion.com/v1/search', {
    method: 'POST',
    headers: NOTION_HEADERS(apiKey),
    body: JSON.stringify({
      query,
      filter: { value: 'page', property: 'object' },
      page_size: 20,
    }),
  })

  if (!response.ok) {
    throw new Error(`Notion priority DB search error: ${response.status}`)
  }

  const data = await response.json()
  const normalizedDbId = dbId.replace(/-/g, '')

  const pages: Record<string, unknown>[] = (data.results ?? [])
    .filter((page: Record<string, unknown>) => {
      const parent = page.parent as Record<string, unknown> | undefined
      const parentDbId = (parent?.database_id as string | undefined)?.replace(/-/g, '') ?? ''
      return parentDbId === normalizedDbId
    })
    .slice(0, 5)

  console.log(`[notion-priority] search "${query}" → ${pages.length} pages in priority DB`)

  if (pages.length === 0) return { source: 'notion', results: [] }

  const results: NotionResult[] = await Promise.all(
    pages.map(async (page) => {
      const title = extractTitle(page)
      const lastEdited = (page.last_edited_time as string | undefined) ?? ''
      const url =
        (page.url as string | undefined) ??
        `https://notion.so/${(page.id as string).replace(/-/g, '')}`

      const excerpt = await fetchBlockText(page.id as string, apiKey).catch(() => '')
      return { title, excerpt: excerpt || title, lastEdited, url }
    }),
  )

  return { source: 'notion', results }
}
