import {useEffect, useRef, useState} from 'react';
import {useInput} from 'ink';
import type {ActivityState} from '../protocol.js';

export function useActivityMonitor(options?: {idleAfterMs?: number}): {state: ActivityState} {
	const idleAfterMs = options?.idleAfterMs ?? 1500;
	const [state, setState] = useState<ActivityState>('IDLE');

	const lastActivityRef = useRef<number>(Date.now());

	useInput(() => {
		lastActivityRef.current = Date.now();
		setState('TYPING');
	});

	useEffect(() => {
		const id = setInterval(() => {
			const delta = Date.now() - lastActivityRef.current;
			if (delta >= idleAfterMs) setState('IDLE');
		}, 200);
		return () => clearInterval(id);
	}, [idleAfterMs]);

	return {state};
}
