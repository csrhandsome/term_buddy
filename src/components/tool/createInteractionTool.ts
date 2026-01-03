import { tool } from "langchain";
import type {
  ProjectileDirection,
  ProjectileKind,
} from "../sprite/ProjectileThrowSprite.js";

const KIND_ALIASES: Array<{ kind: ProjectileKind; keys: string[] }> = [
  { kind: "ROSE", keys: ["rose", "花", "玫瑰", "🌹", "love"] },
  { kind: "POOP", keys: ["poop", "屎", "💩", "大便"] },
  { kind: "HAMMER", keys: ["hammer", "锤", "🔨", "敲", "打"] },
];

function normalizeKind(raw: unknown): ProjectileKind | null {
  if (typeof raw !== "string") return null;
  const upper = raw.toUpperCase().trim();
  if (upper === "ROSE" || upper === "POOP" || upper === "HAMMER") return upper;

  const lower = raw.toLowerCase();
  for (const item of KIND_ALIASES) {
    if (item.keys.some((k) => lower.includes(k))) return item.kind;
  }
  return null;
}

function normalizeDirection(raw: unknown): ProjectileDirection | null {
  if (typeof raw !== "string") return null;
  const upper = raw.toUpperCase().trim();
  if (upper === "LEFT_TO_RIGHT" || upper === "RIGHT_TO_LEFT") return upper;
  return null;
}

export function createInteractionTool(options: {
  onThrow?: (kind: ProjectileKind, direction: ProjectileDirection) => void;
}) {
  return tool(
    async (input: { kind?: string; direction?: string; message?: string }) => {
      const kind = normalizeKind(input.kind ?? "") ?? "ROSE";
      const direction = normalizeDirection(input.direction) ?? "LEFT_TO_RIGHT";
      options.onThrow?.(kind, direction);
      const msg = (input.message ?? "").trim();
      return msg ? `已投掷 ${kind}：${msg}` : `已投掷 ${kind}。`;
    },
    {
      name: "throw_projectile",
      description: "和同桌互动：投掷一个小物品（🌹/💩/🔨）。",
      schema: {
        type: "object",
        properties: {
          kind: {
            type: "string",
            description:
              "投掷物类型（ROSE/POOP/HAMMER，或任意描述如“玫瑰/锤子/💩”）",
          },
          direction: {
            type: "string",
            enum: ["LEFT_TO_RIGHT", "RIGHT_TO_LEFT"],
            description: "飞行方向",
          },
          message: { type: "string", description: "附带一句话（可选）" },
        },
        required: [],
        additionalProperties: false,
      },
    }
  );
}

