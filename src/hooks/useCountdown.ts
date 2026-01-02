import { useCallback, useEffect, useRef, useState } from "react";

function formatMMSS(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function useCountdown() {
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const start = useCallback((minutes: number) => {
    const seconds = Math.max(1, Math.floor(minutes * 60));
    setRemainingSeconds(seconds);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev === null) return null;
        if (prev <= 1) return null;
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    if (remainingSeconds !== null) return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, [remainingSeconds]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return {
    start,
    label: remainingSeconds === null ? null : formatMMSS(remainingSeconds),
  };
}
