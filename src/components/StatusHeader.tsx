import React from "react";
import { Box, Text } from "ink";
import type { ConnectionStatus } from "../protocol.js";

function statusText(status: ConnectionStatus) {
  switch (status) {
    case "waiting":
      return { label: "Waiting", color: "yellow" };
    case "connecting":
      return { label: "Connecting", color: "yellow" };
    case "connected":
      return { label: "Connected via TCP", color: "green" };
    case "disconnected":
      return { label: "Disconnected", color: "red" };
  }
}

export function StatusHeader(props: {
  role: "host" | "client";
  status: ConnectionStatus;
  hostIp?: string;
  tcpPort?: number;
  peerCount?: number;
}) {
  const st = statusText(props.status);
  return (
    <Box>
      <Box>
        <Text color={st.color}>{st.label}</Text>
        {props.peerCount !== undefined && props.peerCount > 0 && (
          <Text color="cyan"> ({props.peerCount} online)</Text>
        )}
        {props.role === "host" ? (
          <Text color="gray">
            {props.tcpPort ? ` — TCP :${props.tcpPort}` : ""}
          </Text>
        ) : (
          <Text color="gray">
            {props.hostIp && props.tcpPort
              ? ` — ${props.hostIp}:${props.tcpPort}`
              : ""}
          </Text>
        )}
      </Box>
    </Box>
  );
}
