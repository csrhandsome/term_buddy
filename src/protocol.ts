export type ActivityState = 'TYPING' | 'IDLE' | 'OFFLINE';

export type DiscoveryPacket = {
	type: 'termbuddy_discovery';
	version: number;
	hostName: string;
	roomName: string;
	tcpPort: number;
	sentAt: number;
};

export type TcpPacket =
	| {type: 'hello'; hostName: string; clientName: string; sentAt: number}
	| {type: 'status'; state: ActivityState; sentAt: number}
	| {type: 'ping'; sentAt: number}
	| {type: 'pong'; sentAt: number};

export type ConnectionStatus = 'waiting' | 'connecting' | 'connected' | 'disconnected';
