import Anthropic from '@anthropic-ai/sdk'
import type { NotionResult } from './sources/notion'
import type { SlackResult } from './sources/slack'
import type { ZoomChatResult } from './sources/zoom'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export type SourceResult =
  | { source: 'notion'; results: NotionResult[] }
  | { source: 'slack'; results: SlackResult[] }
  | { source: 'zoom'; results: ZoomChatResult[] }

function buildContext(sourceResults: SourceResult[]): {
  context: string
  sourcesLabel: string
} {
  const parts: string[] = []
  const sourceNames: string[] = []

  for (const sr of sourceResults) {
    if (sr.results.length === 0) continue

    const label = sr.source.charAt(0).toUpperCase() + sr.source.slice(1)
    sourceNames.push(label)
    parts.push(`=== ${label.toUpperCase()} ===`)

    if (sr.source === 'notion') {
      for (const r of sr.results) {
        parts.push(`Title: ${r.title}`)
        parts.push(`Last edited: ${r.lastEdited}`)
        parts.push(`URL: ${r.url}`)
        parts.push(`Content: ${r.excerpt}`)
        parts.push('---')
      }
    } else if (sr.source === 'slack') {
      for (const r of sr.results) {
        parts.push(`Channel: #${r.channel}`)
        parts.push(`Author: ${r.author}`)
        parts.push(`Message: ${r.text}`)
        parts.push(`URL: ${r.permalink}`)
        parts.push(`Timestamp: ${r.timestamp}`)
        parts.push('---')
      }
    } else if (sr.source === 'zoom') {
      for (const r of sr.results) {
        parts.push(`Channel: ${r.channel}`)
        parts.push(`Sender: ${r.sender}`)
        parts.push(`Message: ${r.text}`)
        parts.push(`Timestamp: ${r.timestamp}`)
        parts.push('---')
      }
    }
  }

  return {
    context: parts.join('\n'),
    sourcesLabel: sourceNames.length > 0 ? sourceNames.join(', ') : 'internal sources',
  }
}

export async function streamClaudeAnswer(
  question: string,
  sourceResults: SourceResult[],
  onChunk: (text: string) => void,
): Promise<void> {
  const { context, sourcesLabel } = buildContext(sourceResults)

  const systemPrompt = `You are askMindy, the internal knowledge base assistant for HigherMe, a team \
within Netchex. You help HigherMe team members find answers from internal documentation.

You have been given relevant excerpts retrieved from: ${sourcesLabel}

Rules:
- Answer in 3-5 clear, actionable sentences.
- Only use information present in the provided context.
- If the context does not contain a clear answer, say so explicitly and flag it as a knowledge gap.
- After your answer, on a new line output exactly:
  SOURCES_JSON:[{"source":"notion|slack|zoom","title":"...","url":"...","age":"..."}]
- Include 2-3 sources maximum. Output nothing after the JSON.`

  const userContent = context
    ? `Context from knowledge base:\n\n${context}\n\nQuestion: ${question}`
    : `Question: ${question}\n\nNote: No results were retrieved from the knowledge base.`

  const stream = anthropic.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: userContent }],
  })

  for await (const event of stream) {
    if (
      event.type === 'content_block_delta' &&
      event.delta.type === 'text_delta'
    ) {
      onChunk(event.delta.text)
    }
  }
}
