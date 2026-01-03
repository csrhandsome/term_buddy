import { tool } from "langchain";

// Target can be 1-4 (No.1 to No.4)
export type BubbleTarget = number;

export function createBubbleTool(options: {
  onShowBubble?: (args: {
    text: string;
    target: BubbleTarget;
    durationMs: number;
  }) => void;
}) {
  return tool(
    async (input: { text?: string; target?: number | string; durationMs?: number }) => {
      const text = String(input.text ?? "").trim();
      if (!text) return "气泡内容为空。";

      // Parse target: can be number 1-4, or "local"/"buddy" for backward compatibility
      let target: number = 1; // default to No.1 (local)
      if (typeof input.target === "number") {
        target = Math.max(1, Math.min(4, Math.floor(input.target)));
      } else if (typeof input.target === "string") {
        const t = input.target.toLowerCase();
        if (t === "local" || t === "1") {
          target = 1;
        } else if (t === "buddy" || t === "2") {
          target = 2;
        } else if (t === "3") {
          target = 3;
        } else if (t === "4") {
          target = 4;
        } else {
          // Try to parse as number
          const parsed = parseInt(t, 10);
          if (!isNaN(parsed) && parsed >= 1 && parsed <= 4) {
            target = parsed;
          }
        }
      }

      const durationRaw = Number(input.durationMs ?? 2500);
      const durationMs =
        Number.isFinite(durationRaw) && durationRaw > 0
          ? Math.min(15_000, Math.max(300, Math.floor(durationRaw)))
          : 2500;

      options.onShowBubble?.({ text, target, durationMs });
      return `已显示气泡给 No.${target}：${text}`;
    },
    {
      name: "show_bubble",
      description: "在指定用户的小猫头像上显示一个气泡（短消息提示）。",
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
            type: "integer",
            minimum: 1,
            maximum: 4,
            description: "显示在哪个用户的小猫上（1=No.1/本地用户，2=No.2，3=No.3，4=No.4）",
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

