import React, { useEffect, useMemo, useState } from "react";
import { Box, Text, useInput } from "ink";
import { useAiAgent } from "../hooks/index.js";
import { loadStoredApiKey, saveStoredApiKey } from "../storage/apiKey.js";
import type {
  ProjectileDirection,
  ProjectileKind,
} from "./sprite/ProjectileThrowSprite.js";

export function AiConsole(props: {
  onClose: () => void;
  onStartCountdown: (minutes: number) => void;
  onThrowProjectile: (
    kind: ProjectileKind,
    direction: ProjectileDirection
  ) => void;
  localName: string;
  peerName: string;
}) {
  const [input, setInput] = useState("");
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [keyDraft, setKeyDraft] = useState("");
  const [keyStatus, setKeyStatus] = useState<
    "loading" | "missing" | "ready" | "saving"
  >("loading");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const stored = await loadStoredApiKey();
      if (cancelled) return;
      if (stored) {
        setApiKey(stored);
        setKeyStatus("ready");
      } else {
        setKeyStatus("missing");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const agent = useAiAgent({
    localName: props.localName,
    peerName: props.peerName,
    onStartCountdown: props.onStartCountdown,
    onThrowProjectile: props.onThrowProjectile,
    apiKey: apiKey ?? undefined,
  });

  const helpLine = useMemo(
    () => "示例：倒计时20分钟 / 聊会天 / 和别人互动一下",
    []
  );

  useInput(
    (ch, key) => {
      if (key.escape) {
        props.onClose();
        return;
      }

      if (keyStatus !== "ready") {
        if (key.return) {
          const draft = keyDraft.trim();
          if (!draft) return;
          setKeyStatus("saving");
          void (async () => {
            await saveStoredApiKey(draft);
            setApiKey(draft);
            setKeyDraft("");
            setKeyStatus("ready");
          })();
          return;
        }

        if (key.backspace || key.delete) {
          setKeyDraft((s) => s.slice(0, -1));
          return;
        }

        if (key.ctrl || key.meta) return;
        if (ch) setKeyDraft((s) => s + ch);
        return;
      }

      if (key.return) {
        const line = input.trim();
        setInput("");
        if (!line) return;
        void agent.ask(line);
        return;
      }

      if (key.backspace || key.delete) {
        setInput((s) => s.slice(0, -1));
        return;
      }

      if (key.ctrl || key.meta) return;
      if (ch) setInput((s) => s + ch);
    },
    { isActive: true }
  );

  const lines = agent.lines.filter((l) => l.text.trim().length > 0).slice(-6);

  return (
    <Box flexDirection="column" borderStyle="round" paddingX={1} paddingY={0}>
      <Box justifyContent="space-between" marginBottom={0}>
        <Text color="cyan">AI Console</Text>
        <Text color="gray">
          {keyStatus === "saving"
            ? "Saving…"
            : agent.busy
            ? "Thinking…"
            : "Esc Close"}
        </Text>
      </Box>

      <Box flexDirection="column">
        {keyStatus === "loading" ? (
          <Text color="gray">Checking API Key...</Text>
        ) : keyStatus === "missing" || keyStatus === "saving" ? (
          <Text color="yellow">
            Setup: Enter DeepSeek API Key (saves to{" "}
            <Text color="cyan">src/assets/key.json</Text>)
          </Text>
        ) : lines.length === 0 ? (
          <Text color="gray">{helpLine}</Text>
        ) : null}
      </Box>

      <Box flexDirection="column" marginTop={0} minHeight={6}>
        {keyStatus === "ready" ? (
          <>
            {lines.map((l, i) => (
              <Text
                key={`${l.kind}:${l.at}:${i}`}
                color={l.kind === "user" ? "yellow" : "white"}
                wrap="truncate-end"
              >
                {l.kind === "user" ? "> " : ""}
                {l.text}
              </Text>
            ))}
          </>
        ) : (
          <Text color="gray">Please enter API Key to proceed.</Text>
        )}
      </Box>

      <Box
        marginTop={0}
        borderStyle="single"
        borderTop={true}
        borderBottom={false}
        borderLeft={false}
        borderRight={false}
      >
        <Text color="green">{">"} </Text>
        {keyStatus === "ready" ? (
          <Text>{input}</Text>
        ) : (
          <Text>
            {keyDraft.length === 0
              ? ""
              : "*".repeat(Math.min(64, keyDraft.length))}
          </Text>
        )}
      </Box>
    </Box>
  );
}
