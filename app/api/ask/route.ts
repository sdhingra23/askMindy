import { NextRequest } from 'next/server'
import { searchNotion } from '@/lib/sources/notion'
import { searchSlack } from '@/lib/sources/slack'
import { searchZoomChat } from '@/lib/sources/zoom'
import { streamClaudeAnswer, type SourceResult } from '@/lib/claude'

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

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        )
      }

      try {
        // Fan out to all active sources in parallel
        const jobs: Promise<SourceResult>[] = []

        if (sources.includes('notion')) {
          jobs.push(
            searchNotion(question).catch((err) => {
              console.error('[notion] search failed:', err)
              return { source: 'notion' as const, results: [] }
            }),
          )
        }
        if (sources.includes('slack')) {
          jobs.push(
            searchSlack(question).catch((err) => {
              console.error('[slack] search failed:', err)
              return { source: 'slack' as const, results: [] }
            }),
          )
        }
        if (sources.includes('zoom')) {
          jobs.push(
            searchZoomChat(question).catch((err) => {
              console.error('[zoom] search failed:', err)
              return { source: 'zoom' as const, results: [] }
            }),
          )
        }

        if (jobs.length === 0) {
          send('error', { message: 'No sources selected' })
          controller.close()
          return
        }

        send('status', { message: 'Searching Notion, Slack, Zoom...' })

        const sourceResults = await Promise.all(jobs)
        const hasResults = sourceResults.some((r) => r.results.length > 0)

        if (!hasResults) {
          send('status', { message: 'No results found — asking Claude anyway...' })
        } else {
          send('status', { message: 'Synthesising answer...' })
        }

        // Stream Claude's response, intercepting SOURCES_JSON before it reaches the client
        let fullText = ''
        let textSentLength = 0
        let sourcesStarted = false

        await streamClaudeAnswer(question, sourceResults, (chunk: string) => {
          fullText += chunk

          if (sourcesStarted) return

          const sourcesIdx = fullText.indexOf('SOURCES_JSON:')

          if (sourcesIdx === -1) {
            // Haven't hit SOURCES_JSON yet — send everything new
            send('chunk', { text: fullText.slice(textSentLength) })
            textSentLength = fullText.length
          } else {
            // SOURCES_JSON just appeared — flush remaining answer text before it
            sourcesStarted = true
            const tail = fullText.slice(textSentLength, sourcesIdx).trimEnd()
            if (tail) send('chunk', { text: tail })
            textSentLength = sourcesIdx
          }
        })

        // Parse and forward the sources block
        const match = fullText.match(/SOURCES_JSON:(\[[\s\S]*?\])/)
        if (match) {
          try {
            const citations = JSON.parse(match[1])
            send('sources', citations)
          } catch {
            // Malformed JSON from model — skip
          }
        }

        send('done', {})
      } catch (err) {
        console.error('[api/ask] unhandled error:', err)
        send('error', { message: "Something went wrong — please try again" })
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
