import fs from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export const DECLARATION_FILE = 'ever-teams-embed.d.ts';

// The package's types, from types/: next to the element, TypeScript finds them through the package's exports.
export const declarationPlugin = {
	name: 'ever-teams-embed-declaration',
	generateBundle() {
		this.emitFile({
			type: 'asset',
			fileName: DECLARATION_FILE,
			source: fs.readFileSync(new URL(`./types/${DECLARATION_FILE}`, import.meta.url), 'utf8')
		});
	}
};

// One ES module for a <script type="module"> tag: React, the kit and its stylesheet are bundled in, so the host page
// installs and builds nothing. The kit's on-demand parts stay separate files next to it.
export default defineConfig({
	plugins: [react(), declarationPlugin],
	define: { 'process.env.NODE_ENV': JSON.stringify('production') },
	resolve: { dedupe: ['react', 'react-dom', 'theme-ui', 'next-themes', '@emotion/react'] },
	build: {
		lib: { entry: 'src/index.ts', formats: ['es'], fileName: () => 'ever-teams-embed.js' },
		minify: true,
		sourcemap: false
	}
});
