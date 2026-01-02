import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Box, Text, useInput} from 'ink';
import type {ActivityState} from '../protocol.js';
import {AiConsole, BuddyAvatar, StatusHeader} from '../components/index.js';
import {useActivityMonitor, useBroadcaster, useCountdown, useTcpSync} from '../hooks/index.js';

export function Session(
	props:
		| {role: 'host'; localName: string; onExit: () => void}
		| {
				role: 'client';
				localName: string;
				onExit: () => void;
				hostIp: string;
				tcpPort: number;
				roomName: string;
				hostName: string;
		  }
) {
	const roomName = useMemo(() => `${props.localName}'s Room`, [props.localName]);

	const [showAi, setShowAi] = useState(false);
	const countdown = useCountdown();

	const tcpOptions = useMemo(() => {
		return props.role === 'host'
			? ({role: 'host', localName: props.localName} as const)
			: ({
					role: 'client',
					localName: props.localName,
					hostIp: props.hostIp,
					tcpPort: props.tcpPort,
					hostName: props.hostName
			  } as const);
	}, [
		props.role,
		props.localName,
		props.role === 'client' ? props.hostIp : '',
		props.role === 'client' ? props.tcpPort : 0,
		props.role === 'client' ? props.hostName : ''
	]);

	const tcp = useTcpSync(tcpOptions);

	const broadcasterOptions = useMemo(() => {
		return props.role === 'host'
			? ({
					enabled: true,
					hostName: props.localName,
					roomName,
					tcpPort: tcp.listenPort
			  } as const)
			: ({enabled: false} as const);
	}, [props.role, props.localName, roomName, tcp.listenPort]);

	useBroadcaster(broadcasterOptions);

	const localActivity = useActivityMonitor();

	const remoteActivity: ActivityState = tcp.remoteState ?? 'OFFLINE';

	const onToggleAi = useCallback(() => setShowAi((v) => !v), []);
	const onCloseAi = useCallback(() => setShowAi(false), []);

	useInput(
		(input, key) => {
			if (input === 'q') props.onExit();
			if (input === '/' && !key.ctrl && !key.meta) onToggleAi();
		},
		{isActive: !showAi}
	);

	const buddyName =
		props.role === 'host'
			? tcp.peerName ?? 'Waiting...'
			: `${props.hostName ?? 'Host'} (${props.roomName ?? 'Room'})`;

	const localState = localActivity.state;
	const localLabel = props.role === 'host' ? `${props.localName} (Host)` : `${props.localName} (Client)`;

	// Sync local activity state to peer.
	useEffect(() => {
		if (tcp.status !== 'connected') return;
		tcp.sendStatus(localState);
	}, [localState, tcp.status, tcp.sendStatus]);

	return (
		<Box flexDirection="column" padding={1}>
			<StatusHeader
				role={props.role}
				status={tcp.status}
				hostIp={props.role === 'client' ? props.hostIp : undefined}
				tcpPort={props.role === 'client' ? props.tcpPort : tcp.listenPort}
				countdownLabel={countdown.label}
			/>

			<Box flexDirection="row" gap={4} marginTop={1}>
				<Box flexDirection="column" width="50%">
					<Text color="cyan">{localLabel}</Text>
					<BuddyAvatar state={localState} />
				</Box>

				<Box flexDirection="column" width="50%">
					<Text color="magenta">{buddyName}</Text>
					<BuddyAvatar state={remoteActivity} />
				</Box>
			</Box>

			<Box marginTop={1}>
				<Text color="gray">
					按 <Text color="cyan">/</Text> 召唤 AI Console，按 <Text color="cyan">q</Text> 返回菜单。
				</Text>
			</Box>

			{showAi ? (
				<Box marginTop={1}>
					<AiConsole
						onClose={onCloseAi}
						onStartCountdown={countdown.start}
						localName={props.localName}
						peerName={tcp.peerName ?? (props.role === 'client' ? props.hostName : undefined) ?? 'Buddy'}
					/>
				</Box>
			) : null}
		</Box>
	);
}
