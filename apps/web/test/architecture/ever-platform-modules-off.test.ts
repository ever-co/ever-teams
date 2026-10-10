/**
 * Architecture guard: the optional Ever Platform features stay out of everything else, and switched off
 * they are not even loaded.
 *
 * - The statistics reporter (core/services/server/ever-stats) is reached only from instrumentation.ts,
 *   through a dynamic import() behind the EVER_STATS_ENABLED check, and from the /api/ever-stats routes.
 * - The Ever Platform SDK and the server-side statistics settings never reach browser code.
 * - The settings section, its hooks and its client services are imported only by the team settings page,
 *   the settings menu, the lazy settings components and each other.
 * - With EVER_STATS_ENABLED=false, register() loads no statistics module; with
 *   NEXT_PUBLIC_EVER_CONNECT_ENABLED unset, /api/ever-connect/* answers 404 without a request.
 * - The Ever Platform hosts appear in string literals only under core/lib/ever-platform and the section's
 *   own components, and the Ever Platform base URL variable only under core/lib/ever-platform.
 *
 * Each scan is first run against a known-bad input, which it must flag.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const WEB_ROOT = join(__dirname, '..', '..');
const SCANNED_DIRS = ['app', 'core'];
const ROOT_FILES = ['instrumentation.ts', 'instrumentation-client.ts', 'proxy.ts', 'auth.ts'];
const TEST_FILE = /(\.test\.[jt]sx?$|\/__tests__\/)/;

interface SourceFile {
	file: string;
	source: string;
}

function walk(dir: string, out: string[] = []): string[] {
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) {
			if (entry === 'node_modules' || entry === '.next') continue;
			walk(full, out);
		} else if (/\.[jt]sx?$/.test(entry) && !/\.d\.ts$/.test(entry)) {
			out.push(full);
		}
	}
	return out;
}

function appSources(): SourceFile[] {
	const files = [...SCANNED_DIRS.flatMap((dir) => walk(join(WEB_ROOT, dir))), ...ROOT_FILES.map((f) => join(WEB_ROOT, f))];
	return files
		.map((full) => ({ file: relative(WEB_ROOT, full).split(sep).join('/'), source: readFileSync(full, 'utf8') }))
		.filter(({ file }) => !TEST_FILE.test(file));
}

/** Every module specifier a file imports, statically (`import`/`export from`) or dynamically (`import()`). */
function importsOf(source: string): Array<{ specifier: string; dynamic: boolean }> {
	const found: Array<{ specifier: string; dynamic: boolean }> = [];
	for (const match of source.matchAll(/^\s*(?:import|export)\b[^'"`;]*?from\s*['"]([^'"]+)['"]/gm)) {
		found.push({ specifier: match[1], dynamic: false });
	}
	for (const match of source.matchAll(/^\s*import\s*['"]([^'"]+)['"]/gm)) found.push({ specifier: match[1], dynamic: false });
	for (const match of source.matchAll(/\bimport\(\s*['"]([^'"]+)['"]\s*\)/g)) found.push({ specifier: match[1], dynamic: true });
	for (const match of source.matchAll(/\brequire\(\s*['"]([^'"]+)['"]\s*\)/g)) found.push({ specifier: match[1], dynamic: false });
	return found;
}

/** A specifier as a path under apps/web (aliases and relative paths resolved), or the package name. */
function target(file: string, specifier: string): string {
	if (specifier.startsWith('@/')) return specifier.slice(2);
	if (specifier.startsWith('.')) {
		const parts = file.split('/').slice(0, -1);
		for (const segment of specifier.split('/')) {
			if (segment === '..') parts.pop();
			else if (segment !== '.') parts.push(segment);
		}
		return parts.join('/');
	}
	return specifier;
}

interface Rule {
	/** What is guarded (a target path prefix, or a package name). */
	guarded: RegExp;
	/** Who may import it. */
	importers: RegExp[];
	/** Only through a dynamic import() for these importers. */
	dynamicOnly?: RegExp[];
	reason: string;
}

const SECTION_FILES = /^core\/components\/pages\/settings\/team\/ever-(platform-section|stats-card|connect-panel)(\.tsx)?$/;

const RULES: Rule[] = [
	{
		guarded: /^core\/services\/server\/ever-stats(\/|$)/,
		importers: [/^instrumentation\.ts$/, /^app\/api\/ever-stats\//, /^core\/services\/server\/ever-stats\//],
		dynamicOnly: [/^instrumentation\.ts$/],
		reason: 'the statistics reporter is loaded only by instrumentation.ts (dynamic import) and its routes'
	},
	{
		guarded: /^@ever-co\/connect-(sdk|contracts)$/,
		importers: [/^core\/services\/server\/ever-stats\//, /^core\/lib\/ever-platform\/stats-config\.ts$/],
		reason: 'the Ever Platform SDK stays on the server, in the statistics module'
	},
	{
		guarded: /^core\/lib\/ever-platform\/stats-config(\.ts)?$/,
		importers: [
			/^core\/services\/server\/ever-stats\//,
			/^core\/services\/server\/ever-platform\//,
			/^core\/services\/server\/requests\/ever-platform\.ts$/,
			/^app\/api\/ever-(stats|connect)\//
		],
		reason: 'the server-side statistics settings never reach browser code'
	},
	{
		guarded: /^(core\/components\/pages\/settings\/team\/ever-|core\/hooks\/ever-platform\/|core\/services\/client\/api\/ever-platform(\/|$))/,
		importers: [
			/^app\/\[locale\]\/\(main\)\/settings\/team\/page\.tsx$/,
			/^core\/components\/optimized-components\/settings\.tsx$/,
			/^core\/components\/pages\/settings\/left-side-setting-menu\.tsx$/,
			SECTION_FILES,
			/^core\/hooks\/ever-platform\//,
			/^core\/services\/client\/api\/ever-platform\//
		],
		reason: 'the Ever Platform settings are imported only by the team settings, the settings menu and each other'
	}
];

function scanImports(sources: SourceFile[], rules: Rule[] = RULES): string[] {
	const offenders: string[] = [];
	for (const { file, source } of sources) {
		for (const { specifier, dynamic } of importsOf(source)) {
			const to = target(file, specifier);
			for (const rule of rules) {
				if (!rule.guarded.test(to)) continue;
				if (!rule.importers.some((importer) => importer.test(file))) {
					offenders.push(`${file} imports ${specifier}: ${rule.reason}`);
				} else if (!dynamic && rule.dynamicOnly?.some((importer) => importer.test(file))) {
					offenders.push(`${file} imports ${specifier} statically: ${rule.reason}`);
				}
			}
		}
	}
	return offenders;
}

const PLATFORM_HOST_LITERAL = /(['"`])[^'"`\n]*\b(?:api|app)\.ever\.co\b/;
const BASE_URL_VARIABLE = /\bEVER_PLATFORM_API_URL\b/;
const HOST_ALLOWED = [/^core\/lib\/ever-platform\//, /^core\/components\/pages\/settings\/team\/ever-/];
const VARIABLE_ALLOWED = [/^core\/lib\/ever-platform\//];

function scanHosts(sources: SourceFile[]): string[] {
	const offenders: string[] = [];
	for (const { file, source } of sources) {
		if (PLATFORM_HOST_LITERAL.test(source) && !HOST_ALLOWED.some((allowed) => allowed.test(file))) {
			offenders.push(`${file}: an Ever Platform host`);
		}
		if (BASE_URL_VARIABLE.test(source) && !VARIABLE_ALLOWED.some((allowed) => allowed.test(file))) {
			offenders.push(`${file}: the Ever Platform base URL variable`);
		}
	}
	return offenders;
}

describe('the scanners (known-bad inputs)', () => {
	it('flag a static import of the reporter in instrumentation.ts', () => {
		const bad = [{ file: 'instrumentation.ts', source: "import { startEverStats } from './core/services/server/ever-stats/scheduler';\n" }];
		expect(scanImports(bad)).toHaveLength(1);
		const good = [
			{ file: 'instrumentation.ts', source: "const { startEverStats } = await import('./core/services/server/ever-stats/scheduler');\n" }
		];
		expect(scanImports(good)).toEqual([]);
	});

	it('flag the reporter, the SDK or the section imported from elsewhere', () => {
		const bad = [
			{ file: 'core/components/layouts/header.tsx', source: "import { reporterState } from '@/core/services/server/ever-stats/state';\n" },
			{ file: 'core/hooks/common/use-x.ts', source: "import { SDK_VERSION } from '@ever-co/connect-sdk';\n" },
			{ file: 'core/components/pages/settings/personal/x.tsx', source: "export { EverStatsCard } from '../team/ever-stats-card';\n" },
			{ file: 'core/hooks/common/use-y.ts', source: "import { readStatsApiUrl } from '@/core/lib/ever-platform/stats-config';\n" }
		];
		expect(scanImports(bad)).toHaveLength(4);
	});

	it('flag an Ever Platform host or base URL variable outside the allowed places', () => {
		const bad = [
			{ file: 'core/lib/helpers/x.ts', source: "const url = 'https://api.ever.co/v1';\n" },
			{ file: 'app/api/x/route.ts', source: 'const base = process.env.EVER_PLATFORM_API_URL;\n' }
		];
		expect(scanHosts(bad)).toHaveLength(2);
		expect(scanHosts([{ file: 'core/lib/ever-platform/stats-config.ts', source: "const d = 'https://api.ever.co';\n" }])).toEqual([]);
	});
});

describe('the Ever Platform modules in the app', () => {
	const sources = appSources();

	it('scans a meaningful number of files (sanity)', () => {
		expect(sources.length).toBeGreaterThan(200);
		expect(sources.some(({ file }) => file === 'core/services/server/ever-stats/scheduler.ts')).toBe(true);
	});

	it('are imported only where they belong', () => {
		expect(scanImports(sources)).toEqual([]);
	});

	it('name the Ever Platform hosts only in their own files', () => {
		expect(scanHosts(sources)).toEqual([]);
	});
});

describe('switched off', () => {
	const ORIGINAL_ENV = process.env;
	let mockSchedulerLoads = 0;
	const mockStart = jest.fn();

	beforeEach(() => {
		jest.resetModules();
		process.env = { ...ORIGINAL_ENV, NEXT_RUNTIME: 'nodejs' };
		mockSchedulerLoads = 0;
		mockStart.mockReset();
		jest.doMock('@/sentry.server.config', () => ({ initSentryServer: async () => undefined }));
		jest.doMock('@/core/services/server/ever-stats/scheduler', () => {
			mockSchedulerLoads += 1;
			return { startEverStats: mockStart };
		});
	});

	afterEach(() => {
		process.env = ORIGINAL_ENV;
		jest.dontMock('@/sentry.server.config');
		jest.dontMock('@/core/services/server/ever-stats/scheduler');
		jest.dontMock('@/core/lib/helpers/cookies');
	});

	it('EVER_STATS_ENABLED=false: register() loads no statistics module', async () => {
		process.env.EVER_STATS_ENABLED = 'false';
		await require('@/instrumentation').register();
		expect(mockSchedulerLoads).toBe(0);
		expect(mockStart).not.toHaveBeenCalled();
	});

	it('(control) unset: register() loads and starts the reporter once', async () => {
		delete process.env.EVER_STATS_ENABLED;
		await require('@/instrumentation').register();
		expect(mockSchedulerLoads).toBe(1);
		expect(mockStart).toHaveBeenCalledTimes(1);
	});

	it('NEXT_PUBLIC_EVER_CONNECT_ENABLED unset: /api/ever-connect/health answers 404 without a request', async () => {
		delete process.env.NEXT_PUBLIC_EVER_CONNECT_ENABLED;
		process.env.GAUZY_API_SERVER_URL = 'http://api.example.test';
		// A signed-in person: only the switch keeps the route closed.
		jest.doMock('@/core/lib/helpers/cookies', () => ({
			getAccessTokenCookie: () => 'person-token',
			getTenantIdCookie: () => 'tenant-1'
		}));
		const fetchSpy = jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('no request expected'));
		try {
			const { GET } = require('@/app/api/ever-connect/[...path]/route');
			const answer = await GET(new Request('https://teams.example.test/api/ever-connect/health'), {
				params: Promise.resolve({ path: ['health'] })
			});
			expect(answer.status).toBe(404);
			expect(fetchSpy).not.toHaveBeenCalled();
		} finally {
			fetchSpy.mockRestore();
		}
	});
});
