import React, { useMemo } from "react";
import { Box, Text, useInput } from "ink";
import type { LeaveStats } from "../types.js";

function formatDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}小时${minutes}分${seconds}秒`;
  if (minutes > 0) return `${minutes}分${seconds}秒`;
  return `${seconds}秒`;
}

export function LeavePage(props: {
  stats: LeaveStats;
  onBack: () => void;
  onExit: () => void;
}) {
  useInput((input, key) => {
    if (key.escape || input === "q") props.onExit();
    if (key.return || input === " ") props.onBack();
  });

  const sessionLabel = useMemo(
    () => formatDuration(props.stats.sessionDurationMs),
    [props.stats.sessionDurationMs]
  );
  const connectedLabel = useMemo(
    () => formatDuration(props.stats.connectedDurationMs),
    [props.stats.connectedDurationMs]
  );

  return (
    <Box flexDirection="column" padding={1} alignItems="center">
      {/* <Text color="cyan">
        {String.raw`
  ____                _                _ 
 / ___|  ___ ___     | |    __ _| |_| |
 \___ \ / _ \ _ \    | |   / _' | __| |
  ___) |  __/  __/   | |__| (_| | |_|_|
 |____/ \___|\___|___|_____\__,_|\__(_)
                |_____|                
`}
      </Text> */}

      <Box
        flexDirection="column"
        marginTop={1}
        borderStyle="round"
        paddingX={2}
        borderColor="gray"
      >
        <Text color="white" bold>
          {props.stats.peerName
            ? `与 ${props.stats.peerName} 的同频记录`
            : "本次专注记录"}
        </Text>

        <Box marginTop={1} flexDirection="column" gap={1}>
          <Box justifyContent="space-between" width={30}>
            <Text>⌨️ 键盘敲击</Text>
            <Text color="yellow">{props.stats.keyPresses}</Text>
          </Box>
          <Box justifyContent="space-between" width={30}>
            <Text>⏱️ 总共时长</Text>
            <Text color="green">{sessionLabel}</Text>
          </Box>
          <Box justifyContent="space-between" width={30}>
            <Text>🔗 连线时长</Text>
            <Text color="blue">{connectedLabel}</Text>
          </Box>
        </Box>
      </Box>

      <Box marginTop={1}>
        <Text color="gray">
          按 <Text color="white">Enter</Text> 返回菜单，或{" "}
          <Text color="red">q</Text> 退出程序
        </Text>
      </Box>
    </Box>
  );
}
