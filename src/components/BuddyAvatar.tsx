import React from 'react';
import {Box, Text} from 'ink';
import type {ActivityState} from '../protocol.js';

const FRAMES: Record<ActivityState, {color?: string; lines: string[]}> = {
	TYPING: {
		color: 'green',
		lines: [' /\\_/\\ ', '( >_<) ', ' /|_|\\\\ ', '  / \\\\  ']
	},
	IDLE: {
		color: 'yellow',
		lines: [' /\\_/\\ ', '( -.-) ', ' /|_|\\\\ ', '  / \\\\  ']
	},
	OFFLINE: {
		color: 'gray',
		lines: [' /\\_/\\ ', '( x_x) ', ' /|_|\\\\ ', '  / \\\\  ']
	}
};

export function BuddyAvatar(props: {state: ActivityState}) {
	const frame = FRAMES[props.state];
	return (
		<Box flexDirection="column" marginTop={1}>
			{frame.lines.map((line, i) => (
				<Text key={`${props.state}:${i}`} color={frame.color}>
					{line}
				</Text>
			))}
		</Box>
	);
}

