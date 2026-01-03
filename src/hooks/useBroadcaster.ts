import { useEffect } from "react";
import dgram from "node:dgram";
import { UDP_PORT, DISCOVERY_VERSION } from "../constants.js";
import type { DiscoveryPacket } from "../protocol.js";
import { getBroadcastTargets } from "../net/index.js";

type Options =
  | { enabled: false }
  | {
      enabled: true;
      hostName: string;
      roomName: string;
      tcpPort?: number | null;
      intervalMs?: number;
    };

export function useBroadcaster(options: Options) {
  const depKey = options.enabled
    ? `${options.hostName}|${options.roomName}|${options.tcpPort ?? ""}|${
        options.intervalMs ?? 1000
      }`
    : "disabled";

  useEffect(() => {
    if (!options.enabled) return;
    if (!options.tcpPort) return;

    const socket = dgram.createSocket("udp4");
    socket.on("error", () => {});

    socket.bind(() => {
      socket.setBroadcast(true);
    });

    const targets = getBroadcastTargets();

    const send = () => {
      const packet: DiscoveryPacket = {
        type: "termbuddy_discovery",
        version: DISCOVERY_VERSION,
        hostName: options.hostName,
        roomName: options.roomName,
        tcpPort: options.tcpPort!,
        sentAt: Date.now(),
      };
      const msg = Buffer.from(JSON.stringify(packet));
      for (const address of targets) {
        socket.send(msg, UDP_PORT, address);
      }
    };

    send();
    const id = setInterval(send, options.intervalMs ?? 1000);

    return () => {
      clearInterval(id);
      socket.close();
    };
  }, [depKey]);
}
