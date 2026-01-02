import React, {useCallback, useMemo, useState} from 'react';
import os from 'node:os';
import {useApp} from 'ink';
import {MainMenu, RoomScanner, Session} from '../views/index.js';

type View =
	| {name: 'MENU'}
	| {name: 'SCANNING'}
	| {name: 'SESSION'; role: 'host'}
	| {name: 'SESSION'; role: 'client'; hostIp: string; tcpPort: number; roomName: string; hostName: string};

export function App() {
	const {exit} = useApp();
	const [view, setView] = useState<View>({name: 'MENU'});

	const localName = useMemo(() => os.hostname(), []);

	const goMenu = useCallback(() => setView({name: 'MENU'}), []);

	if (view.name === 'MENU') {
		return (
			<MainMenu
				onHost={() => setView({name: 'SESSION', role: 'host'})}
				onJoin={() => setView({name: 'SCANNING'})}
				onExit={() => exit()}
			/>
		);
	}

	if (view.name === 'SCANNING') {
		return (
			<RoomScanner
				onBack={goMenu}
				onExit={() => exit()}
				onSelectRoom={(room) =>
					setView({
						name: 'SESSION',
						role: 'client',
						hostIp: room.ip,
						tcpPort: room.tcpPort,
						roomName: room.roomName,
						hostName: room.hostName
					})
				}
			/>
		);
	}

	if (view.name === 'SESSION' && view.role === 'host') {
		return <Session localName={localName} role="host" onExit={goMenu} />;
	}

	return (
		<Session
			localName={localName}
			role="client"
			onExit={goMenu}
			hostIp={view.hostIp}
			tcpPort={view.tcpPort}
			roomName={view.roomName}
			hostName={view.hostName}
		/>
	);
}
