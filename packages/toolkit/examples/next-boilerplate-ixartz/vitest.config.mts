import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [react(), tsconfigPaths()] as any[],
	test: {
		globals: true, // This is needed by @testing-library to be cleaned up after each test
		coverage: {
			include: ['src/**/*'],
			exclude: ['src/**/*.stories.{js,jsx,ts,tsx}', '**/*.d.ts']
		},
		// Vitest 4 removed environmentMatchGlobs: component and hook tests run in jsdom, the rest in node.
		// No root `include`: with `extends: true` it would be concatenated into both projects.
		projects: [
			{
				extends: true,
				test: {
					name: 'node',
					include: ['src/**/*.test.{js,jsx,ts}'],
					exclude: [...configDefaults.exclude, 'src/hooks/**/*.test.ts'],
					environment: 'node'
				}
			},
			{
				extends: true,
				test: {
					name: 'jsdom',
					include: ['src/**/*.test.tsx', 'src/hooks/**/*.test.ts'],
					environment: 'jsdom'
				}
			}
		],
		setupFiles: ['./vitest-setup.ts'],
		env: loadEnv('', process.cwd(), '')
	}
});
