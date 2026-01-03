import React, { useMemo } from "react";
import { Box, Text } from "ink";

export type CountdownClockType = "SHORT" | "MEDIUM" | "LONG";
export type CountdownClockVariant = "FULL" | "COMPACT";

export function countdownClockTypeFromMinutes(
  minutes: number
): CountdownClockType {
  if (minutes <= 10) return "SHORT";
  if (minutes <= 30) return "MEDIUM";
  return "LONG";
}

function clamp01(n: number) {
  if (n <= 0) return 0;
  if (n >= 1) return 1;
  return n;
}

const TYPE_STYLE: Record<CountdownClockType, { color: string; label: string }> =
  {
    SHORT: { color: "green", label: "Sprint" },
    MEDIUM: { color: "cyan", label: "Focus" },
    LONG: { color: "magenta", label: "Deep" },
  };

type HandDir = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";

function handFromProgress(progress01: number): HandDir {
  const idx = Math.round(clamp01(progress01) * 7);
  const dirs: HandDir[] = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[idx]!;
}

function renderClockFace(hand: HandDir) {
  const lines = [
    "  .---.  ",
    " /     \\ ",
    "|   •   |",
    " \\     / ",
    "  '---'  ",
  ].map((s) => s.split(""));

  const center = { r: 2, c: 4 };
  const handMap: Record<HandDir, { r: number; c: number; ch: string }> = {
    N: { r: 1, c: 4, ch: "|" },
    NE: { r: 1, c: 5, ch: "/" },
    E: { r: 2, c: 5, ch: "-" },
    SE: { r: 3, c: 5, ch: "\\" },
    S: { r: 3, c: 4, ch: "|" },
    SW: { r: 3, c: 3, ch: "/" },
    W: { r: 2, c: 3, ch: "-" },
    NW: { r: 1, c: 3, ch: "\\" },
  };

  const tip = handMap[hand];
  lines[center.r][center.c] = "•";
  lines[tip.r][tip.c] = tip.ch;

  return lines.map((row) => row.join(""));
}

function renderCompactClockFace(hand: HandDir) {
  const lines = [" .---. ", "|  •  |", " '---' "].map((s) => s.split(""));
  const center = { r: 1, c: 3 };
  const handMap: Record<HandDir, { r: number; c: number; ch: string }> = {
    N: { r: 0, c: 3, ch: "|" },
    NE: { r: 0, c: 4, ch: "/" },
    E: { r: 1, c: 5, ch: "-" },
    SE: { r: 2, c: 4, ch: "\\" },
    S: { r: 2, c: 3, ch: "|" },
    SW: { r: 2, c: 2, ch: "/" },
    W: { r: 1, c: 1, ch: "-" },
    NW: { r: 0, c: 2, ch: "\\" },
  };

  const tip = handMap[hand];
  lines[center.r][center.c] = "•";
  lines[tip.r][tip.c] = tip.ch;

  return lines.map((row) => row.join(""));
}

export function CountdownClockSprite(props: {
  type?: CountdownClockType;
  variant?: CountdownClockVariant;
  minutes?: number;
  label?: string | null;
  showLabel?: boolean;
  totalSeconds?: number;
  remainingSeconds?: number | null;
}) {
  const type =
    props.type ??
    (typeof props.minutes === "number"
      ? countdownClockTypeFromMinutes(props.minutes)
      : "MEDIUM");

  const progress01 = useMemo(() => {
    if (
      typeof props.totalSeconds !== "number" ||
      props.totalSeconds <= 0 ||
      props.remainingSeconds === null ||
      typeof props.remainingSeconds !== "number"
    ) {
      return null;
    }
    return clamp01(props.remainingSeconds / props.totalSeconds);
  }, [props.remainingSeconds, props.totalSeconds]);

  const style = TYPE_STYLE[type];
  const hand = handFromProgress(progress01 ?? 1);
  const caption = props.label ?? style.label;

  if (props.variant === "COMPACT") {
    const face = renderCompactClockFace(hand);
    return (
      <Box flexDirection="column">
        {face.map((line, i) => (
          <Text key={`clock:compact:${type}:${hand}:${i}`} color={style.color}>
            {line}
          </Text>
        ))}
        {props.showLabel === false ? null : (
          <Text color="gray">{caption ?? " "}</Text>
        )}
      </Box>
    );
  }

  const face = renderClockFace(hand);

  return (
    <Box flexDirection="column">
      {face.map((line, i) => (
        <Text key={`clock:${type}:${hand}:${i}`} color={style.color}>
          {line}
        </Text>
      ))}
      {props.showLabel === false ? null : (
        <Text color="gray">{caption ?? " "}</Text>
      )}
    </Box>
  );
}
