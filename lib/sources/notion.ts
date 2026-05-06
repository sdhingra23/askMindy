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

// Recursively extracts plain text from a list of Notion blocks (max 2 levels deep)
async function fetchBlockText(
  blockId: string,
  apiKey: string,
  depth = 0,
): Promise<string> {
  if (depth > 1) return ''

  const res = await fetch(`https://api.notion.com/v1/blocks/${blockId}/children?page_size=20`, {
    headers: NOTION_HEADERS(apiKey),
  })
  if (!res.ok) return ''

  const data = await res.json()
  const blocks: Record<string, unknown>[] = data.results ?? []

  const parts: string[] = []

  for (const block of blocks) {
    const type = block.type as string | undefined
    if (!type) continue

    // Most content block types store rich_text under their type key
    const typeData = block[type] as Record<string, unknown> | undefined
    const richText = typeData?.rich_text as Array<Record<string, unknown>> | undefined

    if (richText) {
      const line = richText.map((t) => t.plain_text?.toString() ?? '').join('')
      if (line.trim()) parts.push(line)
    }

    // Recurse into child blocks (e.g. toggle, column, bulleted list)
    if (block.has_children) {
      const child = await fetchBlockText(block.id as string, apiKey, depth + 1)
      if (child) parts.push(child)
    }
  }

  return parts.join(' ').slice(0, 800) // cap per-page excerpt at 800 chars
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
  const pages: Record<string, unknown>[] = (data.results ?? [])
    .filter((item: Record<string, unknown>) => item.object === 'page')
    .slice(0, 5)

  // Fetch block content for each page in parallel
  const results: NotionResult[] = await Promise.all(
    pages.map(async (page) => {
      const title = extractTitle(page)
      const lastEdited = (page.last_edited_time as string | undefined) ?? ''
      const url =
        (page.url as string | undefined) ??
        `https://notion.so/${(page.id as string).replace(/-/g, '')}`

      const excerpt = await fetchBlockText(page.id as string, apiKey).catch(() => title)

      return { title, excerpt: excerpt || title, lastEdited, url }
    }),
  )

  return { source: 'notion', results }
}
