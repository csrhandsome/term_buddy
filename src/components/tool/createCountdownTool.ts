import { tool } from "langchain";

export function createCountdownTool(options: {
  onStartCountdown?: (minutes: number) => void;
}) {
  return tool(
    async (input: { minutes: number }) => {
      const minutes = Number(input.minutes);
      if (!Number.isFinite(minutes) || minutes <= 0) return "倒计时分钟数无效。";
      options.onStartCountdown?.(minutes);
      return `已开始倒计时 ${minutes} 分钟。`;
    },
    {
      name: "start_countdown",
      description: "开始一个专注倒计时（分钟）。",
      schema: {
        type: "object",
        properties: {
          minutes: {
            type: "integer",
            minimum: 1,
            maximum: 180,
            description: "倒计时分钟数",
          },
        },
        required: ["minutes"],
        additionalProperties: false,
      },
    }
  );
}

