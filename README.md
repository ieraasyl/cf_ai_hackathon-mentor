# hackathon-mentor

AI mentor for 24-hour hackathon teams on the [Cloudflare Agents SDK](https://developers.cloudflare.com/agents/). One URL per team: persistent state (idea, stack, checklist, history) with no accounts. **Stack:** Workers AI (`@cf/google/gemma-4-26b-a4b-it`), Vite, React 19, [Kumo](https://developers.cloudflare.com/kumo/), [`@cloudflare/ai-chat`](https://developers.cloudflare.com/workers-ai/configuration/ai-chat/).

## Live demo

https://hackathon-mentor.ieraasyl.workers.dev/

## Try the UI

| Area             | What to do                                                                                                                                      |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Chat**         | Use starter chips or type; streaming over WebSocket.                                                                                            |
| **Mentor tools** | Ask to evaluate an idea, suggest stack, generate checklist, mark tasks done, or suggest team names — tool cards appear in the transcript.       |
| **Images**       | Drag/drop, paste, or pick a file; ask about the image.                                                                                          |
| **MCP**          | Header **MCP** → add a server URL; tools merge into the model. Tested with [Context7 OAuth MCP](https://mcp.context7.com/mcp/oauth) at minimum. |
| **Header**       | **Debug** = raw message JSON; sun/moon = theme; **Clear** = reset chat.                                                                         |

## Run locally

**Needs:** Node.js 18+ and [pnpm](https://pnpm.io/) (or npm/yarn equivalents).

```bash
pnpm install
pnpm run dev
```

Open the URL Vite prints (usually http://localhost:5173). The Cloudflare Vite plugin runs the Worker and SPA together.

## Deploy

```bash
pnpm run deploy
```

Use the URL from the command output or Cloudflare dashboard (**Workers & Pages** → this worker). Pattern: `https://hackathon-mentor.<subdomain>.workers.dev`.

## Code map

| Path             | Role                                           |
| ---------------- | ---------------------------------------------- |
| `src/server.ts`  | `HackathonMentor` agent, AI, tools, MCP        |
| `src/prompt.ts`  | System prompt from team state                  |
| `src/tools.ts`   | Mentor tools (Zod)                             |
| `src/types.ts`   | `TeamState`, checklist types                   |
| `src/app.tsx`    | Chat UI, MCP panel, attachments                |
| `wrangler.jsonc` | Worker, Durable Object, AI binding, SPA assets |
