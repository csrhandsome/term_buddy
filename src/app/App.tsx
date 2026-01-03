import React, { useCallback, useMemo, useState } from "react";
import os from "node:os";
import { useApp } from "ink";
import {
  LeavePage,
  MainMenu,
  NicknamePrompt,
  RoomScanner,
  Session,
} from "../page/index.js";
import type { LeaveStats } from "../types.js";

type View =
  | { name: "NICKNAME" }
  | { name: "MENU" }
  | { name: "SCANNING" }
  | { name: "LEAVE"; stats: LeaveStats }
  | { name: "SESSION"; role: "host" }
  | {
      name: "SESSION";
      role: "client";
      hostIp: string;
      tcpPort: number;
      roomName: string;
      hostName: string;
    };

export function App() {
  const { exit } = useApp();
  const [view, setView] = useState<View>({ name: "NICKNAME" });
  const [nickname, setNickname] = useState<string | null>(null);

  const localName = useMemo(() => nickname ?? os.hostname(), [nickname]);

  const goMenu = useCallback(() => setView({ name: "MENU" }), []);

  if (view.name === "NICKNAME") {
    return (
      <NicknamePrompt
        onExit={() => exit()}
        onSubmit={(name) => {
          setNickname(name);
          setView({ name: "MENU" });
        }}
      />
    );
  }

  if (view.name === "MENU") {
    return (
      <MainMenu
        onHost={() => setView({ name: "SESSION", role: "host" })}
        onJoin={() => setView({ name: "SCANNING" })}
        onExit={() => exit()}
      />
    );
  }

  if (view.name === "LEAVE") {
    return (
      <LeavePage stats={view.stats} onBack={goMenu} onExit={() => exit()} />
    );
  }

  if (view.name === "SCANNING") {
    return (
      <RoomScanner
        onBack={goMenu}
        onExit={() => exit()}
        onSelectRoom={(room) =>
          setView({
            name: "SESSION",
            role: "client",
            hostIp: room.ip,
            tcpPort: room.tcpPort,
            roomName: room.roomName,
            hostName: room.hostName,
          })
        }
      />
    );
  }

  if (view.name === "SESSION" && view.role === "host") {
    return (
      <Session
        localName={localName}
        role="host"
        onLeave={(stats) => setView({ name: "LEAVE", stats })}
      />
    );
  }

  return (
    <Session
      localName={localName}
      role="client"
      onLeave={(stats) => setView({ name: "LEAVE", stats })}
      hostIp={view.hostIp}
      tcpPort={view.tcpPort}
      roomName={view.roomName}
      hostName={view.hostName}
    />
  );
}
