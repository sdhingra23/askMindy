import { NextRequest } from 'next/server'
import { searchNotion } from '@/lib/sources/notion'
import { searchSlack } from '@/lib/sources/slack'
import { searchZoomChat } from '@/lib/sources/zoom'
import { searchZendesk } from '@/lib/sources/zendesk'
import { searchNotionPriorityDB } from '@/lib/sources/notionPriorityDB'
import { streamClaudeAnswer, type SourceResult } from '@/lib/claude'
import { extractSearchQuery } from '@/lib/extractQuery'
import { logToNotionFeedbackDB } from '@/lib/notionLog'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  let question: string
  let sources: string[]

  try {
    const body = await req.json()
    question = body.question?.trim() ?? ''
    sources = Array.isArray(body.sources) ? body.sources : []
  } catch {
    return new Response('Invalid request body', { status: 400 })
  }

  if (!question) {
    return new Response('Question is required', { status: 400 })
  }

  if (sources.length === 0) {
    return new Response('No sources selected', { status: 400 })
  }

  const user =
    req.headers.get('x-vercel-user-email') ??
    req.headers.get('x-vercel-user-name') ??
    'unknown'

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        )
      }

      try {
        const activeLabels = sources
          .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
          .join(', ')
        send('status', { message: `Searching ${activeLabels}...` })

        // Extract keywords for source searches — full question is kept for Claude
        const searchQuery = await extractSearchQuery(question).catch(() => question)

        // Run priority DB and all other sources in parallel
        // Priority DB only runs if Notion is an active source
        const [priorityResult, ...otherResults] = await Promise.all([
          sources.includes('notion')
            ? searchNotionPriorityDB(searchQuery).catch((err) => {
                console.error('[notion-priority] search failed:', err)
                return { source: 'notion' as const, results: [] }
              })
            : Promise.resolve({ source: 'notion' as const, results: [] }),
          ...(sources.includes('notion')
            ? [searchNotion(searchQuery).catch((err) => {
                console.error('[notion] search failed:', err)
                return { source: 'notion' as const, results: [] }
              })]
            : []),
          ...(sources.includes('slack')
            ? [searchSlack(searchQuery).catch((err) => {
                console.error('[slack] search failed:', err)
                return { source: 'slack' as const, results: [] }
              })]
            : []),
          ...(sources.includes('zoom')
            ? [searchZoomChat(searchQuery).catch((err) => {
                console.error('[zoom] search failed:', err)
                return { source: 'zoom' as const, results: [] }
              })]
            : []),
          ...(sources.includes('zendesk')
            ? [searchZendesk(searchQuery).catch((err) => {
                console.error('[zendesk] search failed:', err)
                return { source: 'zendesk' as const, results: [] }
              })]
            : []),
        ])

        // Priority DB results go first so Claude weighs them highest,
        // but all other sources are always included too
        const sourceResults: SourceResult[] =
          priorityResult.results.length > 0
            ? [priorityResult, ...otherResults]
            : otherResults

        const hasResults = sourceResults.some((r) => r.results.length > 0)

        send('status', {
          message: hasResults ? 'Synthesising answer...' : 'No results found — asking Claude anyway...',
        })

        let fullText = ''

        await streamClaudeAnswer(
          question,
          sourceResults,
          (chunk: string) => {
            fullText += chunk
            send('chunk', { text: chunk })
          },
          (citations: unknown) => {
            send('sources', citations)
          },
        )

        await logToNotionFeedbackDB({ user, question, answer: fullText.trim() })

        send('done', {})
      } catch (err) {
        console.error('[api/ask] unhandled error:', err)
        send('error', { message: 'Something went wrong — please try again' })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
