# askMindy

Internal knowledge base assistant for HigherMe. Ask a question and get a synthesised, sourced answer drawn from Notion, Slack, and Zoom Chat — all in one place.

---

## API credentials

### Anthropic (`ANTHROPIC_API_KEY`)

1. Go to [console.anthropic.com](https://console.anthropic.com) → **API Keys**
2. Create a new key and copy it

---

### Notion (`NOTION_API_KEY`)

1. Go to [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Click **New integration**, give it a name (e.g. "askMindy"), select your workspace
3. Copy the **Internal Integration Token** — this is your key
4. For each Notion page or database you want searchable, open it → **⋯ menu** → **Add connections** → select your integration

---

### Slack (`SLACK_USER_TOKEN`)

askMindy uses the `search.messages` endpoint, which requires a **user token** (not a bot token).

1. Go to [api.slack.com/apps](https://api.slack.com/apps) → **Create New App** → **From scratch**
2. Under **OAuth & Permissions** → **User Token Scopes**, add `search:read`
3. Click **Install to Workspace** and authorise
4. Copy the **User OAuth Token** (starts with `xoxp-`)

---

### Zoom Chat (`ZOOM_ACCOUNT_ID`, `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET`)

askMindy uses a Server-to-Server OAuth app to search Zoom Chat messages.

1. Go to [marketplace.zoom.us](https://marketplace.zoom.us) → **Develop** → **Build App**
2. Choose **Server-to-Server OAuth** and create the app
3. Under **Scopes**, add `imchat:read:admin`
4. Go to **App Credentials** and copy **Account ID**, **Client ID**, and **Client Secret**
5. Activate the app
