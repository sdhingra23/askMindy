export interface ZendeskResult {
  title: string
  excerpt: string
  url: string
  updatedAt: string
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s{2,}/g, ' ')
    .trim()
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

  // 30k chars total across all articles (~7500 tokens) — well within Claude's context window.
  // Dividing evenly so one long article doesn't crowd out others.
  const top = articles.slice(0, 5)
  const perArticleLimit = Math.floor(30000 / top.length)

  const results: ZendeskResult[] = top.map((article) => {
    const rawBody = (article.body as string | undefined) ?? (article.snippet as string | undefined) ?? ''
    const fullText = stripHtml(rawBody).slice(0, perArticleLimit)
    return {
      title: (article.title as string | undefined) ?? 'Untitled',
      excerpt: fullText,
      url: (article.html_url as string | undefined) ?? '',
      updatedAt: (article.updated_at as string | undefined) ?? '',
    }
  })

  return { source: 'zendesk', results }
}
