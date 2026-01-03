import React, { useMemo } from "react";
import { Box, Text } from "ink";

function wrapText(text: string, maxWidth: number) {
  const chars = Array.from(text);
  const lines: string[] = [];
  for (let i = 0; i < chars.length; i += maxWidth) {
    lines.push(chars.slice(i, i + maxWidth).join(""));
  }
  return lines.length ? lines : [""];
}

function renderBubbleLines(text: string, maxInnerWidth: number) {
  const contentLines = wrapText(text, maxInnerWidth);
  const innerWidth = Math.min(
    maxInnerWidth,
    Math.max(...contentLines.map((l) => Array.from(l).length), 1)
  );

  const top = `╭${"─".repeat(innerWidth + 2)}╮`;
  
  // Create a bottom line with a little tail "v" in the middle
  const tailPos = Math.floor((innerWidth + 2) / 2);
  const bottomChars = Array.from(`╰${"─".repeat(innerWidth + 2)}╯`);
  if (bottomChars[tailPos]) bottomChars[tailPos] = "v"; // Simple tail
  const bottom = bottomChars.join("");

  const middle = contentLines.map((l) => {
    const pad = innerWidth - Array.from(l).length;
    return `│ ${l}${" ".repeat(Math.max(0, pad))} │`;
  });
  return [top, ...middle, bottom];
}

export function BubbleSprite(props: {
  text: string;
  maxInnerWidth?: number;
  color?: string;
}) {
  const trimmed = props.text.trim();
  const maxInnerWidth = props.maxInnerWidth ?? 18;

  const lines = useMemo(() => {
    if (!trimmed) return null;
    return renderBubbleLines(trimmed, maxInnerWidth);
  }, [maxInnerWidth, trimmed]);

  if (!lines) return null;

  return (
    <Box flexDirection="column" alignItems="center">
      {lines.map((line, i) => (
        <Text key={`bubble:${i}`} color={props.color ?? "gray"}>
          {line}
        </Text>
      ))}
    </Box>
  );
}

