import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// One ES module for a <script type="module"> tag: React, the kit and its stylesheet are bundled in, so the host page
// installs and builds nothing. The kit's on-demand parts stay separate files next to it.
export default defineConfig({
	plugins: [react()],
	define: { 'process.env.NODE_ENV': JSON.stringify('production') },
	resolve: { dedupe: ['react', 'react-dom', 'theme-ui', 'next-themes', '@emotion/react'] },
	build: {
		lib: { entry: 'src/index.ts', formats: ['es'], fileName: () => 'ever-teams-embed.js' },
		minify: true,
		sourcemap: false
	}
});
