import {useCallback, useEffect, useRef, useState} from 'react';
import net from 'node:net';
import type {ActivityState, ConnectionStatus, TcpPacket} from '../protocol.js';
import {TCP_DEFAULT_PORT} from '../constants.js';

type HostOptions = {role: 'host'; localName: string; port?: number};
type ClientOptions = {role: 'client'; localName: string; hostIp: string; tcpPort: number; hostName?: string};
type Options = HostOptions | ClientOptions;

function writePacket(socket: net.Socket, packet: TcpPacket) {
	socket.write(`${JSON.stringify(packet)}\n`, 'utf8');
}

export function useTcpSync(options: Options): {
	status: ConnectionStatus;
	listenPort?: number;
	peerName?: string;
	remoteState?: ActivityState;
	sendStatus: (state: ActivityState) => void;
} {
	const [status, setStatus] = useState<ConnectionStatus>(options.role === 'host' ? 'waiting' : 'connecting');
	const [listenPort, setListenPort] = useState<number | undefined>(undefined);
	const [peerName, setPeerName] = useState<string | undefined>(undefined);
	const [remoteState, setRemoteState] = useState<ActivityState | undefined>(undefined);

	const socketRef = useRef<net.Socket | null>(null);
	const lastSeenRef = useRef<number>(Date.now());
	const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

	const cleanupSocket = useCallback(() => {
		if (heartbeatRef.current) clearInterval(heartbeatRef.current);
		heartbeatRef.current = null;

		const s = socketRef.current;
		socketRef.current = null;
		if (s && !s.destroyed) s.destroy();
	}, []);

	const attachSocket = useCallback(
		(s: net.Socket) => {
			cleanupSocket();
			socketRef.current = s;
			lastSeenRef.current = Date.now();

			setStatus('connected');
			setRemoteState('IDLE');

			let buf = '';
			s.setNoDelay(true);
			s.setEncoding('utf8');

			const onData = (chunk: string) => {
				buf += chunk;
				while (true) {
					const idx = buf.indexOf('\n');
					if (idx === -1) break;
					const line = buf.slice(0, idx).trim();
					buf = buf.slice(idx + 1);
					if (!line) continue;
					try {
						const packet = JSON.parse(line) as TcpPacket;
						lastSeenRef.current = Date.now();
						if (packet.type === 'hello') {
							if (options.role === 'host') setPeerName(packet.clientName);
							else setPeerName(packet.hostName);
						}
						if (packet.type === 'status') setRemoteState(packet.state);
						if (packet.type === 'ping') writePacket(s, {type: 'pong', sentAt: Date.now()});
						if (packet.type === 'pong') {
							// no-op
						}
					} catch {
						// ignore
					}
				}
			};

			s.on('data', onData);
			s.on('close', () => {
				setStatus(options.role === 'host' ? 'waiting' : 'disconnected');
				setRemoteState('OFFLINE');
				cleanupSocket();
			});
			s.on('error', () => {
				setStatus(options.role === 'host' ? 'waiting' : 'disconnected');
				setRemoteState('OFFLINE');
			});

			// Hello handshake.
			writePacket(s, {
				type: 'hello',
				hostName: options.role === 'host' ? options.localName : options.hostName ?? 'Host',
				clientName: options.role === 'client' ? options.localName : 'Client',
				sentAt: Date.now()
			});

			heartbeatRef.current = setInterval(() => {
				const sock = socketRef.current;
				if (!sock || sock.destroyed) return;
				writePacket(sock, {type: 'ping', sentAt: Date.now()});
				const age = Date.now() - lastSeenRef.current;
				if (age > 6000) {
					setStatus('disconnected');
					setRemoteState('OFFLINE');
					cleanupSocket();
				}
			}, 2000);
		},
		[cleanupSocket, options]
	);

	useEffect(() => {
		if (options.role === 'host') {
			const server = net.createServer((socket) => {
				attachSocket(socket);
			});

			server.on('error', () => {});

			server.listen(options.port ?? TCP_DEFAULT_PORT, () => {
				const address = server.address();
				if (address && typeof address === 'object') setListenPort(address.port);
			});

			return () => {
				cleanupSocket();
				server.close();
			};
		}

		setStatus('connecting');
		const socket = net.createConnection({host: options.hostIp, port: options.tcpPort}, () => {
			attachSocket(socket);
		});
		socket.on('error', () => {
			setStatus('disconnected');
			setRemoteState('OFFLINE');
		});

		return () => {
			socket.destroy();
			cleanupSocket();
		};
	}, [attachSocket, cleanupSocket, options]);

	const sendStatus = useCallback((state: ActivityState) => {
		const socket = socketRef.current;
		if (!socket || socket.destroyed) return;
		writePacket(socket, {type: 'status', state, sentAt: Date.now()});
	}, []);

	return {status, listenPort, peerName, remoteState, sendStatus};
}
