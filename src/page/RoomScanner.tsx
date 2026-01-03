import React, {useMemo} from 'react';
import {Box, Text, useInput} from 'ink';
import {useScanner} from '../hooks/index.js';
import type {DiscoveredRoom} from '../types.js';

export function RoomScanner(props: {
	onSelectRoom: (room: DiscoveredRoom) => void;
	onBack: () => void;
	onExit: () => void;
}) {
	const rooms = useScanner();

	const sortedRooms = useMemo(() => {
		return [...rooms].sort((a, b) => b.lastSeenAt - a.lastSeenAt);
	}, [rooms]);

	useInput((input, key) => {
		if (key.escape || input === 'b') props.onBack();
		if (input === 'q') props.onExit();

		const index = Number.parseInt(input, 10);
		if (Number.isNaN(index)) return;
		const room = sortedRooms[index - 1];
		if (!room) return;
		props.onSelectRoom(room);
	});

	return (
		<Box flexDirection="column" padding={1}>
			<Text>
				<Text color="yellow">正在扫描局域网...</Text> (按 <Text color="cyan">b</Text> 返回,{' '}
				<Text color="cyan">q</Text> 退出)
			</Text>
			<Box flexDirection="column" marginTop={1}>
				{sortedRooms.length === 0 ? (
					<Text color="gray">暂无房间广播。</Text>
				) : (
					sortedRooms.map((room, i) => (
						<Text key={`${room.ip}:${room.tcpPort}`}>
							<Text color="cyan">[{i + 1}]</Text> {room.hostName} <Text color="gray">@</Text>{' '}
							<Text color="gray">
								{room.ip}:{room.tcpPort}
							</Text>
						</Text>
					))
				)}
			</Box>
		</Box>
	);
}
