import React, { useMemo, useState } from "react";
import os from "node:os";
import { Box, Text, useInput } from "ink";

function defaultNick(): string {
  try {
    return os.userInfo().username || os.hostname();
  } catch {
    return os.hostname();
  }
}

export function NicknamePrompt(props: {
  onSubmit: (nickname: string) => void;
  onExit: () => void;
}) {
  const initial = useMemo(() => defaultNick(), []);
  const [nickname, setNickname] = useState(initial);
  const [touched, setTouched] = useState(false);

  useInput((input, key) => {
    if (key.escape) props.onExit();

    if (key.return) {
      const name = nickname.trim();
      if (!name) return;
      props.onSubmit(name);
      return;
    }

    if (key.backspace || key.delete) {
      setTouched(true);
      setNickname((v) => v.slice(0, -1));
      return;
    }

    if (key.ctrl || key.meta) return;
    if (!input) return;
    if (input === "\t") return;

    setTouched(true);
    setNickname((v) => v + input);
  });

  const hint = touched ? "" : " (回车确认，可直接用默认值)";

  return (
    <Box flexDirection="column" padding={1}>
      <Text color="gray">欢迎来到 TermBuddy</Text>
      <Box marginTop={1}>
        <Text>
          请输入你的昵称：<Text color="cyan">{nickname || ""}</Text>
          <Text color="gray">{hint}</Text>
        </Text>
      </Box>
      <Box marginTop={1}>
        <Text color="gray">按 Esc 退出。</Text>
      </Box>
    </Box>
  );
}

