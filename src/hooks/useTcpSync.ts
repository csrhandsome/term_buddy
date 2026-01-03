import { useCallback, useEffect, useRef, useState } from "react";
import net from "node:net";
import type {
  ActivityState,
  ConnectionStatus,
  TcpPacket,
  ProjectileKind,
  ProjectileDirection,
  Peer,
} from "../protocol.js";
import { TCP_DEFAULT_PORT } from "../constants.js";

type HostOptions = { role: "host"; localName: string; port?: number };
type ClientOptions = {
  role: "client";
  localName: string;
  hostIp: string;
  tcpPort: number;
  hostName?: string;
};
type Options = HostOptions | ClientOptions;

function writePacket(socket: net.Socket, packet: TcpPacket) {
  socket.write(`${JSON.stringify(packet)}\n`, "utf8");
}

type PeerConnection = {
  id: string;
  socket: net.Socket;
  name: string;
  state: ActivityState;
  lastSeen: number;
  heartbeatInterval: NodeJS.Timeout | null;
};

export function useTcpSync(options: Options): {
  status: ConnectionStatus;
  listenPort?: number;
  peers: Peer[];
  peerName?: string; // For backward compatibility (first peer name)
  remoteState?: ActivityState; // For backward compatibility (first peer state)
  sendStatus: (state: ActivityState) => void;
  sendProjectile: (kind: ProjectileKind, direction: ProjectileDirection) => void;
  setOnRemoteProjectile: (callback: (kind: ProjectileKind, direction: ProjectileDirection, senderName?: string) => void) => void;
} {
  const [status, setStatus] = useState<ConnectionStatus>(
    options.role === "host" ? "waiting" : "connecting"
  );
  const [listenPort, setListenPort] = useState<number | undefined>(undefined);
  const [peers, setPeers] = useState<Peer[]>([]);

  const onRemoteProjectileRef = useRef<((kind: ProjectileKind, direction: ProjectileDirection, senderName?: string) => void) | undefined>(undefined);

  // For host: map of all peer connections
  const peerConnectionsRef = useRef<Map<string, PeerConnection>>(new Map());
  // For client: single socket ref
  const clientSocketRef = useRef<net.Socket | null>(null);
  const clientHeartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const clientLastSeenRef = useRef<number>(Date.now());

  // Generate unique peer ID
  const generatePeerId = () => `peer_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // Broadcast packet to all peers (host only)
  const broadcastPacket = useCallback((packet: TcpPacket, excludeId?: string) => {
    peerConnectionsRef.current.forEach((peer, id) => {
      if (id !== excludeId && !peer.socket.destroyed) {
        writePacket(peer.socket, packet);
      }
    });
  }, []);

  // Update peers state from connections map
  const syncPeersState = useCallback(() => {
    const peerList: Peer[] = [];
    peerConnectionsRef.current.forEach((conn) => {
      peerList.push({ id: conn.id, name: conn.name, state: conn.state });
    });
    setPeers(peerList);

    // Update status based on peer count
    if (options.role === "host") {
      setStatus(peerList.length > 0 ? "connected" : "waiting");
    }
  }, [options.role]);

  // Remove a peer connection (host only)
  const removePeerConnection = useCallback((peerId: string) => {
    const conn = peerConnectionsRef.current.get(peerId);
    if (conn) {
      if (conn.heartbeatInterval) clearInterval(conn.heartbeatInterval);
      if (!conn.socket.destroyed) conn.socket.destroy();

      // Notify other peers about the left peer
      broadcastPacket({ type: "peer_left", peerName: conn.name, sentAt: Date.now() }, peerId);

      peerConnectionsRef.current.delete(peerId);
      syncPeersState();
    }
  }, [broadcastPacket, syncPeersState]);

  // Attach a new peer socket (host only)
  const attachPeerSocket = useCallback((socket: net.Socket) => {
    const peerId = generatePeerId();
    let buf = "";

    socket.setNoDelay(true);
    socket.setEncoding("utf8");

    const conn: PeerConnection = {
      id: peerId,
      socket,
      name: "Connecting...",
      state: "IDLE",
      lastSeen: Date.now(),
      heartbeatInterval: null,
    };

    peerConnectionsRef.current.set(peerId, conn);

    socket.on("data", (chunk: string) => {
      buf += chunk;
      while (true) {
        const idx = buf.indexOf("\n");
        if (idx === -1) break;
        const line = buf.slice(0, idx).trim();
        buf = buf.slice(idx + 1);
        if (!line) continue;

        try {
          const packet = JSON.parse(line) as TcpPacket;
          conn.lastSeen = Date.now();

          if (packet.type === "hello") {
            conn.name = packet.clientName;
            syncPeersState();

            // Send hello back
            writePacket(socket, {
              type: "hello",
              hostName: options.localName,
              clientName: "Host",
              sentAt: Date.now(),
            });

            // Notify other peers about new peer
            broadcastPacket({ type: "peer_joined", peerName: conn.name, sentAt: Date.now() }, peerId);

            // Send list of existing peers to new peer
            peerConnectionsRef.current.forEach((existingConn, existingId) => {
              if (existingId !== peerId && existingConn.name !== "Connecting...") {
                writePacket(socket, { type: "peer_joined", peerName: existingConn.name, sentAt: Date.now() });
              }
            });
          }

          if (packet.type === "status") {
            conn.state = packet.state;
            syncPeersState();
            // Broadcast status to other peers
            broadcastPacket({ ...packet, senderName: conn.name }, peerId);
          }

          if (packet.type === "ping") {
            writePacket(socket, { type: "pong", sentAt: Date.now() });
          }

          if (packet.type === "projectile") {
            // Call local handler
            onRemoteProjectileRef.current?.(packet.kind, packet.direction, conn.name);
            // Broadcast to other peers
            broadcastPacket({ ...packet, senderName: conn.name }, peerId);
          }
        } catch {
          // ignore parse errors
        }
      }
    });

    socket.on("close", () => {
      removePeerConnection(peerId);
    });

    socket.on("error", () => {
      removePeerConnection(peerId);
    });

    // Heartbeat for this peer
    conn.heartbeatInterval = setInterval(() => {
      if (socket.destroyed) {
        removePeerConnection(peerId);
        return;
      }
      writePacket(socket, { type: "ping", sentAt: Date.now() });
      const age = Date.now() - conn.lastSeen;
      if (age > 6000) {
        removePeerConnection(peerId);
      }
    }, 2000);

    syncPeersState();
  }, [options.localName, broadcastPacket, syncPeersState, removePeerConnection]);

  // Client socket cleanup
  const cleanupClientSocket = useCallback(() => {
    if (clientHeartbeatRef.current) clearInterval(clientHeartbeatRef.current);
    clientHeartbeatRef.current = null;

    const s = clientSocketRef.current;
    clientSocketRef.current = null;
    if (s && !s.destroyed) s.destroy();
  }, []);

  // Attach client socket
  const attachClientSocket = useCallback((socket: net.Socket) => {
    cleanupClientSocket();
    clientSocketRef.current = socket;
    clientLastSeenRef.current = Date.now();

    setStatus("connected");

    let buf = "";
    socket.setNoDelay(true);
    socket.setEncoding("utf8");

    socket.on("data", (chunk: string) => {
      buf += chunk;
      while (true) {
        const idx = buf.indexOf("\n");
        if (idx === -1) break;
        const line = buf.slice(0, idx).trim();
        buf = buf.slice(idx + 1);
        if (!line) continue;

        try {
          const packet = JSON.parse(line) as TcpPacket;
          clientLastSeenRef.current = Date.now();

          if (packet.type === "hello") {
            // Host connected - add host as first peer
            setPeers((prev) => {
              const hostExists = prev.some((p) => p.id === "host");
              if (hostExists) return prev;
              return [{ id: "host", name: packet.hostName, state: "IDLE" as ActivityState }, ...prev];
            });
          }

          if (packet.type === "status") {
            // Update peer's state
            const senderName = packet.senderName;
            if (senderName) {
              setPeers((prev) => prev.map((p) =>
                p.name === senderName ? { ...p, state: packet.state } : p
              ));
            } else {
              // From host
              setPeers((prev) => prev.map((p) =>
                p.id === "host" ? { ...p, state: packet.state } : p
              ));
            }
          }

          if (packet.type === "ping") {
            writePacket(socket, { type: "pong", sentAt: Date.now() });
          }

          if (packet.type === "projectile") {
            onRemoteProjectileRef.current?.(packet.kind, packet.direction, packet.senderName);
          }

          if (packet.type === "peer_joined") {
            setPeers((prev) => {
              const exists = prev.some((p) => p.name === packet.peerName);
              if (exists) return prev;
              return [...prev, { id: `peer_${Date.now()}`, name: packet.peerName, state: "IDLE" as ActivityState }];
            });
          }

          if (packet.type === "peer_left") {
            setPeers((prev) => prev.filter((p) => p.name !== packet.peerName));
          }
        } catch {
          // ignore
        }
      }
    });

    socket.on("close", () => {
      setStatus("disconnected");
      setPeers([]);
      cleanupClientSocket();
    });

    socket.on("error", () => {
      setStatus("disconnected");
      setPeers([]);
    });

    // Hello handshake
    writePacket(socket, {
      type: "hello",
      hostName: options.role === "client" ? options.hostName ?? "Host" : options.localName,
      clientName: options.localName,
      sentAt: Date.now(),
    });

    // Heartbeat
    clientHeartbeatRef.current = setInterval(() => {
      const sock = clientSocketRef.current;
      if (!sock || sock.destroyed) return;
      writePacket(sock, { type: "ping", sentAt: Date.now() });
      const age = Date.now() - clientLastSeenRef.current;
      if (age > 6000) {
        setStatus("disconnected");
        setPeers([]);
        cleanupClientSocket();
      }
    }, 2000);
  }, [cleanupClientSocket, options]);

  // Main effect: setup server or client
  useEffect(() => {
    if (options.role === "host") {
      const server = net.createServer((socket) => {
        attachPeerSocket(socket);
      });

      server.on("error", () => {});

      server.listen(options.port ?? TCP_DEFAULT_PORT, () => {
        const address = server.address();
        if (address && typeof address === "object") setListenPort(address.port);
      });

      return () => {
        // Cleanup all peer connections
        peerConnectionsRef.current.forEach((conn) => {
          if (conn.heartbeatInterval) clearInterval(conn.heartbeatInterval);
          if (!conn.socket.destroyed) conn.socket.destroy();
        });
        peerConnectionsRef.current.clear();
        server.close();
      };
    }

    // Client mode
    setStatus("connecting");
    const socket = net.createConnection(
      { host: options.hostIp, port: options.tcpPort },
      () => {
        attachClientSocket(socket);
      }
    );
    socket.on("error", () => {
      setStatus("disconnected");
      setPeers([]);
    });

    return () => {
      socket.destroy();
      cleanupClientSocket();
    };
  }, [attachPeerSocket, attachClientSocket, cleanupClientSocket, options]);

  // Send status to all peers
  const sendStatus = useCallback((state: ActivityState) => {
    if (options.role === "host") {
      broadcastPacket({ type: "status", state, senderName: options.localName, sentAt: Date.now() });
    } else {
      const socket = clientSocketRef.current;
      if (socket && !socket.destroyed) {
        writePacket(socket, { type: "status", state, sentAt: Date.now() });
      }
    }
  }, [options, broadcastPacket]);

  // Send projectile to all peers
  const sendProjectile = useCallback((kind: ProjectileKind, direction: ProjectileDirection) => {
    if (options.role === "host") {
      broadcastPacket({ type: "projectile", kind, direction, senderName: options.localName, sentAt: Date.now() });
    } else {
      const socket = clientSocketRef.current;
      if (socket && !socket.destroyed) {
        writePacket(socket, { type: "projectile", kind, direction, sentAt: Date.now() });
      }
    }
  }, [options, broadcastPacket]);

  const setOnRemoteProjectile = useCallback((callback: (kind: ProjectileKind, direction: ProjectileDirection, senderName?: string) => void) => {
    onRemoteProjectileRef.current = callback;
  }, []);

  // Backward compatibility: first peer
  const firstPeer = peers[0];
  const peerName = firstPeer?.name;
  const remoteState = firstPeer?.state;

  return {
    status,
    listenPort,
    peers,
    peerName,
    remoteState,
    sendStatus,
    sendProjectile,
    setOnRemoteProjectile
  };
}
