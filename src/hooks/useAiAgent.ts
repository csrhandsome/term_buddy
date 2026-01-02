import {useCallback, useEffect, useRef, useState} from 'react';
import {createAgent, initChatModel, tool} from 'langchain';

type LineKind = 'user' | 'ai' | 'system';
export type AiLine = {kind: LineKind; text: string; at: number};

function contentToText(content: unknown): string {
	if (typeof content === 'string') return content;
	if (!content) return '';
	if (Array.isArray(content)) {
		return content
			.map((part) => {
				if (typeof part === 'string') return part;
				if (typeof part === 'object' && part && 'text' in part) return String((part as any).text ?? '');
				return '';
			})
			.join('');
	}
	if (typeof content === 'object' && 'text' in (content as any)) return String((content as any).text ?? '');
	return String(content);
}

function lastAiText(messages: unknown[]): string | null {
	for (let i = messages.length - 1; i >= 0; i--) {
		const m: any = messages[i];
		const type = typeof m?.getType === 'function' ? m.getType() : typeof m?._getType === 'function' ? m._getType() : m?.type;
		if (type === 'ai') {
			const t = contentToText(m?.content);
			return t || '';
		}
	}
	return null;
}

function createSystemPrompt(context: {localName: string; peerName: string}) {
	return [
		'你是 TermBuddy 里的“壳中幽灵 (Ghost in the Shell)”。',
		'默认隐形；被 / 唤醒时出现。风格：极简、干练、少废话。',
		'你可以使用工具来操控应用功能（例如倒计时）。',
		'如果用户提到“倒计时/专注/计时/countdown”，优先调用 start_countdown。',
		`当前上下文：我叫 ${context.localName}；同桌叫 ${context.peerName}。`
	].join('\n');
}

export function useAiAgent(options: {
	localName: string;
	peerName: string;
	onStartCountdown?: (minutes: number) => void;
}) {
	const [lines, setLines] = useState<AiLine[]>([]);
	const [busy, setBusy] = useState(false);

	const agentRef = useRef<Awaited<ReturnType<typeof createAgent>> | null>(null);
	const agentInitRef = useRef<Promise<Awaited<ReturnType<typeof createAgent>>> | null>(null);
	const stateRef = useRef<{messages: unknown[]}>({messages: []});
	const abortRef = useRef<AbortController | null>(null);

	const append = useCallback((line: AiLine) => {
		setLines((prev) => [...prev, line]);
	}, []);

	const updateLine = useCallback((at: number, text: string) => {
		setLines((prev) => {
			const idx = prev.findIndex((l) => l.at === at);
			if (idx === -1) return prev;
			const next = [...prev];
			next[idx] = {...next[idx], text};
			return next;
		});
	}, []);

	const ensureAgent = useCallback(async () => {
		if (agentRef.current) return agentRef.current;
		agentInitRef.current ??= (async () => {
			const startCountdown = tool(
				async (input: {minutes: number}) => {
					const minutes = Number(input.minutes);
					if (!Number.isFinite(minutes) || minutes <= 0) return '倒计时分钟数无效。';
					options.onStartCountdown?.(minutes);
					return `已开始倒计时 ${minutes} 分钟。`;
				},
				{
					name: 'start_countdown',
					description: '开始一个专注倒计时（分钟）。',
					schema: {
						type: 'object',
						properties: {
							minutes: {type: 'integer', minimum: 1, maximum: 180, description: '倒计时分钟数'}
						},
						required: ['minutes'],
						additionalProperties: false
					}
				}
			);

			const sessionInfo = tool(
				async () => {
					return JSON.stringify(
						{
							localName: options.localName,
							peerName: options.peerName
						},
						null,
						2
					);
				},
				{
					name: 'session_info',
					description: '获取当前会话上下文（本地昵称、同桌昵称）。',
					schema: {type: 'object', properties: {}, additionalProperties: false}
				}
			);

			const modelId = process.env.TERMBUDDY_MODEL ?? 'openai:gpt-4o-mini';
			const llm = await initChatModel(modelId, {
				temperature: 0.2,
				maxTokens: 800,
				timeout: 30_000
			});

			return createAgent({
				llm,
				tools: [startCountdown, sessionInfo],
				prompt: createSystemPrompt({localName: options.localName, peerName: options.peerName}),
				name: 'ghost'
			});
		})();

		agentRef.current = await agentInitRef.current;
		return agentRef.current;
	}, [options.localName, options.onStartCountdown, options.peerName]);

	const ask = useCallback(
		async (text: string) => {
			append({kind: 'user', text: `> ${text}`, at: Date.now()});

			const aiAt = Date.now() + 1;
			append({kind: 'ai', text: '…', at: aiAt});

			abortRef.current?.abort();
			abortRef.current = new AbortController();

			setBusy(true);
			try {
				const agent = await ensureAgent();
				const stream = await agent.stream(
					{
						messages: [...stateRef.current.messages, {role: 'user', content: text}]
					},
					{
						streamMode: 'values',
						signal: abortRef.current.signal
					} as any
				);

				for await (const chunk of stream as any) {
					const messages = (chunk?.messages ?? []) as unknown[];
					if (messages.length > 0) stateRef.current.messages = messages;
					const t = lastAiText(messages);
					if (t !== null) updateLine(aiAt, t);
				}
			} catch (e) {
				const msg = e instanceof Error ? e.message : String(e);
				updateLine(aiAt, `（AI 出错）${msg}`);
			} finally {
				setBusy(false);
			}
		},
		[append, ensureAgent, updateLine]
	);

	useEffect(() => {
		return () => abortRef.current?.abort();
	}, []);

	return {lines, ask, busy};
}
