import { tool } from "langchain";

export function createSessionInfoTool(options: {
  localName: string;
  peerName: string;
}) {
  return tool(
    async () => {
      return JSON.stringify(
        {
          localName: options.localName,
          peerName: options.peerName,
        },
        null,
        2
      );
    },
    {
      name: "session_info",
      description: "获取当前会话上下文（本地昵称、同桌昵称）。",
      schema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    }
  );
}

