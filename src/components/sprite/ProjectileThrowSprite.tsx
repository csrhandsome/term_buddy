import React, { useEffect, useMemo, useState } from "react";
import { Box, Text } from "ink";

export type ProjectileKind = "ROSE" | "POOP" | "HAMMER";
export type ProjectileDirection = "LEFT_TO_RIGHT" | "RIGHT_TO_LEFT";

const PROJECTILES: Record<ProjectileKind, { glyph: string; color: string }> = {
  ROSE: { glyph: "🌹", color: "magenta" },
  POOP: { glyph: "💩", color: "yellow" },
  HAMMER: { glyph: "🔨", color: "cyan" },
};

function clamp01(n: number) {
  if (n <= 0) return 0;
  if (n >= 1) return 1;
  return n;
}

function renderTrack(width: number, pos: number, glyph: string) {
  const w = Math.max(8, Math.floor(width));
  const innerWidth = w - 2;
  if (pos < 0) return `|${new Array(innerWidth).fill("·").join("")}|`;
  const clampedPos = Math.max(0, Math.min(innerWidth - 1, Math.floor(pos)));

  const track = new Array(innerWidth).fill("·");
  track[clampedPos] = glyph;
  return `|${track.join("")}|`;
}

export function ProjectileThrowSprite(props: {
  kind: ProjectileKind;
  direction?: ProjectileDirection;
  width?: number;
  progress?: number;
  shotId?: string | number;
  durationMs?: number;
  leftLabel?: string;
  rightLabel?: string;
  onDone?: () => void;
}) {
  const direction = props.direction ?? "LEFT_TO_RIGHT";
  const width = props.width ?? 28;
  const durationMs = props.durationMs ?? 700;

  const [autoProgress, setAutoProgress] = useState<number | null>(null);
  const progress = typeof props.progress === "number" ? props.progress : autoProgress;

  useEffect(() => {
    if (props.shotId === undefined) return;
    const startedAt = Date.now();
    setAutoProgress(0);

    const handle = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const next = clamp01(elapsed / Math.max(1, durationMs));
      setAutoProgress(next);
      if (next >= 1) {
        clearInterval(handle);
        props.onDone?.();
      }
    }, 33);

    return () => clearInterval(handle);
  }, [durationMs, props.onDone, props.shotId]);

  const projectile = PROJECTILES[props.kind];

  const track = useMemo(() => {
    if (progress === null || !Number.isFinite(progress)) {
      return renderTrack(width, -1, " ");
    }
    const innerWidth = Math.max(8, Math.floor(width)) - 2;
    const rawPos = clamp01(progress) * (innerWidth - 1);
    const pos =
      direction === "LEFT_TO_RIGHT" ? rawPos : (innerWidth - 1 - rawPos);
    return renderTrack(width, pos, projectile.glyph);
  }, [direction, progress, projectile.glyph, width]);

  return (
    <Box>
      {props.leftLabel ? <Text color="gray">{props.leftLabel} </Text> : null}
      <Text color={projectile.color}>{track}</Text>
      {props.rightLabel ? <Text color="gray"> {props.rightLabel}</Text> : null}
    </Box>
  );
}
