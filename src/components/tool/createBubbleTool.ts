import { tool } from "langchain";

export type BubbleTarget = "local" | "buddy";

export function createBubbleTool(options: {
  onShowBubble?: (args: {
    text: string;
    target: BubbleTarget;
    durationMs: number;
  }) => void;
}) {
  return tool(
    async (input: { text?: string; target?: BubbleTarget; durationMs?: number }) => {
      const text = String(input.text ?? "").trim();
      if (!text) return "气泡内容为空。";

      const target: BubbleTarget =
        input.target === "buddy" || input.target === "local"
          ? input.target
          : "local";

      const durationRaw = Number(input.durationMs ?? 2500);
      const durationMs =
        Number.isFinite(durationRaw) && durationRaw > 0
          ? Math.min(15_000, Math.max(300, Math.floor(durationRaw)))
          : 2500;

      options.onShowBubble?.({ text, target, durationMs });
      return `已显示气泡：${text}`;
    },
    {
      name: "show_bubble",
      description: "在小猫头像上显示一个气泡（短消息提示）。",
      schema: {
        type: "object",
        properties: {
          text: {
            type: "string",
            minLength: 1,
            maxLength: 120,
            description: "气泡里的文字",
          },
          target: {
            type: "string",
            enum: ["local", "buddy"],
            description: "显示在哪一侧的小猫上（local=我，buddy=同桌）",
          },
          durationMs: {
            type: "integer",
            minimum: 300,
            maximum: 15000,
            description: "显示时长（毫秒，可选）",
          },
        },
        required: ["text"],
        additionalProperties: false,
      },
    }
  );
}

