import { vitePlugin as remix } from '@remix-run/dev';
import { installGlobals } from '@remix-run/node';
import { defineConfig } from 'vite';
import { vercelPreset } from '@vercel/remix/vite';
import tsconfigPaths from 'vite-tsconfig-paths';

installGlobals();

export default defineConfig({
	plugins: [
		remix({
			future: {
				v3_fetcherPersist: true,
				v3_relativeSplatPath: true,
				v3_throwAbortReason: true
			},
			// The Vercel preset splits the server build into per-function bundles under build/server/<id>/,
			// so `remix-serve ./build/server/index.js` (the `start` script, used by the Docker image) finds
			// nothing and the container exits. Apply it only on Vercel, which sets VERCEL=1 during builds.
			presets: process.env.VERCEL ? [vercelPreset()] : []
		}),
		tsconfigPaths()
	]
});
