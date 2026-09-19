/**
 * Architecture guard: the self-hosting surfaces (Compose files, .env.docker, deploy docs) describe the
 * RUNTIME configuration contract of the published Docker image.
 *
 * The image bakes nothing deployment-specific (see self-hostable-docker-image.test.ts): every NEXT_PUBLIC_*,
 * branding and secret value is read from the container env. These tests pin what self-hosters rely on:
 * - every docker-compose file is valid YAML (a tab-indented line used to make two of them unparseable);
 * - docker-compose.build.yml still hands its build args to the container at runtime, since the Dockerfile
 *   ignores most of them now;
 * - .env.docker lists the key runtime variables in a form `docker run --env-file` reads correctly;
 * - no doc still claims NEXT_PUBLIC_* values are baked at build time or need an image rebuild;
 * - the Compose / .env.docker branding defaults, which the image now honours, equal the code defaults, and
 *   the invitation / verification email callbacks default to empty (this app's origin), never to Ever's app.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse as parseYaml, parseAllDocuments } from 'yaml';
import { PUBLIC_RUNTIME_ENV_KEYS } from '@/env-config';

const REPOSITORY_ROOT = resolve(__dirname, '../../../..');

function read(relativePath: string): string {
	return readFileSync(resolve(REPOSITORY_ROOT, relativePath), 'utf8').replace(/\r\n/g, '\n');
}

const COMPOSE_FILES = readdirSync(REPOSITORY_ROOT).filter((name) => /^docker-compose(\.[\w-]+)?\.ya?ml$/.test(name));

/** Compose files that run the published (or locally built) production image. */
const IMAGE_COMPOSE_FILES = ['docker-compose.yml', 'docker-compose.demo.yml', 'docker-compose.build.yml'];

/** The effective `environment:` of the webapp service (YAML merge keys resolved). */
function webappEnvironment(file: string): Record<string, string> {
	const compose = parseYaml(read(file), { merge: true }) as {
		services: { webapp: { environment: Record<string, string> } };
	};
	return compose.services.webapp.environment;
}

/** The value Compose uses when the variable is not set in the shell: `${VAR:-default}` -> `default`. */
function composeDefault(value: string | undefined): string | undefined {
	const match = /^\$\{[A-Z0-9_]+:-(.*)\}$/.exec(value ?? '');
	return match ? match[1] : value;
}

/** Active `NAME=value` entries of an env file. */
function envFileValues(relativePath: string): Record<string, string> {
	return Object.fromEntries(
		read(relativePath)
			.split('\n')
			.map((line) => /^([A-Z][A-Z0-9_]*)=(.*)$/.exec(line))
			.filter((match): match is RegExpExecArray => !!match)
			.map((match) => [match[1], match[2]])
	);
}

/** Code defaults of the branding keys: `readRuntimeEnv('X') || process.env.X || 'default'` in constants.tsx. */
const BRANDING_CODE_DEFAULTS: Record<string, string> = Object.fromEntries(
	[
		...read('apps/web/core/constants/config/constants.tsx').matchAll(
			/readRuntimeEnv\('([A-Z0-9_]+)'\)\s*\|\|\s*process\.env\.\1\s*\|\|\s*'([^']*)'/g
		)
	].map((match) => [match[1], match[2]])
);

