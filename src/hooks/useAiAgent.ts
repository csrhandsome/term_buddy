import { useCallback, useEffect, useRef, useState } from "react";
import { createAgent } from "langchain";
import { ChatOpenAI } from "@langchain/openai";
import {
  createCountdownTool,
  createInteractionTool,
  createSessionInfoTool,
} from "../components/tool/index.js";
import type {
  ProjectileDirection,
  ProjectileKind,
} from "../components/sprite/ProjectileThrowSprite.js";
type LineKind = "user" | "ai" | "system";
export type AiLine = { kind: LineKind; text: string; at: number };

function contentToText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!content) return "";
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (typeof part === "object" && part && "text" in part)
          return String((part as any).text ?? "");
        return "";
      })
      .join("");
  }
  if (typeof content === "object" && "text" in (content as any))
    return String((content as any).text ?? "");
  return String(content);
}

function lastAiText(messages: unknown[]): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m: any = messages[i];
    const type =
      typeof m?.getType === "function"
        ? m.getType()
        : typeof m?._getType === "function"
        ? m._getType()
        : m?.type;
    if (type === "ai") {
      const t = contentToText(m?.content);
      return t || "";
    }
  }
  return null;
}

function createSystemPrompt(context: { localName: string; peerName: string }) {
  return [
    "你是 TermBuddy 里的“壳中幽灵 (Ghost in the Shell)”。",
    "默认隐形；被 / 唤醒时出现。风格：极简、干练、少废话。",
    "你可以使用工具来操控应用功能（例如倒计时）。",
    "如果用户提到“倒计时/专注/计时/countdown”，优先调用 start_countdown。",
    "如果用户提到“互动/扔/投掷/throw”，优先调用 throw_projectile。",
    `当前上下文：我叫 ${context.localName}；同桌叫 ${context.peerName}。`,
  ].join("\n");
}

export function useAiAgent(options: {
  localName: string;
  peerName: string;
  onStartCountdown?: (minutes: number) => void;
  onThrowProjectile?: (kind: ProjectileKind, direction: ProjectileDirection) => void;
  apiKey?: string;
}) {
  const [lines, setLines] = useState<AiLine[]>([]);
  const [busy, setBusy] = useState(false);

  const agentRef = useRef<Awaited<ReturnType<typeof createAgent>> | null>(null);
  const agentInitRef = useRef<Promise<
    Awaited<ReturnType<typeof createAgent>>
  > | null>(null);
  const agentKeyRef = useRef<string | null>(null);
  const stateRef = useRef<{ messages: unknown[] }>({ messages: [] });
  const abortRef = useRef<AbortController | null>(null);

  const append = useCallback((line: AiLine) => {
    setLines((prev) => [...prev, line]);
  }, []);

  const updateLine = useCallback((at: number, text: string) => {
    setLines((prev) => {
      const idx = prev.findIndex((l) => l.at === at);
      if (idx === -1) return prev;
      const next = [...prev];
      next[idx] = { ...next[idx], text };
      return next;
    });
  }, []);

  const ensureAgent = useCallback(async () => {
    const apiKey = (options.apiKey ?? "").trim();
    if (!apiKey) throw new Error("missing_api_key");

    if (agentRef.current && agentKeyRef.current === apiKey)
      return agentRef.current;

    agentRef.current = null;
    agentInitRef.current = null;
    agentKeyRef.current = apiKey;
    stateRef.current.messages = [];

    agentInitRef.current ??= (async () => {
      const startCountdown = createCountdownTool({
        onStartCountdown: options.onStartCountdown,
      });

      const sessionInfo = createSessionInfoTool({
        localName: options.localName,
        peerName: options.peerName,
      });

      const interaction = createInteractionTool({
        onThrow: options.onThrowProjectile,
      });

      const llm = new ChatOpenAI({
        model: "deepseek-chat",
        configuration: {
          baseURL: "https://api.deepseek.com",
        },
        apiKey: apiKey,
        temperature: 0.1,
        maxTokens: 1000,
        timeout: 30000,
      });
      return createAgent({
        model: llm,
        tools: [startCountdown, interaction, sessionInfo],
        systemPrompt: createSystemPrompt({
          localName: options.localName,
          peerName: options.peerName,
        }),
        name: "ghost",
      });
    })();

    agentRef.current = await agentInitRef.current;
    return agentRef.current;
  }, [
    options.apiKey,
    options.localName,
    options.onStartCountdown,
    options.onThrowProjectile,
    options.peerName,
  ]);

  const ask = useCallback(
    async (text: string) => {
      const userAt = Date.now();
      const aiAt = userAt + 1;
      const toolAt = userAt + 2;
      setLines([
        { kind: "user", text: `> ${text}`, at: userAt },
        { kind: "ai", text: "…", at: aiAt },
        { kind: "system", text: "", at: toolAt },
      ]);

      abortRef.current?.abort();
      abortRef.current = new AbortController();

      setBusy(true);
      try {
        const agent = await ensureAgent();
        const stream = await agent.stream(
          {
            messages: [{ role: "user", content: text }],
          },
          {
            streamMode: "values",
            signal: abortRef.current.signal,
          } as any
        );

        for await (const chunk of stream as any) {
          const messages = (chunk?.messages ?? []) as unknown[];
          if (messages.length > 0) stateRef.current.messages = messages;

          const latest: any = messages.at(-1);
          if (latest?.tool_calls?.length) {
            const names = latest.tool_calls
              .map((tc: any) => tc?.name)
              .filter(Boolean)
              .join(", ");
            if (names) updateLine(toolAt, `Calling tools: ${names}`);
            continue;
          }

          const t = lastAiText(messages);
          if (t !== null) updateLine(aiAt, t);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg === "missing_api_key")
          updateLine(aiAt, "请先在 AI Console 输入 DeepSeek API Key。");
        else updateLine(aiAt, `（AI 出错）${msg}`);
      } finally {
        setBusy(false);
      }
    },
    [append, ensureAgent, updateLine]
  );

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  return { lines, ask, busy };
}
