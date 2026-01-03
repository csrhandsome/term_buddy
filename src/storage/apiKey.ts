import fs from 'node:fs/promises';
import path from 'node:path';

type KeyFile = {apiKey?: string};

const KEY_RELATIVE_PATH = path.join('src', 'assets', 'key.json');

async function readJsonFile(filePath: string): Promise<KeyFile | null> {
	try {
		const raw = await fs.readFile(filePath, 'utf8');
		const parsed = JSON.parse(raw) as KeyFile;
		if (!parsed || typeof parsed !== 'object') return null;
		return parsed;
	} catch {
		return null;
	}
}

async function ensureDirForFile(filePath: string) {
	await fs.mkdir(path.dirname(filePath), {recursive: true});
}

export async function loadStoredApiKey(): Promise<string | null> {
	const absolute = path.resolve(process.cwd(), KEY_RELATIVE_PATH);
	const json = await readJsonFile(absolute);
	const key = (json?.apiKey ?? '').trim();
	return key.length > 0 ? key : null;
}

export async function saveStoredApiKey(apiKey: string): Promise<void> {
	const absolute = path.resolve(process.cwd(), KEY_RELATIVE_PATH);
	await ensureDirForFile(absolute);
	const payload: KeyFile = {apiKey};
	await fs.writeFile(absolute, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