describe('self-hosting surfaces', () => {
	it('finds the docker-compose files', () => {
		expect(COMPOSE_FILES).toEqual(
			expect.arrayContaining([
				'docker-compose.yml',
				'docker-compose.demo.yml',
				'docker-compose.build.yml',
				'docker-compose.dev.yml'
			])
		);
	});

	it.each(COMPOSE_FILES)('%s is valid YAML', (file) => {
		const documents = parseAllDocuments(read(file), { merge: true });
		const errors = documents.flatMap((document) => document.errors.map((error) => error.message));

		expect(documents.length).toBeGreaterThan(0);
		expect(errors).toEqual([]);
	});

	it('docker-compose.build.yml passes every build arg to the container at runtime', () => {
		const compose = parseYaml(read('docker-compose.build.yml'), { merge: true }) as {
			services: { webapp: { build: { args: Record<string, string> }; environment: Record<string, string> } };
		};
		const { build, environment } = compose.services.webapp;

		expect(Object.keys(build.args).filter((name) => !(name in environment))).toEqual([]);
	});

	// The previous image ignored these Compose / .env.docker values (it baked its own); the runtime image
	// honours them, so a stale default silently changes the UI or the links in emails.
	describe('defaults the runtime image now honours', () => {
		const CALLBACK_KEYS = ['INVITE_CALLBACK_URL', 'VERIFY_EMAIL_CALLBACK_URL'];

		it('finds a code default for every branding key in constants.tsx', () => {
			expect(PUBLIC_RUNTIME_ENV_KEYS.filter((key) => BRANDING_CODE_DEFAULTS[key] === undefined)).toEqual([]);
		});

		it.each(IMAGE_COMPOSE_FILES)('%s: branding defaults equal the code defaults', (file) => {
			const environment = webappEnvironment(file);
			const mismatches = PUBLIC_RUNTIME_ENV_KEYS.filter(
				(key) => key in environment && composeDefault(environment[key]) !== BRANDING_CODE_DEFAULTS[key]
			).map((key) => `${key}: ${composeDefault(environment[key])} (code: ${BRANDING_CODE_DEFAULTS[key]})`);

			expect(mismatches).toEqual([]);
		});

		it('.env.docker: branding values equal the code defaults', () => {
			const values = envFileValues('.env.docker');
			const mismatches = PUBLIC_RUNTIME_ENV_KEYS.filter(
				(key) => key in values && values[key] !== BRANDING_CODE_DEFAULTS[key]
			).map((key) => `${key}: ${values[key]} (code: ${BRANDING_CODE_DEFAULTS[key]})`);

			expect(mismatches).toEqual([]);
		});

		// When set, these override the link built from this app's origin in invitation / verification emails.
		it.each(IMAGE_COMPOSE_FILES)("%s: email callback URLs default to empty (this app's origin)", (file) => {
			const environment = webappEnvironment(file);

			expect(CALLBACK_KEYS.map((key) => [key, composeDefault(environment[key]) ?? ''])).toEqual(
				CALLBACK_KEYS.map((key) => [key, ''])
			);
		});

		it(".env.docker: email callback URLs are empty (this app's origin)", () => {
			const values = envFileValues('.env.docker');

			expect(CALLBACK_KEYS.map((key) => [key, values[key] ?? ''])).toEqual(CALLBACK_KEYS.map((key) => [key, '']));
		});
	});

	it.each(['.env.docker', 'apps/web/.env.sample'])(
		'%s: GAUZY_API_SERVER_URL is an origin (the app appends /api)',
		(file) => {
			const value = envFileValues(file).GAUZY_API_SERVER_URL?.replace(/^["']|["']$/g, '');

			expect(value).toBeTruthy();
			expect(value).not.toMatch(/\/api\/?$/);
		}
	);

	describe('.env.docker (runtime reference of the prebuilt image)', () => {
		const envDocker = read('.env.docker');
		const lines = envDocker.split('\n');
		// Active and commented-out (`# NAME=`) entries both document a variable.
		const documented = new Set(
			lines.map((line) => /^#?\s*([A-Z][A-Z0-9_]*)=/.exec(line)?.[1]).filter((name): name is string => !!name)
		);

		it('documents the key runtime variables', () => {
			const expected = [
				'GAUZY_API_SERVER_URL',
				'NEXT_PUBLIC_GAUZY_API_SERVER_URL',
				'AUTH_SECRET',
				'NEXT_PUBLIC_CAPTCHA_TYPE',
				'NEXT_PUBLIC_CAPTCHA_SITE_KEY',
				'CAPTCHA_SECRET_KEY',
				'NEXT_PUBLIC_IMAGES_HOSTS',
				'NEXT_PUBLIC_CHATWOOT_API_KEY',
				'NEXT_PUBLIC_CHATWOOT_BASE_URL',
				'NEXT_PUBLIC_MEET_TYPE',
				'NEXT_PUBLIC_LIVEKIT_URL',
				'NEXT_PUBLIC_DEMO',
				...PUBLIC_RUNTIME_ENV_KEYS
			];

			expect(expected.filter((name) => !documented.has(name))).toEqual([]);
		});

		it('is readable by `docker run --env-file` (no inline comments, no quotes)', () => {
			// docker run --env-file keeps everything after `=` literally: a trailing `# comment` or quotes
			// would become part of the value.
			const entries = lines.filter((line) => /^[A-Z][A-Z0-9_]*=/.test(line));

			expect(entries.length).toBeGreaterThan(0);
			expect(entries.filter((line) => /\s#/.test(line) || /=["']/.test(line))).toEqual([]);
		});

		it('lists the variables no code reads under "NOT READ BY THE PREBUILT IMAGE"', () => {
			// NEXT_PUBLIC_GA_MEASUREMENT_ID: the gtag snippet in app/[locale]/layout.tsx is commented out.
			// NEXT_PUBLIC_COOKIE_DOMAINS: COOKIE_DOMAINS is never imported; cookies are host-only.
			const start = envDocker.indexOf('# NOT READ BY THE PREBUILT IMAGE');
			const misplaced = ['NEXT_PUBLIC_GA_MEASUREMENT_ID', 'NEXT_PUBLIC_COOKIE_DOMAINS'].filter((name) => {
				const entry = new RegExp(`^${name}=`, 'm');
				return entry.test(envDocker.slice(0, start)) || !entry.test(envDocker.slice(start));
			});

			expect(start).toBeGreaterThan(-1);
			expect(misplaced).toEqual([]);
		});
	});

	it('no deploy doc claims NEXT_PUBLIC_* values are baked at build time', () => {
		const docs = [
			'README.md',
			'CLAUDE.md',
			'.env.docker',
			'.env.compose',
			'.env.demo.compose',
			'.deploy/web/Dockerfile.dev',
			'.deploy/ever-k8s/README.md',
			'.deploy/ever-k8s/ever-teams-web.yaml',
			...COMPOSE_FILES
		];
		const staleClaims = [
			/NEXT_PUBLIC_\S*\s+(?:variables\s+)?(?:is|are)\s+baked/i,
			/requires an image rebuild/i,
			/\(build-time arg\)/i,
			/env\.js` handles environment injection/i
		];

		const offenders = docs.flatMap((doc) => {
			const source = read(doc);
			return staleClaims.filter((claim) => claim.test(source)).map((claim) => `${doc}: ${claim}`);
		});

		expect(offenders).toEqual([]);
	});
});
