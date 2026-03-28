import { createWorkersAI } from "workers-ai-provider";
import { routeAgentRequest, callable } from "agents";
import { AIChatAgent, type OnChatMessageOptions } from "@cloudflare/ai-chat";
import {
  streamText,
  convertToModelMessages,
  pruneMessages,
  stepCountIs,
  type ModelMessage
} from "ai";
import { buildSystemPrompt } from "./prompt";
import { createTools } from "./tools";
import type { TeamState } from "./types";

/**
 * The AI SDK's downloadAssets step runs `new URL(data)` on every file
 * part's string data. Data URIs parse as valid URLs, so it tries to
 * HTTP-fetch them and fails. Decode to Uint8Array so the SDK treats
 * them as inline data instead.
 */
function inlineDataUrls(messages: ModelMessage[]): ModelMessage[] {
  return messages.map((msg) => {
    if (msg.role !== "user" || typeof msg.content === "string") return msg;
    return {
      ...msg,
      content: msg.content.map((part) => {
        if (part.type !== "file" || typeof part.data !== "string") return part;
        const match = part.data.match(/^data:([^;]+);base64,(.+)$/);
        if (!match) return part;
        const bytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
        return { ...part, data: bytes, mediaType: match[1] };
      })
    };
  });
}

export class HackathonMentor extends AIChatAgent<Env, TeamState> {
  initialState: TeamState = {
    team_name: "",
    project_idea: "",
    stack: "",
    checklist: null,
    started_at: null
  };

  onStart() {
    // Configure OAuth popup behavior for MCP servers that require authentication
    this.mcp.configureOAuthCallback({
      customHandler: (result) => {
        if (result.authSuccess) {
          return new Response("<script>window.close();</script>", {
            headers: { "content-type": "text/html" },
            status: 200
          });
        }
        return new Response(
          `Authentication Failed: ${result.authError || "Unknown error"}`,
          { headers: { "content-type": "text/plain" }, status: 400 }
        );
      }
    });
  }

  @callable()
  async addServer(name: string, url: string) {
    return await this.addMcpServer(name, url);
  }

  @callable()
  async removeServer(serverId: string) {
    await this.removeMcpServer(serverId);
  }

  async onChatMessage(_onFinish: unknown, options?: OnChatMessageOptions) {
    if (this.state.started_at === null) {
      this.setState({ ...this.state, started_at: Date.now() });
    }
    const workersai = createWorkersAI({ binding: this.env.AI });

    const model = workersai("@cf/moonshotai/kimi-k2.5", {
      sessionAffinity: this.sessionAffinity
    });

    const mcpTools = this.mcp.getAITools();
    const mentorTools = createTools(this.state, (update) =>
      this.setState({ ...this.state, ...update })
    );
    const tools = { ...mcpTools, ...mentorTools };

    const result = streamText({
      model,
      system: buildSystemPrompt(this.state),
      messages: pruneMessages({
        messages: inlineDataUrls(await convertToModelMessages(this.messages)),
        toolCalls: "before-last-2-messages"
      }),
      tools,
      stopWhen: stepCountIs(5),
      abortSignal: options?.abortSignal
    });

    return result.toUIMessageStreamResponse();
  }
}

export default {
  async fetch(request: Request, env: Env) {
    return (
      (await routeAgentRequest(request, env)) ||
      new Response("Not found", { status: 404 })
    );
  }
};
