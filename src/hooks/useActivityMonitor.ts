import { useCallback, useEffect, useRef, useState } from "react";
import { useInput } from "ink";
import type { ActivityState } from "../protocol.js";
import {
  ensureGlobalKeyboard,
  subscribeGlobalKeydown,
} from "./globalKeyboard.js";

export function useActivityMonitor(options?: {
  idleAfterMs?: number;
  source?: "ink" | "keyboard";
}): {
  state: ActivityState;
} {
  const idleAfterMs = options?.idleAfterMs ?? 1500;
  const [state, setState] = useState<ActivityState>("IDLE");

  const lastActivityRef = useRef<number>(Date.now());

  const markActive = useCallback(() => {
    lastActivityRef.current = Date.now();
    setState("TYPING");
  }, []);

  useInput(() => {
    markActive();
  });

  // Optional global keyboard activity.
  useEffect(() => {
    const rawSource =
      options?.source ?? process.env.TERMBUDDY_ACTIVITY_SOURCE ?? "ink";

    // Back-compat: previous env value.
    const source = rawSource === "xinput" ? "keyboard" : rawSource;
    if (source !== "keyboard") return;

    let cancelled = false;
    let unsub: (() => void) | null = null;
    void (async () => {
      const ok = await ensureGlobalKeyboard();
      if (cancelled) return;
      if (!ok) return;
      unsub = subscribeGlobalKeydown(markActive);
    })();

    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [markActive, options?.source]);

  useEffect(() => {
    const id = setInterval(() => {
      const delta = Date.now() - lastActivityRef.current;
      if (delta >= idleAfterMs) setState("IDLE");
    }, 200);
    return () => clearInterval(id);
  }, [idleAfterMs]);

  return { state };
}
