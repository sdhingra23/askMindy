export interface ZendeskResult {
  title: string
  excerpt: string
  url: string
  updatedAt: string
}

export async function searchZendesk(
  query: string,
): Promise<{ source: 'zendesk'; results: ZendeskResult[] }> {
  const params = new URLSearchParams({ query, per_page: '5', locale: 'en-us' })

  const response = await fetch(
    `https://higherme.zendesk.com/api/v2/help_center/articles/search.json?${params}`,
  )

  if (!response.ok) {
    throw new Error(`Zendesk API error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  const articles: Record<string, unknown>[] = data.results ?? []

  const results: ZendeskResult[] = articles.slice(0, 5).map((article) => ({
    title: (article.title as string | undefined) ?? 'Untitled',
    excerpt: (article.snippet as string | undefined) ?? '',
    url: (article.html_url as string | undefined) ?? '',
    updatedAt: (article.updated_at as string | undefined) ?? '',
  }))

  return { source: 'zendesk', results }
}
