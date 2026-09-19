/**
 * Architecture guard: the published Docker image must be configurable at RUNTIME.
 *
 * Next.js inlines every `process.env.NEXT_PUBLIC_*` whose value is defined at build time (an empty
 * string counts) — and every key of next.config's `env` block — into the client AND server bundles.
 * The web image used to receive Ever's production values (reCAPTCHA site key, API URL, analytics
 * keys, ...) as build args and bake them in, and the Dockerfile's `ENV X=${X}` lines baked "" for
 * every arg nobody passed. Nobody could self-host the published image with their own keys: no
 * `docker run -e` could override them.
 *
 * The contract these tests pin:
 * - the image is built without deployment-specific values (Dockerfile + publish workflows);
 * - branding is not inlined through next.config's `env` block;
 * - the runtime env reaches the browser through app/layout.tsx -> <RuntimeEnvScript /> in <head>;
 * - app code reads NEXT_PUBLIC_* through readRuntimeEnv()/getNextPublicEnv(), with the literal
 *   `process.env.NEXT_PUBLIC_X` at most as the build-time fallback.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { PUBLIC_RUNTIME_ENV_KEYS } from '@/env-config';

const WEB_ROOT = resolve(__dirname, '../..');
const REPOSITORY_ROOT = resolve(WEB_ROOT, '../..');

function read(relativePath: string): string {
	return readFileSync(resolve(REPOSITORY_ROOT, relativePath), 'utf8');
}

// NEXT_PUBLIC_* values that legitimately describe the BUILD itself, not a deployment.
const BUILD_TIME_PUBLIC_VARS = ['NEXT_PUBLIC_BUILD_VERSION', 'NEXT_PUBLIC_BUILD_SHA'];
const SECRET_VAR = /(SECRET|PASSWORD|_TOKEN$|API_KEY$|WRITE_KEY$)/;

function dockerBuildStage(dockerfile: string): string {
	const start = dockerfile.indexOf('FROM base AS build');
	const end = dockerfile.indexOf('\nFROM ', start + 1);
	expect(start).toBeGreaterThan(-1);
	expect(end).toBeGreaterThan(start);
	return dockerfile.slice(start, end);
}

function declaredNames(section: string, instruction: 'ARG' | 'ENV'): string[] {
	return Array.from(section.matchAll(new RegExp(`^${instruction}\\s+([A-Z0-9_]+)`, 'gm')), (m) => m[1]);
}

describe('self-hostable Docker image', () => {
	const dockerfile = read('.deploy/web/Dockerfile');

	it('does not define deployment-specific values while building the web app', () => {
		const buildStage = dockerBuildStage(dockerfile);
		const defined = [...declaredNames(buildStage, 'ARG'), ...declaredNames(buildStage, 'ENV')];

		const publicVars = defined.filter((name) => name.startsWith('NEXT_PUBLIC_'));
		// NEXT_PUBLIC_IMAGES_HOSTS only feeds next.config's image optimizer allowlist (build-time by
		// nature); runtime hosts are handled separately.
		expect(
			publicVars.filter((name) => ![...BUILD_TIME_PUBLIC_VARS, 'NEXT_PUBLIC_IMAGES_HOSTS'].includes(name))
		).toEqual([]);
		expect(defined.filter((name) => (PUBLIC_RUNTIME_ENV_KEYS as readonly string[]).includes(name))).toEqual([]);
		expect(defined.filter((name) => name !== 'VERDACCIO_TOKEN' && SECRET_VAR.test(name))).toEqual([]);
	});

	it('declares no deployment-specific build args before the first stage', () => {
		const globalSection = dockerfile.slice(0, dockerfile.indexOf('\nFROM '));
		const globalArgs = declaredNames(globalSection, 'ARG');

		expect(globalArgs.filter((name) => name.startsWith('NEXT_PUBLIC_'))).toEqual(BUILD_TIME_PUBLIC_VARS);
		expect(globalArgs.filter((name) => SECRET_VAR.test(name))).toEqual([]);
	});

	it.each(['dev', 'stage', 'prod'])('does not bake deployment values in the %s publish workflow', (environment) => {
		const workflow = parseYaml(read(`.github/workflows/docker-build-publish-${environment}.yml`)) as {
			jobs: Record<string, { steps: { uses?: string; with?: Record<string, string> }[] }>;
		};
		// Any version of the action: a bump must not turn this guard into a no-op.
		const build = workflow.jobs['ever-teams-webapp'].steps.find((step) =>
			step.uses?.startsWith('docker/build-push-action@')
		);
		expect(build?.with?.file).toBe('./.deploy/web/Dockerfile');
		const buildArgNames = String(build?.with?.['build-args'] ?? '')
			.split('\n')
			.map((line) => line.trim().split('=')[0])
			.filter(Boolean);

		// NEXT_PUBLIC_DEMO only sets the image's runtime default (final-stage ENV), it is not inlined.
		expect(
			buildArgNames.filter(
				(name) =>
					name.startsWith('NEXT_PUBLIC_') && ![...BUILD_TIME_PUBLIC_VARS, 'NEXT_PUBLIC_DEMO'].includes(name)
			)
		).toEqual([]);
		expect(buildArgNames.filter((name) => name !== 'VERDACCIO_TOKEN' && SECRET_VAR.test(name))).toEqual([]);
	});

	it('keeps branding out of the next.config env block (it would be inlined at build time)', () => {
		const nextConfig = read('apps/web/next.config.js');
		const envBlock = nextConfig.slice(
			nextConfig.indexOf('\tenv: {'),
			nextConfig.indexOf('\t},', nextConfig.indexOf('\tenv: {'))
		);

		expect(envBlock).toContain('NEXT_PUBLIC_BUILD_VERSION');
		for (const key of PUBLIC_RUNTIME_ENV_KEYS) {
			expect(envBlock).not.toMatch(new RegExp(`\\b${key}\\s*:`));
		}
	});

	it('publishes the runtime env to the browser before any bundle runs', () => {
		const rootLayout = read('apps/web/app/layout.tsx');
		const localeLayout = read('apps/web/app/[locale]/layout.tsx');

		expect(rootLayout).toContain('getPublicRuntimeEnv()');
		expect(rootLayout).toMatch(/<RuntimeEnvProvider env=\{runtimeEnv\}>/);
		// Per-request, never frozen into prerendered HTML.
		expect(rootLayout).toContain('await connection()');
		// First child of <head>: executes during HTML parsing, ahead of Next's bootstrap chunks.
		expect(localeLayout).toMatch(/<head>\s*(\{\/\*[\s\S]*?\*\/\}\s*)?<RuntimeEnvScript \/>/);
		// Documents rendered without app/[locale]/layout.tsx (the root not-found) carry it themselves.
		expect(read('apps/web/app/not-found.tsx')).toMatch(/<RuntimeEnvScript \/>\s*<NotFound \/>/);
	});
});

// ---------------------------------------------------------------------------------------------
// Source scan: no build-frozen NEXT_PUBLIC_* reads in app code.
// ---------------------------------------------------------------------------------------------

const SCANNED_DIRS = ['app', 'core'];
const SCANNED_ROOT_FILES = ['proxy.ts', 'auth.ts', 'sentry.client.config.ts'];
// Values that are build-time by design (build identity / build flavour / Vercel-only).
const BUILD_TIME_READS = new Set([...BUILD_TIME_PUBLIC_VARS, 'NEXT_PUBLIC_IS_DESKTOP_APP', 'NEXT_PUBLIC_VERCEL_ENV']);
const TEST_FILE = /\.(test|spec)\.[jt]sx?$/;

function walk(dir: string, out: string[] = []): string[] {
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) {
			if (entry === 'node_modules' || entry === '.next' || entry === '__tests__') continue;
			walk(full, out);
		} else if (/\.[jt]sx?$/.test(entry) && !TEST_FILE.test(entry)) {
			out.push(full);
		}
	}
	return out;
}

describe('runtime reads of NEXT_PUBLIC_* in app code', () => {
	it('never reads a deployment value only from the build-time inlined literal', () => {
		const files = [
			...SCANNED_DIRS.flatMap((dir) => walk(join(WEB_ROOT, dir))),
			...SCANNED_ROOT_FILES.map((file) => join(WEB_ROOT, file))
		];
		const offenders: string[] = [];

		for (const file of files) {
			const source = readFileSync(file, 'utf8');
			for (const match of source.matchAll(/process\.env\.(NEXT_PUBLIC_[A-Z0-9_]+)/g)) {
				const name = match[1];
				if (BUILD_TIME_READS.has(name)) continue;
				// Allowed as the fallback of a runtime read of the same variable, e.g.
				// `readRuntimeEnv('NEXT_PUBLIC_X') || process.env.NEXT_PUBLIC_X` or
				// `getNextPublicEnv('NEXT_PUBLIC_X', process.env.NEXT_PUBLIC_X)`.
				const before = source.slice(Math.max(0, (match.index ?? 0) - 240), match.index);
				const runtimeRead = new RegExp(`(readRuntimeEnv|getNextPublicEnv)\\(\\s*['"\`]${name}['"\`]`);
				if (!runtimeRead.test(before)) {
					const line = source.slice(0, match.index).split('\n').length;
					offenders.push(`${relative(WEB_ROOT, file).split(sep).join('/')}:${line} ${name}`);
				}
			}
		}

		expect(offenders).toEqual([]);
	});
});
