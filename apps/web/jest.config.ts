import type { Config } from 'jest';
import nextJest from 'next/jest.js';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';

/**
 * Unit-test harness for apps/web.
 *
 * `next/jest` wires up SWC, `next.config`, `.env*` loading and mocks for stylesheets / images /
 * fonts, so tests can import app modules exactly like the app does. Run from the repo root with
 * `yarn test:web` (or `yarn workspace @ever-teams/web test`).
 *
 * Test dependencies are declared by the web workspace so the harness is reproducible in isolation.
 */
const webDirectory = typeof __dirname === 'string' ? __dirname : resolve(process.cwd(), 'apps/web');

/**
 * The React that react-dom renders with. The `@tiptap/**` nohoist can leave a second React under
 * apps/web/node_modules: a component importing that copy under the root react-dom reads a null hooks
 * dispatcher ("Cannot read properties of null (reading 'useState')"), which failed about 100 suites on a
 * fresh Linux install. Every import of react goes to the copy react-dom uses.
 */
const requireFromWeb = createRequire(resolve(webDirectory, 'package.json'));
const reactDomDirectory = dirname(requireFromWeb.resolve('react-dom/package.json'));
const requireFromReactDom = createRequire(resolve(reactDomDirectory, 'package.json'));
const reactEntry = requireFromReactDom.resolve('react');
const reactDirectory = dirname(requireFromReactDom.resolve('react/package.json'));
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
		'^@/(.*)$': '<rootDir>/$1',
		'^react$': reactEntry,
		'^react/(.*)$': `${reactDirectory}/$1`
	}
};

export default createJestConfig(config);
