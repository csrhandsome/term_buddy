export type DiscoveredRoom = {
	ip: string;
	hostName: string;
	roomName: string;
	tcpPort: number;
	lastSeenAt: number;
};

export type LeaveStats = {
	keyPresses: number;
	sessionDurationMs: number;
	connectedDurationMs: number;
	startedAt: number;
	endedAt: number;
	peerName?: string;
};
