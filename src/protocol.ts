export type ActivityState = 'TYPING' | 'IDLE' | 'OFFLINE';

export type DiscoveryPacket = {
	type: 'termbuddy_discovery';
	version: number;
	hostName: string;
	roomName: string;
	tcpPort: number;
	sentAt: number;
};

export type ProjectileKind = "ROSE" | "POOP" | "HAMMER";
export type ProjectileDirection = "LEFT_TO_RIGHT" | "RIGHT_TO_LEFT";

export type TcpPacket =
	| {type: 'hello'; hostName: string; clientName: string; sentAt: number}
	| {type: 'status'; state: ActivityState; senderName?: string; sentAt: number}
	| {type: 'ping'; sentAt: number}
	| {type: 'pong'; sentAt: number}
	| {type: 'projectile'; kind: ProjectileKind; direction: ProjectileDirection; senderName?: string; sentAt: number}
	| {type: 'peer_joined'; peerName: string; sentAt: number}
	| {type: 'peer_left'; peerName: string; sentAt: number};

export type Peer = {
	id: string;
	name: string;
	state: ActivityState;
};

export type ConnectionStatus = 'waiting' | 'connecting' | 'connected' | 'disconnected';
