import {defineConfig} from 'tsup';

export default defineConfig({
	entry: ['src/cli.tsx'],
	format: ['esm'],
	platform: 'node',
	target: 'node18',
	sourcemap: true,
	clean: true,
	bundle: true,
	splitting: false,
	banner: {
		js: '#!/usr/bin/env node'
	}
});
