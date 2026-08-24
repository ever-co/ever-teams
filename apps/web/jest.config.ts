import type { Config } from 'jest';
import nextJest from 'next/jest.js';
import { resolve } from 'node:path';

/**
 * Unit-test harness for apps/web.
 *
 * `next/jest` wires up SWC, `next.config`, `.env*` loading and mocks for stylesheets / images /
 * fonts, so tests can import app modules exactly like the app does. Run from the repo root with
 * `yarn test:web` (or `yarn workspace @ever-teams/web test`).
 *
 * Every dependency this needs (jest 29, jest-environment-jsdom, @testing-library/*) is already
 * hoisted at the monorepo root — nothing new was added for it.
 */
const webDirectory = typeof __dirname === 'string' ? __dirname : resolve(process.cwd(), 'apps/web');
const createJestConfig = nextJest({ dir: webDirectory });

const config: Config = {
	// Node by default: most units under test are helpers, route handlers and hooks' pure logic.
	// A test that needs the DOM opts in with `@jest-environment jsdom` at the top of the file.
	testEnvironment: 'node',
	testMatch: ['<rootDir>/**/__tests__/**/*.test.[jt]s?(x)', '<rootDir>/**/*.test.[jt]s?(x)'],
	testPathIgnorePatterns: ['/node_modules/', '/.next/', '/e2e/', '/playwright/'],
	clearMocks: true,
	moduleNameMapper: {
		// tsconfig.json "paths" — next/jest does NOT derive these; keep this list mirroring tsconfig.
		'^@/components/(.*)$': '<rootDir>/components/$1',
		'^@/lib/(.*)$': '<rootDir>/lib/$1',
		'^@/app/(.*)$': '<rootDir>/app/$1',
		'^@app/(.*)$': '<rootDir>/app/$1',
		'^@/(.*)$': '<rootDir>/$1'
	}
};

export default createJestConfig(config);
