export interface NotionResult {
  title: string
  excerpt: string
  lastEdited: string
  url: string
}

export async function searchNotion(
  query: string,
): Promise<{ source: 'notion'; results: NotionResult[] }> {
  const apiKey = process.env.NOTION_API_KEY
  if (!apiKey) throw new Error('NOTION_API_KEY not set')

  const response = await fetch('https://api.notion.com/v1/search', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28',
    },
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

  const results: NotionResult[] = (data.results ?? [])
    .filter((item: Record<string, unknown>) => item.object === 'page')
    .slice(0, 5)
    .map((page: Record<string, unknown>) => {
      const props = (page.properties ?? {}) as Record<string, unknown>

      // Notion page titles can live in different property keys
      const titleProp =
        (props.title as Record<string, unknown> | undefined) ??
        (props.Name as Record<string, unknown> | undefined) ??
        Object.values(props).find(
          (p) =>
            (p as Record<string, unknown>)?.type === 'title',
        ) as Record<string, unknown> | undefined

      const richText =
        (titleProp?.title as Array<Record<string, unknown>> | undefined) ??
        (titleProp?.rich_text as Array<Record<string, unknown>> | undefined) ??
        []

      const title =
        richText[0]?.plain_text?.toString() ??
        'Untitled'

      const lastEdited = (page.last_edited_time as string | undefined) ?? ''
      const url =
        (page.url as string | undefined) ??
        `https://notion.so/${(page.id as string).replace(/-/g, '')}`

      return {
        title,
        excerpt: title,
        lastEdited,
        url,
      }
    })

  return { source: 'notion', results }
}
