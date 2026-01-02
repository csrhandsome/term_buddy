import React, {useMemo, useState} from 'react';
import {Box, Text, useInput} from 'ink';
import {useAiAgent} from '../hooks/index.js';

export function AiConsole(props: {
	onClose: () => void;
	onStartCountdown: (minutes: number) => void;
	localName: string;
	peerName: string;
}) {
	const [input, setInput] = useState('');
	const agent = useAiAgent({
		localName: props.localName,
		peerName: props.peerName,
		onStartCountdown: props.onStartCountdown
	});

	const helpLine = useMemo(
		() => '示例：倒计时20分钟 / countdown 20 / 问个技术问题',
		[]
	);

	useInput(
		(ch, key) => {
			if (key.escape) {
				props.onClose();
				return;
			}

			if (key.return) {
				const line = input.trim();
				setInput('');
				if (!line) return;
				void agent.ask(line);
				return;
			}

			if (key.backspace || key.delete) {
				setInput((s) => s.slice(0, -1));
				return;
			}

			if (key.ctrl || key.meta) return;
			if (ch) setInput((s) => s + ch);
		},
		{isActive: true}
	);

	const lines = agent.lines.slice(-12);

	return (
		<Box flexDirection="column" borderStyle="round" paddingX={1} paddingY={0}>
			<Box justifyContent="space-between">
				<Text color="cyan">AI Console</Text>
				<Text color="gray">{agent.busy ? 'Thinking…' : 'Esc 关闭'}</Text>
			</Box>

			<Box flexDirection="column" marginTop={1}>
				<Text color="gray">{helpLine}</Text>
			</Box>

			<Box flexDirection="column" marginTop={1}>
				{lines.length === 0 ? <Text color="gray">（幽灵还在壳里…）</Text> : null}
				{lines.map((l, i) => (
					<Text key={`${l.kind}:${l.at}:${i}`} color={l.kind === 'user' ? 'yellow' : 'white'}>
						{l.text}
					</Text>
				))}
			</Box>

			<Box marginTop={1}>
				<Text color="green">{'>'} </Text>
				<Text>{input}</Text>
			</Box>
		</Box>
	);
}
