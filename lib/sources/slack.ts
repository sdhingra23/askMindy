export interface SlackResult {
  text: string
  channel: string
  author: string
  permalink: string
  timestamp: string
}

export async function searchSlack(
  query: string,
): Promise<{ source: 'slack'; results: SlackResult[] }> {
  const token = process.env.SLACK_USER_TOKEN
  if (!token) throw new Error('SLACK_USER_TOKEN not set')

  const params = new URLSearchParams({ query, count: '5', sort: 'score' })

  const response = await fetch(`https://slack.com/api/search.messages?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!response.ok) {
    throw new Error(`Slack API error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()

  if (!data.ok) {
    throw new Error(`Slack API error: ${data.error}`)
  }

  const matches: Record<string, unknown>[] = data.messages?.matches ?? []

  const results: SlackResult[] = matches.slice(0, 5).map((msg) => {
    const channel = msg.channel as Record<string, unknown> | undefined
    const ts = msg.ts as string | undefined
    return {
      text: (msg.text as string | undefined) ?? '',
      channel: (channel?.name as string | undefined) ?? (channel?.id as string | undefined) ?? 'unknown',
      author: (msg.username as string | undefined) ?? (msg.user as string | undefined) ?? 'unknown',
      permalink: (msg.permalink as string | undefined) ?? '',
      timestamp: ts ? new Date(parseFloat(ts) * 1000).toISOString() : '',
    }
  })

  return { source: 'slack', results }
}
