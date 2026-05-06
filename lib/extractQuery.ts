import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function extractSearchQuery(question: string): Promise<string> {
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 30,
    messages: [
      {
        role: 'user',
        content: `Extract 3-5 search keywords from this question for searching an internal knowledge base. Output only the keywords, nothing else.\n\nQuestion: ${question}`,
      },
    ],
  })

  const text =
    response.content[0].type === 'text' ? response.content[0].text.trim() : question

  console.log(`[query] "${question.slice(0, 60)}..." → "${text}"`)
  return text || question
}
