interface ZoomToken {
  accessToken: string
  expiresAt: number
}

// Module-level token cache — survives across requests in a long-running process
let cachedToken: ZoomToken | null = null

async function getZoomToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.accessToken
  }

  const accountId = process.env.ZOOM_ACCOUNT_ID
  const clientId = process.env.ZOOM_CLIENT_ID
  const clientSecret = process.env.ZOOM_CLIENT_SECRET

  if (!accountId || !clientId || !clientSecret) {
    throw new Error('Zoom credentials not set')
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const response = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    },
  )

  if (!response.ok) {
    throw new Error(`Zoom OAuth error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()

  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in as number) * 1000,
  }

  return cachedToken.accessToken
}

export interface ZoomChatResult {
  text: string
  channel: string
  sender: string
  timestamp: string
  url: string
}

export async function searchZoomChat(
  query: string,
): Promise<{ source: 'zoom'; results: ZoomChatResult[] }> {
  const token = await getZoomToken()

  // Scope required: chat_message:read:admin
  const params = new URLSearchParams({
    query,
    page_size: '5',
  })

  const response = await fetch(`https://api.zoom.us/v2/chat/messages/search?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!response.ok) {
    throw new Error(`Zoom Chat API error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  const messages: Record<string, unknown>[] = data.messages ?? []

  const results: ZoomChatResult[] = messages.map((msg) => ({
    text: (msg.message as string | undefined) ?? '',
    channel: (msg.channel_name as string | undefined) ?? (msg.to_contact as string | undefined) ?? 'Zoom Chat',
    sender: (msg.sender as string | undefined) ?? 'unknown',
    timestamp: (msg.date_time as string | undefined) ?? '',
    // Zoom Chat deep-links aren't available via API; link to the app
    url: 'https://zoom.us/launch/chat',
  }))

  return { source: 'zoom', results }
}
