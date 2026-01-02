import React from 'react';
import {Box, Text} from 'ink';
import type {ConnectionStatus} from '../protocol.js';

function statusText(status: ConnectionStatus) {
	switch (status) {
		case 'waiting':
			return {label: 'Waiting', color: 'yellow'};
		case 'connecting':
			return {label: 'Connecting', color: 'yellow'};
		case 'connected':
			return {label: 'Connected via TCP', color: 'green'};
		case 'disconnected':
			return {label: 'Disconnected', color: 'red'};
	}
}

export function StatusHeader(props: {
	role: 'host' | 'client';
	status: ConnectionStatus;
	hostIp?: string;
	tcpPort?: number;
	countdownLabel?: string | null;
}) {
	const st = statusText(props.status);
	return (
		<Box justifyContent="space-between">
			<Box>
				<Text color={st.color}>{st.label}</Text>
				{props.role === 'host' ? (
					<Text color="gray">{props.tcpPort ? ` — TCP :${props.tcpPort}` : ''}</Text>
				) : (
					<Text color="gray">
						{props.hostIp && props.tcpPort ? ` — ${props.hostIp}:${props.tcpPort}` : ''}
					</Text>
				)}
			</Box>
			<Box>
				{props.countdownLabel ? <Text color="cyan">Focus {props.countdownLabel}</Text> : <Text> </Text>}
			</Box>
		</Box>
	);
}
