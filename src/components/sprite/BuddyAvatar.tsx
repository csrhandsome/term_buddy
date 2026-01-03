import React from "react";
import { Box, Text } from "ink";
import type { ActivityState } from "../../protocol.js";
import { BubbleSprite } from "./BubbleSprite.js";

const SPRITES: Record<
  ActivityState,
  { color?: string; compact: string; frames: string[] }
> = {
  TYPING: {
    color: "green",
    compact: "( >_<)===3",
    frames: [" /\\_/\\ ", "( >_<) ", " /|_|\\\\ ", "  / \\\\  "],
  },
  IDLE: {
    color: "yellow",
    compact: "( -.-)Zzz",
    frames: [" /\\_/\\ ", "( -.-) ", " /|_|\\\\ ", "  / \\\\  "],
  },
  OFFLINE: {
    color: "gray",
    compact: "( x_x)",
    frames: [" /\\_/\\ ", "( x_x) ", " /|_|\\\\ ", "  / \\\\  "],
  },
};

export function BuddyAvatar(props: {
  state: ActivityState;
  variant?: "frames" | "compact";
  bubbleText?: string | null;
  marginTop?: number;
}) {
  const sprite = SPRITES[props.state];
  if (props.variant === "compact") {
    return (
      <Box
        flexDirection="column"
        alignItems="center"
        marginTop={props.marginTop ?? 1}
      >
        {props.bubbleText ? <BubbleSprite text={props.bubbleText} /> : null}
        <Text color={sprite.color}>{sprite.compact}</Text>
      </Box>
    );
  }

  return (
    <Box
      flexDirection="column"
      alignItems="center"
      marginTop={props.marginTop ?? 1}
    >
      {props.bubbleText ? <BubbleSprite text={props.bubbleText} /> : null}
      {sprite.frames.map((line, i) => (
        <Text key={`${props.state}:${i}`} color={sprite.color}>
          {line}
        </Text>
      ))}
    </Box>
  );
}
