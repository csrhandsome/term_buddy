import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Text, useInput } from "ink";
import type { ActivityState } from "../protocol.js";
import {
  AiConsole,
  BuddyAvatar,
  CountdownClockSprite,
  ProjectileThrowSprite,
  StatusHeader,
} from "../components/index.js";
import type { CountdownClockType } from "../components/sprite/CountdownClockSprite.js";
import type {
  ProjectileDirection,
  ProjectileKind,
} from "../components/sprite/ProjectileThrowSprite.js";
import {
  useActivityMonitor,
  useBroadcaster,
  useTcpSync,
} from "../hooks/index.js";
import { ensureGlobalKeyboard, subscribeGlobalKeydown } from "../hooks/globalKeyboard.js";
import type { LeaveStats } from "../types.js";

function formatMMSS(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function Session(
  props:
    | { role: "host"; localName: string; onLeave: (stats: LeaveStats) => void }
    | {
        role: "client";
        localName: string;
        onLeave: (stats: LeaveStats) => void;
        hostIp: string;
        tcpPort: number;
        roomName: string;
        hostName: string;
      }
) {
  const roomName = useMemo(
    () => `${props.localName}'s Room`,
    [props.localName]
  );

  const [showAi, setShowAi] = useState(false);
  const [countdown, setCountdown] = useState<{
    minutes: number;
    totalSeconds: number;
    endsAt: number;
    remainingSeconds: number;
    type: CountdownClockType;
  } | null>(null);
  const [shots, setShots] = useState<
    Array<{
      id: number;
      kind: ProjectileKind;
      direction: ProjectileDirection;
    }>
  >([]);

  const tcpOptions = useMemo(() => {
    return props.role === "host"
      ? ({ role: "host", localName: props.localName } as const)
      : ({
          role: "client",
          localName: props.localName,
          hostIp: props.hostIp,
          tcpPort: props.tcpPort,
          hostName: props.hostName,
        } as const);
  }, [
    props.role,
    props.localName,
    props.role === "client" ? props.hostIp : "",
    props.role === "client" ? props.tcpPort : 0,
    props.role === "client" ? props.hostName : "",
  ]);

  const tcp = useTcpSync(tcpOptions);

  const broadcasterOptions = useMemo(() => {
    return props.role === "host"
      ? ({
          enabled: true,
          hostName: props.localName,
          roomName,
          tcpPort: tcp.listenPort,
        } as const)
      : ({ enabled: false } as const);
  }, [props.role, props.localName, roomName, tcp.listenPort]);

  useBroadcaster(broadcasterOptions);

  const localActivity = useActivityMonitor();

  const remoteActivity: ActivityState = tcp.remoteState ?? "OFFLINE";

  const onToggleAi = useCallback(() => setShowAi((v) => !v), []);
  const onCloseAi = useCallback(() => setShowAi(false), []);

  const sessionStartAtRef = useRef<number>(Date.now());
  const connectedStartAtRef = useRef<number | null>(null);
  const connectedTotalMsRef = useRef<number>(0);
  const keyPressesRef = useRef<number>(0);
  const useGlobalKeyboardRef = useRef<boolean>(false);

  const countKeyPress = useCallback(() => {
    keyPressesRef.current += 1;
  }, []);

  // Count terminal key presses unless global keyboard listener is active.
  useInput(
    () => {
      if (!useGlobalKeyboardRef.current) countKeyPress();
    },
    { isActive: true }
  );

  // If `TERMBUDDY_ACTIVITY_SOURCE=keyboard`, count global key presses.
  useEffect(() => {
    const raw = process.env.TERMBUDDY_ACTIVITY_SOURCE ?? "ink";
    const source = raw === "xinput" ? "keyboard" : raw;
    if (source !== "keyboard") return;

    let cancelled = false;
    let unsub: (() => void) | null = null;
    void (async () => {
      const ok = await ensureGlobalKeyboard();
      if (cancelled) return;
      if (!ok) return;
      useGlobalKeyboardRef.current = true;
      unsub = subscribeGlobalKeydown(countKeyPress);
    })();

    return () => {
      cancelled = true;
      unsub?.();
      useGlobalKeyboardRef.current = false;
    };
  }, [countKeyPress]);

  // Track connected time.
  useEffect(() => {
    if (tcp.status === "connected") {
      if (connectedStartAtRef.current === null) {
        connectedStartAtRef.current = Date.now();
      }
      return;
    }

    if (connectedStartAtRef.current !== null) {
      connectedTotalMsRef.current += Date.now() - connectedStartAtRef.current;
      connectedStartAtRef.current = null;
    }
  }, [tcp.status]);

  const finishAndLeave = useCallback(() => {
    const endedAt = Date.now();
    let connectedDurationMs = connectedTotalMsRef.current;
    if (connectedStartAtRef.current !== null) {
      connectedDurationMs += endedAt - connectedStartAtRef.current;
    }

    const stats: LeaveStats = {
      keyPresses: keyPressesRef.current,
      sessionDurationMs: endedAt - sessionStartAtRef.current,
      connectedDurationMs,
      startedAt: sessionStartAtRef.current,
      endedAt,
      peerName: tcp.peerName,
    };
    props.onLeave(stats);
  }, [props, tcp.peerName]);

  const startCountdown = useCallback((minutes: number) => {
    const totalSeconds = Math.max(1, Math.floor(minutes * 60));
    const endsAt = Date.now() + totalSeconds * 1000;
    const type: CountdownClockType =
      minutes <= 10 ? "SHORT" : minutes <= 30 ? "MEDIUM" : "LONG";
    setCountdown({
      minutes,
      totalSeconds,
      endsAt,
      remainingSeconds: totalSeconds,
      type,
    });
  }, []);

  const throwProjectile = useCallback(
    (kind: ProjectileKind, direction: ProjectileDirection) => {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      setShots((prev) => [...prev, { id, kind, direction }]);
    },
    []
  );

  useInput(
    (input, key) => {
      if (input === "q") finishAndLeave();
      if (input === "/" && !key.ctrl && !key.meta) onToggleAi();
    },
    { isActive: !showAi }
  );

  useInput(
    (input) => {
      if (input === "x") setCountdown(null);
    },
    { isActive: !showAi && countdown !== null }
  );

  const buddyName =
    props.role === "host"
      ? tcp.peerName ?? "Waiting..."
      : props.hostName ?? "Host";

  const localState = localActivity.state;
  const localLabel =
    props.role === "host"
      ? `${props.localName} (Host)`
      : `${props.localName} (Client)`;

  // Sync local activity state to peer.
  useEffect(() => {
    if (tcp.status !== "connected") return;
    tcp.sendStatus(localState);
  }, [localState, tcp.status, tcp.sendStatus]);

  useEffect(() => {
    if (!countdown) return;
    const endsAt = countdown.endsAt;
    const handle = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setCountdown((prev) => {
        if (!prev) return prev;
        if (prev.endsAt !== endsAt) return prev;
        if (remaining <= 0) return null;
        if (prev.remainingSeconds === remaining) return prev;
        return { ...prev, remainingSeconds: remaining };
      });
    }, 250);
    return () => clearInterval(handle);
  }, [countdown?.endsAt]);

  return (
    <Box flexDirection="column" padding={1}>
      <StatusHeader
        role={props.role}
        status={tcp.status}
        hostIp={props.role === "client" ? props.hostIp : undefined}
        tcpPort={props.role === "client" ? props.tcpPort : tcp.listenPort}
      />

      {/* Main Stage: 3 Columns */}
      <Box
        flexDirection="row"
        alignItems="center"
        justifyContent="space-between"
        marginTop={1}
        gap={2}
      >
        {/* Left: Local User */}
        <Box flexDirection="column" alignItems="center" minWidth={20}>
          {countdown ? (
            <Box flexDirection="column" alignItems="center" marginBottom={0}>
              <Text color="gray">{formatMMSS(countdown.remainingSeconds)}</Text>
              <CountdownClockSprite
                variant="COMPACT"
                type={countdown.type}
                minutes={countdown.minutes}
                totalSeconds={countdown.totalSeconds}
                remainingSeconds={countdown.remainingSeconds}
                showLabel={false}
              />
            </Box>
          ) : (
            <Box height={4} />
          )}
          <BuddyAvatar state={localState} marginTop={0} />
          <Text color="cyan">{localLabel}</Text>
        </Box>

        {/* Center: Stage (Projectiles only) */}
        <Box
          flexDirection="column"
          alignItems="center"
          flexGrow={1}
          minWidth={40}
        >
          {/* Projectile Area */}
          <Box flexDirection="column" width="100%" alignItems="center">
            {shots.map((s) => (
              <ProjectileThrowSprite
                key={String(s.id)}
                kind={s.kind}
                direction={s.direction}
                shotId={s.id}
                width={36}
                onDone={() =>
                  setShots((prev) => prev.filter((x) => x.id !== s.id))
                }
              />
            ))}
            {/* Spacer to maintain layout stability when shots appear/disappear */}
            {shots.length === 0 ? <Box height={1} /> : null}
          </Box>
        </Box>

        {/* Right: Remote User */}
        <Box flexDirection="column" alignItems="center" minWidth={20}>
          {/* Placeholder for remote clock to keep alignment with local user */}
          <Box height={4} />
          <BuddyAvatar state={remoteActivity} marginTop={0} />
          <Text color="magenta">{buddyName}</Text>
        </Box>
      </Box>

      {/* Footer Instructions (Hide when AI is open to save space) */}
      {!showAi ? (
        <Box marginTop={1} justifyContent="center">
          <Text color="gray">
            按 <Text color="cyan">/</Text> 召唤 AI Console，按{" "}
            <Text color="cyan">q</Text> 结束本次陪伴。
            {countdown ? (
              <>
                {" "}
                <Text color="gray">
                  (倒计时中：按 <Text color="cyan">x</Text> 取消)
                </Text>
              </>
            ) : null}
          </Text>
        </Box>
      ) : null}

      {/* AI Console Overlay */}
      {showAi ? (
        <Box
          marginTop={1}
          width="100%"
          flexDirection="row"
          justifyContent="center"
        >
          <Box width={64}>
            <AiConsole
              onClose={onCloseAi}
              onStartCountdown={startCountdown}
              onThrowProjectile={throwProjectile}
              localName={props.localName}
              peerName={
                tcp.peerName ??
                (props.role === "client" ? props.hostName : undefined) ??
                "Buddy"
              }
            />
          </Box>
        </Box>
      ) : null}
    </Box>
  );
}
