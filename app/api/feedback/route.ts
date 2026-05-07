import { NextRequest } from 'next/server'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const user =
    req.headers.get('x-vercel-user-email') ??
    req.headers.get('x-vercel-user-name') ??
    'unknown'

  let body: { feedback?: string; question?: string; answer?: string }
  try {
    body = await req.json()
  } catch {
    return new Response('Invalid request body', { status: 400 })
  }

  const { feedback, question, answer } = body

  console.log(
    JSON.stringify({
      event: 'feedback',
      user,
      rating: feedback,
      question,
      answer,
      timestamp: new Date().toISOString(),
    }),
  )

  const dbId = process.env.NOTION_FEEDBACK_DB_ID
  const apiKey = process.env.NOTION_API_KEY

  if (dbId && apiKey) {
    try {
      await fetch('https://api.notion.com/v1/pages', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Notion-Version': '2022-06-28',
        },
        body: JSON.stringify({
          parent: { database_id: dbId },
          properties: {
            Question: {
              title: [{ text: { content: (question ?? '').slice(0, 2000) } }],
            },
            Rating: {
              select: { name: feedback ?? 'unknown' },
            },
            User: {
              rich_text: [{ text: { content: user } }],
            },
            Answer: {
              rich_text: [{ text: { content: (answer ?? '').slice(0, 2000) } }],
            },
            Timestamp: {
              date: { start: new Date().toISOString() },
            },
          },
        }),
      })
    } catch (err) {
      console.error('[feedback] notion write failed:', err)
    }
  }

  return new Response(null, { status: 204 })
}
