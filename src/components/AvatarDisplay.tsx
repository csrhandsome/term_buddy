import React from 'react';
import {Box, Text} from 'ink';
import type {ActivityState} from '../protocol.js';

const AVATAR: Record<ActivityState, {text: string; color?: string}> = {
	TYPING: {text: '( >_<)===3', color: 'green'},
	IDLE: {text: '( -.-)Zzz', color: 'yellow'},
	OFFLINE: {text: '( x_x)', color: 'gray'}
};

export function AvatarDisplay(props: {state: ActivityState}) {
	const avatar = AVATAR[props.state];
	return (
		<Box marginTop={1}>
			<Text color={avatar.color}>{avatar.text}</Text>
		</Box>
	);
}
