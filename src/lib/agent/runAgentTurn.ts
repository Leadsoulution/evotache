import { db } from "@/lib/db";
import { sendMessageAsUser } from "@/lib/chatSend";
import { getOpenAIKey } from "@/lib/apiKeyStore";
import { AGENT_TOOL_DEFS, logAgentAction } from "@/lib/agent/tools";
import type { ToolContext } from "@/lib/agent/tools";
import type { AgentTool } from "@/types/agent";

const OPENAI_MODEL = "gpt-4o-mini";
const MAX_TOOL_ITERATIONS = 5;
const MAX_HISTORY_MESSAGES = 30;
// Per-call cap so a slow/hanging OpenAI request can't block the turn (and
// leave the client's typing bubble stuck) indefinitely.
const OPENAI_TIMEOUT_MS = 20_000;
// Overall cap across every iteration of the tool-call loop, so a chain of
// several slow calls can't compound into a multi-minute wait either.
const MAX_TURN_MS = 45_000;

interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
}

interface RunAgentTurnInput {
  agentId: string;
  conversationId: string;
  /** Called with the final reply text right after it's persisted — lets an
   * external channel (e.g. Telegram) mirror the reply out, without this
   * function needing to know anything about where the turn came from. */
  onReply?: (text: string) => Promise<void> | void;
}

/** Runs one agent "turn" in a chat conversation: builds context from the
 * recent thread, lets OpenAI call tools in a loop, then persists the final
 * reply as a normal Message from the agent. Fails silently (matching
 * notifyUser/emailUser's fail-open pattern) if OpenAI isn't configured or
 * errors — a broken agent should never break the human's message send. */
export async function runAgentTurn({ agentId, conversationId, onReply }: RunAgentTurnInput): Promise<void> {
  const apiKey = await getOpenAIKey();
  if (!apiKey) return;

  const agentUser = await db.user.findUnique({ where: { id: agentId }, include: { agentConfig: true } });
  if (!agentUser?.agentConfig) return;

  const conversation = await db.conversation.findUnique({ where: { id: conversationId } });
  if (!conversation) return;

  // Signals the client (polled by useMessages, same cadence as new
  // messages) to show a "typing…" bubble for this agent while the
  // fire-and-forget OpenAI round-trip below is in flight.
  await db.conversation.update({ where: { id: conversationId }, data: { typingAgentIds: { push: agentId } } }).catch(() => {});

  try {
    const history = await db.message.findMany({ where: { conversationId }, orderBy: { createdAt: "desc" }, take: MAX_HISTORY_MESSAGES });
    history.reverse();

    const participantUsers = await db.user.findMany({ where: { id: { in: conversation.participantIds } } });
    const nameById = new Map(participantUsers.map((u) => [u.id, u.name]));

    const ctx: ToolContext = { agentId, agentName: agentUser.name, enabledTools: agentUser.agentConfig.enabledTools as AgentTool[] };
    const availableTools = AGENT_TOOL_DEFS.filter((tool) => tool.requires.some((r) => ctx.enabledTools.includes(r)));

    const today = new Date().toISOString().slice(0, 10);
    const chatMessages: ChatMessage[] = [
      {
        role: "system",
        content: `${agentUser.agentConfig.systemPrompt || `You are ${agentUser.name}, an AI assistant inside EvoTasks.`}\n\nToday's date is ${today}. You are chatting inside the EvoTasks app. Be concise and helpful. Use the available tools to look up real data before answering questions about tasks, litiges, or achats — never guess. When asked to create, update, or send something (a task, litige, purchase item, reminder, etc.), you must actually call the matching tool — never reply that something was done unless the tool call for it actually succeeded. If the web_search tool is available and the question needs current or real-time information (news, prices, weather, anything you can't know from training data), call it instead of saying you don't have access to that information.\n\nFormat replies in markdown to keep them organized and easy to scan: **bold** for key terms, bullet/numbered lists for multiple items, and a markdown table when comparing several items across the same fields (e.g. a list of shops, products, or tasks with multiple attributes each). Use relevant emojis sparingly to make sections easier to spot (e.g. 📍 for a location, 🔗 before a link, ✅ for done items) — don't overdo it. If a diagram would clarify a process, flow, or hierarchy, include one as a \`\`\`mermaid fenced code block (flowchart/sequence/etc. syntax).`,
      },
      ...history.map((m): ChatMessage => ({
        role: m.senderId === agentId ? "assistant" : "user",
        content: m.senderId === agentId ? m.text : `${nameById.get(m.senderId) ?? "User"}: ${m.text}`,
      })),
    ];

    let finalText = "";
    const turnStartedAt = Date.now();
    try {
      for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
        if (Date.now() - turnStartedAt > MAX_TURN_MS) {
          finalText = "Sorry, that's taking longer than expected — please try again.";
          break;
        }
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);
        let response: Response;
        try {
          response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: OPENAI_MODEL,
              messages: chatMessages,
              tools: availableTools.map((tool) => ({ type: "function", function: { name: tool.name, description: tool.description, parameters: tool.parameters } })),
            }),
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timeout);
        }
        if (!response.ok) {
          finalText = "Sorry, I ran into an error and couldn't respond.";
          break;
        }
        const data = await response.json();
        const choice = data?.choices?.[0]?.message;
        if (!choice) {
          finalText = "Sorry, I couldn't generate a response.";
          break;
        }

        if (Array.isArray(choice.tool_calls) && choice.tool_calls.length > 0) {
          chatMessages.push({ role: "assistant", content: choice.content ?? "", tool_calls: choice.tool_calls });
          for (const call of choice.tool_calls) {
            const tool = availableTools.find((t) => t.name === call.function.name);
            let resultText: string;
            if (!tool) {
              resultText = JSON.stringify({ error: "Unknown tool." });
            } else {
              let args: Record<string, unknown> = {};
              try {
                args = JSON.parse(call.function.arguments || "{}");
                const result = await tool.execute(args, ctx);
                resultText = JSON.stringify(result);
                await logAgentAction(ctx, tool.name, `Called ${tool.name}`, args, true);
              } catch (err) {
                const message = err instanceof Error ? err.message : "Tool failed.";
                resultText = JSON.stringify({ error: message });
                await logAgentAction(ctx, tool.name, `Called ${tool.name}`, args, false, message);
              }
            }
            chatMessages.push({ role: "tool", tool_call_id: call.id, content: resultText });
          }
          continue;
        }

        finalText = choice.content ?? "";
        break;
      }
    } catch {
      finalText = "Sorry, I ran into an error and couldn't respond.";
    }

    if (!finalText.trim()) finalText = "I don't have a response right now.";

    await sendMessageAsUser({ conversation, senderId: agentId, senderName: agentUser.name, text: finalText });
    await onReply?.(finalText);
  } finally {
    const current = await db.conversation.findUnique({ where: { id: conversationId }, select: { typingAgentIds: true } });
    if (current) {
      await db.conversation
        .update({ where: { id: conversationId }, data: { typingAgentIds: current.typingAgentIds.filter((id) => id !== agentId) } })
        .catch(() => {});
    }
  }
}
