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

  return new Response(null, { status: 204 })
}
