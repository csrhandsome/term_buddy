import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Text, useInput } from "ink";
import type { ActivityState } from "../protocol.js";
import {
  AiConsole,
  BuddyAvatar,
  CountdownClockSprite,
  ProjectileThrowSprite,
  StatusHeader,
  InfoPanel,
} from "../components/index.js";
import type { InfoRecord } from "../components/index.js";
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
  // Bubbles for all 4 users: index 0 = local (No.1), 1-3 = peers (No.2-4)
  const [peerBubbles, setPeerBubbles] = useState<(string | null)[]>([null, null, null, null]);
  const bubbleTimersRef = useRef<(NodeJS.Timeout | null)[]>([null, null, null, null]);

  // Info records for logging events
  const [infoRecords, setInfoRecords] = useState<InfoRecord[]>([]);
  const nextRecordIdRef = useRef<number>(1);

  const addInfoRecord = useCallback((type: InfoRecord["type"], content: string) => {
    const record: InfoRecord = {
      id: nextRecordIdRef.current++,
      timestamp: Date.now(),
      type,
      content,
    };
    setInfoRecords(prev => [...prev, record]);
  }, []);

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

  // Use peers array from TCP sync for multi-peer support
  const peers = tcp.peers;
  const firstPeerName = peers.length > 0 ? peers[0].name : undefined;
  const prevPeersRef = useRef<typeof peers>([]);

  // Track peer joins and leaves
  useEffect(() => {
    const prevPeers = prevPeersRef.current;
    const prevNames = new Set(prevPeers.map(p => p.name));
    const currentNames = new Set(peers.map(p => p.name));

    // Check for new peers
    peers.forEach(p => {
      if (!prevNames.has(p.name)) {
        addInfoRecord("join", `${p.name} joined`);
      }
    });

    // Check for left peers
    prevPeers.forEach(p => {
      if (!currentNames.has(p.name)) {
        addInfoRecord("leave", `${p.name} left`);
      }
    });

    prevPeersRef.current = [...peers];
  }, [peers, addInfoRecord]);

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
      peerName: firstPeerName,
    };
    props.onLeave(stats);
  }, [props, firstPeerName]);

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
    addInfoRecord("countdown", `Started ${minutes}min countdown`);
  }, [addInfoRecord]);

  const nextShotIdRef = useRef<number>(1);
  const shotQueueRef = useRef<
    Array<{ kind: ProjectileKind; direction: ProjectileDirection }>
  >([]);

  const pumpShotQueue = useCallback(() => {
    setShots((prev) => {
      if (prev.length >= 1) return prev;
      const next = shotQueueRef.current.shift();
      if (!next) return prev;
      const id = nextShotIdRef.current++;
      return [...prev, { id, kind: next.kind, direction: next.direction }];
    });
  }, []);

  useEffect(() => {
    if (shots.length === 0) pumpShotQueue();
  }, [shots.length, pumpShotQueue]);

  const throwProjectile = useCallback(
    (kind: ProjectileKind, direction: ProjectileDirection) => {
      shotQueueRef.current.push({ kind, direction });
      pumpShotQueue();
      if (tcp.status === "connected") tcp.sendProjectile(kind, direction);
      addInfoRecord("projectile", `Threw ${kind}`);
    },
    [pumpShotQueue, tcp, addInfoRecord]
  );

  const showBubble = useCallback(
    (args: { text: string; target: number; durationMs: number }) => {
      const text = args.text.trim();
      if (!text) return;
      const durationMs = Math.max(300, Math.min(15_000, Math.floor(args.durationMs)));

      // target is 1-4 (No.1 to No.4), convert to 0-3 index
      const targetIndex = Math.max(0, Math.min(3, args.target - 1));

      setPeerBubbles(prev => {
        const next = [...prev];
        next[targetIndex] = text;
        return next;
      });

      const prevTimer = bubbleTimersRef.current[targetIndex];
      if (prevTimer) clearTimeout(prevTimer);

      const handle = setTimeout(() => {
        setPeerBubbles(prev => {
          const next = [...prev];
          next[targetIndex] = null;
          return next;
        });
        bubbleTimersRef.current[targetIndex] = null;
      }, durationMs);

      bubbleTimersRef.current[targetIndex] = handle;

      addInfoRecord("bubble", `No.${args.target}: "${text}"`);
    },
    [addInfoRecord]
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

  // Handle incoming projectiles from peer (flip direction)
  useEffect(() => {
    const handleRemoteProjectile = (kind: ProjectileKind, direction: ProjectileDirection, _senderName?: string) => {
      const flippedDirection: ProjectileDirection =
        direction === "LEFT_TO_RIGHT" ? "RIGHT_TO_LEFT" : "LEFT_TO_RIGHT";
      shotQueueRef.current.push({ kind, direction: flippedDirection });
      pumpShotQueue();
    };

    tcp.setOnRemoteProjectile(handleRemoteProjectile);
  }, [tcp, pumpShotQueue]);

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

  useEffect(() => {
    return () => {
      bubbleTimersRef.current.forEach(timer => {
        if (timer) clearTimeout(timer);
      });
    };
  }, []);

  return (
    <Box flexDirection="column" padding={1}>
      <StatusHeader
        role={props.role}
        status={tcp.status}
        hostIp={props.role === "client" ? props.hostIp : undefined}
        tcpPort={props.role === "client" ? props.tcpPort : tcp.listenPort}
        peerCount={peers.length}
      />

      {/* Main Stage: 2x2 Grid Layout for 4 Users */}
      <Box flexDirection="column" marginTop={1}>
        {/* Projectile Area at Top */}
        <Box flexDirection="column" width="100%" alignItems="center" marginBottom={1}>
          {shots.map((s) => (
            <ProjectileThrowSprite
              key={String(s.id)}
              kind={s.kind}
              direction={s.direction}
              shotId={s.id}
              width={50}
              onDone={() =>
                setShots((prev) => prev.filter((x) => x.id !== s.id))
              }
            />
          ))}
          {shots.length === 0 ? <Box height={1} /> : null}
        </Box>

        {/* Countdown Timer (shared) */}
        {countdown ? (
          <Box justifyContent="center" marginBottom={1}>
            <Box flexDirection="column" alignItems="center">
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
          </Box>
        ) : null}

        {/* 2x2 Grid of Users */}
        <Box flexDirection="column" alignItems="center">
          {/* Row 1: User 1 (Local) and User 2 */}
          <Box flexDirection="row" justifyContent="center" gap={4}>
            {/* No.1 - Local User */}
            <Box flexDirection="column" alignItems="center" minWidth={18}>
              <Text color="cyan" bold>No.1 {props.localName}</Text>
              <BuddyAvatar state={localState} marginTop={0} bubbleText={peerBubbles[0] ?? null} />
            </Box>

            {/* No.2 - First Peer */}
            <Box flexDirection="column" alignItems="center" minWidth={18}>
              {peers.length >= 1 ? (
                <>
                  <Text color="magenta" bold>No.2 {peers[0].name}</Text>
                  <BuddyAvatar state={peers[0].state} marginTop={0} bubbleText={peerBubbles[1] ?? null} />
                </>
              ) : (
                <>
                  <Text color="gray">No.2 (Empty)</Text>
                  <BuddyAvatar state="OFFLINE" marginTop={0} />
                </>
              )}
            </Box>
          </Box>

          {/* Row 2: User 3 and User 4 */}
          <Box flexDirection="row" justifyContent="center" gap={4} marginTop={1}>
            {/* No.3 - Second Peer */}
            <Box flexDirection="column" alignItems="center" minWidth={18}>
              {peers.length >= 2 ? (
                <>
                  <Text color="magenta" bold>No.3 {peers[1].name}</Text>
                  <BuddyAvatar state={peers[1].state} marginTop={0} bubbleText={peerBubbles[2] ?? null} />
                </>
              ) : (
                <>
                  <Text color="gray">No.3 (Empty)</Text>
                  <BuddyAvatar state="OFFLINE" marginTop={0} />
                </>
              )}
            </Box>

            {/* No.4 - Third Peer */}
            <Box flexDirection="column" alignItems="center" minWidth={18}>
              {peers.length >= 3 ? (
                <>
                  <Text color="magenta" bold>No.4 {peers[2].name}</Text>
                  <BuddyAvatar state={peers[2].state} marginTop={0} bubbleText={peerBubbles[3] ?? null} />
                </>
              ) : (
                <>
                  <Text color="gray">No.4 (Empty)</Text>
                  <BuddyAvatar state="OFFLINE" marginTop={0} />
                </>
              )}
            </Box>
          </Box>
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

      {/* AI Console and Info Panel (side by side) */}
      {showAi ? (
        <Box
          marginTop={1}
          width="100%"
          flexDirection="row"
          justifyContent="center"
          gap={2}
        >
          <Box width={48}>
            <AiConsole
              onClose={onCloseAi}
              onStartCountdown={startCountdown}
              onShowBubble={showBubble}
              onThrowProjectile={throwProjectile}
              localName={props.localName}
              peerName={
                firstPeerName ??
                (props.role === "client" ? props.hostName : undefined) ??
                "Buddy"
              }
              peers={peers}
            />
          </Box>
          <Box width={32}>
            <InfoPanel records={infoRecords} maxRecords={6} />
          </Box>
        </Box>
      ) : null}
    </Box>
  );
}
