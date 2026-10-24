/**
 * Architecture guard: the SDK demo images are re-usable too.
 *
 * `.github/workflows/k8s-build-examples.yml` publishes eight images (the six toolkit examples, the
 * builder and the Storybook). They were not configurable at all: every one of them resolved its
 * Gauzy API URL from a value Next or Vite inlines at BUILD time, and the workflow sets none — so
 * seven of the eight shipped `apiUrl: undefined` and could reach no API, while the Storybook froze
 * Ever's production API into a static bundle. The saas-starter Dockerfile also wrote a literal
 * `${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}` into the image as a Stripe key.
 *
 * The contract pinned here, mirroring test/architecture/self-hostable-docker-image.test.ts for the
 * web image:
 * - no deployment value is a Docker build arg, in the workflow or in any of the eight Dockerfiles;
 * - the two Next demos with an `env` block no longer inline through it;
 * - demo code reads NEXT_PUBLIC_* / VITE_* / STORYBOOK_* through readRuntimeEnv(), never from the
 *   inlined literal alone;
 * - the two static images (Vite, Storybook) publish the container env through runtime-config.js.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { parse as parseYaml } from 'yaml';

const REPOSITORY_ROOT = resolve(__dirname, '../../../..');

function read(relativePath: string): string {
	return readFileSync(resolve(REPOSITORY_ROOT, relativePath), 'utf8');
}

type Workflow = {
	jobs: Record<
		string,
		{
			strategy?: { matrix?: { include?: { image: string; dockerfile: string }[] } };
			steps: { uses?: string; with?: Record<string, string> }[];
		}
	>;
};

const workflow = parseYaml(read('.github/workflows/k8s-build-examples.yml')) as Workflow;
const matrix = workflow.jobs.build.strategy?.matrix?.include ?? [];
const DOCKERFILES = matrix.map((entry) => entry.dockerfile);

// Deployment values Next/Vite would inline, and anything secret-shaped.
const INLINED_VAR = /^(NEXT_PUBLIC_|VITE_|STORYBOOK_)/;
const SECRET_VAR = /(SECRET|PASSWORD|_TOKEN$|API_KEY$|WRITE_KEY$)/;

function declaredNames(dockerfile: string, instruction: 'ARG' | 'ENV'): string[] {
	return Array.from(dockerfile.matchAll(new RegExp(`^${instruction}\\s+([A-Z0-9_]+)`, 'gm')), (m) => m[1]);
}

describe('SDK demo images', () => {
	it('builds every image in the matrix from a Dockerfile that exists', () => {
		expect(DOCKERFILES.length).toBe(8);
		for (const dockerfile of DOCKERFILES) {
			expect(existsSync(resolve(REPOSITORY_ROOT, dockerfile))).toBe(true);
		}
	});

	it('passes no build args at all', () => {
		// Any version of the action: a bump must not turn this guard into a no-op.
		const build = workflow.jobs.build.steps.find((step) => step.uses?.startsWith('docker/build-push-action@'));

		expect(build).toBeDefined();
		expect(build?.with?.['build-args']).toBeUndefined();
	});

	it.each(DOCKERFILES)('declares no deployment value in %s', (dockerfile) => {
		const content = read(dockerfile);
		const declared = [...declaredNames(content, 'ARG'), ...declaredNames(content, 'ENV')];

		// `ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=\${...}` put the literal `${NEXT_PUBLIC_...}` in the
		// image, which next.config's env block then inlined into the client bundle as a Stripe key.
		expect(declared.filter((name) => INLINED_VAR.test(name))).toEqual([]);
		expect(declared.filter((name) => SECRET_VAR.test(name))).toEqual([]);
	});

	it.each([
		'packages/toolkit/examples/saas-starter/next.config.ts',
		'packages/toolkit/examples/next-boilerplate-ixartz/next.config.ts'
	])('keeps %s free of an env block (Next inlines every key of it)', (config) => {
		expect(read(config)).not.toMatch(/^\s*env:\s*\{/m);
	});

	it.each(['apps/storybook', 'packages/toolkit/examples/vite'])(
		'publishes the container env to the static bundle of %s',
		(app) => {
			const dockerfile = read(`${app}/Dockerfile`);

			expect(dockerfile).toContain('.deploy/examples/runtime-config.sh');
			expect(dockerfile).toContain('/docker-entrypoint.d/');
			expect(dockerfile).toMatch(/^ENV RUNTIME_ENV_KEYS=/m);
			expect(existsSync(resolve(REPOSITORY_ROOT, '.deploy/examples/runtime-config.sh'))).toBe(true);

			const page = app === 'apps/storybook' ? '.storybook/preview-head.html' : 'index.html';
			expect(read(`${app}/${page}`)).toContain('runtime-config.js');
		}
	);
});

// ---------------------------------------------------------------------------------------------
// Source scan: the demos read their configuration at runtime.
// ---------------------------------------------------------------------------------------------

const SCANNED_DIRS = ['packages/toolkit/examples', 'packages/toolkit/builder', 'apps/storybook'];
const SKIPPED_DIRS = new Set(['node_modules', '.next', 'dist', 'build', 'storybook-static', '.turbo', 'public']);
/**
 * Reads that stay build-time, each for a stated reason. This list is the visible edge of the work:
 * a NEW un-runtime read fails this test, and anything here is a known gap, not an oversight.
 *
 * - PUBLIC_TEAMS_API_URL: read per request inside the Remix `loader()`, so already runtime.
 * - NEXT_PUBLIC_DEFAULT_BUILDER_URL: an in-app route ('/builder/builder-demo'), not a deployment value.
 * - The rest are third-party SDK keys of the builder and ixartz demos (Clerk, Plasmic, Builder.io,
 *   Sentry, Google One Tap) read at module scope in client components. The published images set none
 *   of them, so nothing is baked in — but configuring them still needs a rebuild. Making them runtime
 *   means giving those demos the web app's payload mechanism; tracked, not done here.
 */
