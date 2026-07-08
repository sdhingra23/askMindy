type LogEntry = {
  user: string
  question: string
  answer: string
  rating?: string
}

export async function logToNotionFeedbackDB({ user, question, answer, rating }: LogEntry): Promise<void> {
  const dbId = process.env.NOTION_FEEDBACK_DB_ID
  const apiKey = process.env.NOTION_API_KEY

  if (!dbId || !apiKey) return

  try {
    const res = await fetch('https://api.notion.com/v1/pages', {
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
            title: [{ text: { content: question.slice(0, 2000) } }],
          },
          ...(rating ? { Rating: { select: { name: rating } } } : {}),
          User: {
            rich_text: [{ text: { content: user } }],
          },
          Answer: {
            rich_text: [{ text: { content: answer.slice(0, 2000) } }],
          },
          Timestamp: {
            date: { start: new Date().toISOString() },
          },
        },
      }),
    })
    if (!res.ok) {
      const body = await res.text()
      console.error(`[notion-log] notion error ${res.status}:`, body)
    }
  } catch (err) {
    console.error('[notion-log] notion write failed:', err)
  }
}
