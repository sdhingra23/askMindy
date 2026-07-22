export interface NotionResult {
  title: string
  excerpt: string
  lastEdited: string
  url: string
}

const NOTION_HEADERS = (apiKey: string) => ({
  Authorization: `Bearer ${apiKey}`,
  'Content-Type': 'application/json',
  'Notion-Version': '2022-06-28',
})

// Extracts plain text from Notion blocks, handling all common block types
async function fetchBlockText(
  blockId: string,
  apiKey: string,
  depth = 0,
): Promise<string> {
  if (depth > 2) return ''

  const res = await fetch(
    `https://api.notion.com/v1/blocks/${blockId}/children?page_size=50`,
    { headers: NOTION_HEADERS(apiKey) },
  )

  if (!res.ok) {
    console.error(`[notion] blocks fetch failed for ${blockId}: ${res.status}`)
    return ''
  }

  const data = await res.json()
  const blocks: Record<string, unknown>[] = data.results ?? []

  console.log(`[notion] block ${blockId} depth=${depth} — ${blocks.length} blocks, types: ${blocks.map((b) => b.type).join(', ')}`)

  const parts: string[] = []

  for (const block of blocks) {
    const type = block.type as string | undefined
    if (!type) continue

    const typeData = block[type] as Record<string, unknown> | undefined

    // child_page blocks reference a subpage — capture its title as text
    if (type === 'child_page') {
      const pageTitle = typeData?.title as string | undefined
      if (pageTitle) parts.push(pageTitle)
      continue
    }

    // table rows store content in cells arrays, not rich_text
    if (type === 'table_row') {
      const cells = typeData?.cells as Array<Array<Record<string, unknown>>> | undefined
      if (cells) {
        const row = cells
          .map((cell) => cell.map((t) => t.plain_text?.toString() ?? '').join(''))
          .join(' | ')
        if (row.trim()) parts.push(row)
      }
      continue
    }

    // All other standard content blocks use rich_text
    const richText = typeData?.rich_text as Array<Record<string, unknown>> | undefined
    if (richText?.length) {
      const line = richText.map((t) => t.plain_text?.toString() ?? '').join('')
      if (line.trim()) parts.push(line)
    }

    // Recurse into children (toggles, columns, synced blocks, etc.)
    if (block.has_children && depth < 2) {
      const child = await fetchBlockText(block.id as string, apiKey, depth + 1)
      if (child) parts.push(child)
    }
  }

  const text = parts.join(' ').slice(0, 3000)
  console.log(`[notion] block ${blockId} excerpt (${text.length} chars): ${text.slice(0, 100)}`)
  return text
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

export async function searchNotion(
  query: string,
): Promise<{ source: 'notion'; results: NotionResult[] }> {
  const apiKey = process.env.NOTION_API_KEY
  if (!apiKey) throw new Error('NOTION_API_KEY not set')

  const response = await fetch('https://api.notion.com/v1/search', {
    method: 'POST',
    headers: NOTION_HEADERS(apiKey),
    body: JSON.stringify({
      query,
      filter: { value: 'page', property: 'object' },
      sort: { direction: 'descending', timestamp: 'last_edited_time' },
      page_size: 5,
    }),
  })

  if (!response.ok) {
    throw new Error(`Notion API error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  const feedbackDbId = process.env.NOTION_FEEDBACK_DB_ID?.replace(/-/g, '')

  const pages: Record<string, unknown>[] = (data.results ?? [])
    .filter((item: Record<string, unknown>) => item.object === 'page')
    .filter((page: Record<string, unknown>) => {
      if (!feedbackDbId) return true
      const parent = page.parent as Record<string, unknown> | undefined
      const parentDbId = (parent?.database_id as string | undefined)?.replace(/-/g, '') ?? ''
      return parentDbId !== feedbackDbId
    })
    .slice(0, 5)

  console.log(`[notion] search "${query}" → ${pages.length} pages`)

  const results: NotionResult[] = await Promise.all(
    pages.map(async (page) => {
      const title = extractTitle(page)
      const lastEdited = (page.last_edited_time as string | undefined) ?? ''
      const url =
        (page.url as string | undefined) ??
        `https://notion.so/${(page.id as string).replace(/-/g, '')}`

      const excerpt = await fetchBlockText(page.id as string, apiKey).catch((err) => {
        console.error(`[notion] fetchBlockText failed for "${title}":`, err)
        return ''
      })

      console.log(`[notion] page "${title}" excerpt length: ${excerpt.length}`)
      return { title, excerpt: excerpt || title, lastEdited, url }
    }),
  )

  return { source: 'notion', results }
}
