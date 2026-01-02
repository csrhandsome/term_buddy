import {useEffect, useState} from 'react';
import dgram from 'node:dgram';
import {UDP_PORT, DISCOVERY_VERSION} from '../constants.js';
import type {DiscoveryPacket} from '../protocol.js';
import type {DiscoveredRoom} from '../types.js';

function safeParse(msg: Buffer): DiscoveryPacket | null {
	try {
		const parsed = JSON.parse(msg.toString('utf8')) as DiscoveryPacket;
		if (parsed?.type !== 'termbuddy_discovery') return null;
		if (parsed?.version !== DISCOVERY_VERSION) return null;
		if (!parsed.hostName || !parsed.roomName || !parsed.tcpPort) return null;
		return parsed;
	} catch {
		return null;
	}
}

export function useScanner(options?: {staleAfterMs?: number}): DiscoveredRoom[] {
	const staleAfterMs = options?.staleAfterMs ?? 3500;
	const [rooms, setRooms] = useState<DiscoveredRoom[]>([]);

	useEffect(() => {
		const socket = dgram.createSocket('udp4');
		socket.on('error', () => {});

		socket.on('message', (msg, rinfo) => {
			const packet = safeParse(msg);
			if (!packet) return;

			const now = Date.now();
			setRooms((prev) => {
				const key = `${rinfo.address}:${packet.tcpPort}`;
				const next = prev.filter((r) => `${r.ip}:${r.tcpPort}` !== key);
				next.push({
					ip: rinfo.address,
					hostName: packet.hostName,
					roomName: packet.roomName,
					tcpPort: packet.tcpPort,
					lastSeenAt: now
				});
				return next;
			});
		});

		socket.bind(UDP_PORT, () => {});

		const prune = setInterval(() => {
			const now = Date.now();
			setRooms((prev) => prev.filter((r) => now - r.lastSeenAt <= staleAfterMs));
		}, 500);

		return () => {
			clearInterval(prune);
			socket.close();
		};
	}, [staleAfterMs]);

	return rooms;
}