const BUILD_TIME_READS = new Set([
	'PUBLIC_TEAMS_API_URL',
	'NEXT_PUBLIC_DEFAULT_BUILDER_URL',
	'NEXT_PUBLIC_APP_URL',
	'NEXT_PUBLIC_BUILDER_API_KEY',
	'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
	'NEXT_PUBLIC_CLERK_SIGN_IN_URL',
	'NEXT_PUBLIC_ENCRYPTION_KEY',
	'NEXT_PUBLIC_GOOGLE_CLIENT_ID',
	'NEXT_PUBLIC_PLASMIC_API_TOKEN',
	'NEXT_PUBLIC_PLASMIC_PROJECT_ID',
	'NEXT_PUBLIC_SENTRY_DSN',
	'NEXT_PUBLIC_TEAMS_API_KEY'
]);
const TEST_FILE = /\.(test|spec)\.[jt]sx?$/;

function walk(dir: string, out: string[] = []): string[] {
	if (!existsSync(dir)) return out;
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) {
			if (SKIPPED_DIRS.has(entry)) continue;
			walk(full, out);
		} else if (/\.[jt]sx?$/.test(entry) && !TEST_FILE.test(entry)) {
			out.push(full);
		}
	}
	return out;
}

describe('runtime reads in the demo apps', () => {
	it('never reads a deployment value only from the build-time inlined literal', () => {
		const files = SCANNED_DIRS.flatMap((dir) => walk(resolve(REPOSITORY_ROOT, dir)));
		const offenders: string[] = [];

		for (const file of files) {
			const source = readFileSync(file, 'utf8');
			const reads = [
				...source.matchAll(/process\.env\.(NEXT_PUBLIC_[A-Z0-9_]+|PUBLIC_[A-Z0-9_]+|STORYBOOK_[A-Z0-9_]+)/g),
				...source.matchAll(/import\.meta\.env\.((?:VITE|STORYBOOK)_[A-Z0-9_]+)/g)
			];
			for (const match of reads) {
				const name = match[1];
				if (BUILD_TIME_READS.has(name)) continue;
				// Allowed as the fallback of a runtime read of the same variable, e.g.
				// `readRuntimeEnv('NEXT_PUBLIC_X') || process.env.NEXT_PUBLIC_X` on a server, or
				// `runtimeEnv?.STORYBOOK_X || import.meta.env.STORYBOOK_X` in a static bundle.
				const before = source.slice(Math.max(0, (match.index ?? 0) - 240), match.index);
				const runtimeRead = new RegExp(`(readRuntimeEnv\\(\\s*['"\`]${name}['"\`]|runtimeEnv\\??\\.${name})`);
				if (!runtimeRead.test(before)) {
					const line = source.slice(0, match.index).split('\n').length;
					offenders.push(`${file.slice(REPOSITORY_ROOT.length + 1).split(sep).join('/')}:${line} ${name}`);
				}
			}
		}

		expect(files.length).toBeGreaterThan(50);
		expect(offenders).toEqual([]);
	});
});
