import React from "react";
import { Box, Text } from "ink";

export type InfoRecord = {
  id: number;
  timestamp: number;
  type: "bubble" | "countdown" | "projectile" | "join" | "leave" | "other";
  content: string;
};

export function InfoPanel(props: {
  records: InfoRecord[];
  maxRecords?: number;
}) {
  const maxRecords = props.maxRecords ?? 8;
  const displayRecords = props.records.slice(-maxRecords);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const getTypeIcon = (type: InfoRecord["type"]) => {
    switch (type) {
      case "bubble": return "[Msg]";
      case "countdown": return "[Tmr]";
      case "projectile": return "[Thr]";
      case "join": return "[+]";
      case "leave": return "[-]";
      default: return "[*]";
    }
  };

  const getTypeColor = (type: InfoRecord["type"]) => {
    switch (type) {
      case "bubble": return "cyan";
      case "countdown": return "green";
      case "projectile": return "magenta";
      case "join": return "green";
      case "leave": return "red";
      default: return "gray";
    }
  };

  return (
    <Box flexDirection="column" borderStyle="round" paddingX={1} paddingY={0}>
      <Box justifyContent="space-between" marginBottom={0}>
        <Text color="yellow">Info Log</Text>
        <Text color="gray">{displayRecords.length} records</Text>
      </Box>

      <Box flexDirection="column" minHeight={6}>
        {displayRecords.length === 0 ? (
          <Text color="gray">No records yet...</Text>
        ) : (
          displayRecords.map((record) => (
            <Text key={record.id} wrap="truncate-end">
              <Text color="gray">{formatTime(record.timestamp)} </Text>
              <Text color={getTypeColor(record.type)}>{getTypeIcon(record.type)} </Text>
              <Text>{record.content}</Text>
            </Text>
          ))
        )}
      </Box>
    </Box>
  );
}
