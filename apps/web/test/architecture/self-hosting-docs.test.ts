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
 *   the invitation / verification email callbacks default to empty (this app's origin), never to Ever's app;
 * - the services Ever operates for its own deployments (Jitsi, whiteboard, GitHub App) default to off, so a
 *   self-hoster never silently runs against Ever's servers;
 * - the one-click templates (Heroku, Fly, Northflank, Render) pass the runtime env and a per-deployment
 *   AUTH_SECRET, never a published one.
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
	return serviceEnvironment(file, 'webapp');
}

/** The effective `environment:` (map form) of a Compose service (YAML merge keys resolved). */
function serviceEnvironment(file: string, service: string): Record<string, string> {
	const compose = parseYaml(read(file), { merge: true }) as {
		services: Record<string, { environment: Record<string, string> }>;
	};
	return compose.services[service].environment;
}

/** The web app service of each Compose file that runs the web app. */
const WEB_COMPOSE_SERVICES: [file: string, service: string][] = [
	...IMAGE_COMPOSE_FILES.map((file): [string, string] => [file, 'webapp']),
	['docker-compose.dev.yml', 'webapp-dev']
];

/**
 * Settings whose only meaningful non-empty value in these files would be Ever's own service or domain (Jitsi,
 * whiteboard, GitHub App slug, cookie domain). Empty = feature off / app default.
 */
const EVER_OPERATED_KEYS = [
	'NEXT_PUBLIC_MEET_DOMAIN',
	'NEXT_PUBLIC_BOARD_APP_DOMAIN',
	'NEXT_PUBLIC_BOARD_BACKEND_POST_URL',
	'NEXT_PUBLIC_BOARD_FIREBASE_CONFIG',
	'NEXT_PUBLIC_GITHUB_APP_NAME',
	'NEXT_PUBLIC_COOKIE_DOMAINS'
];

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

		// Loaded by every build from source (Render, Vercel, `yarn build`), so a value here would send every
		// invitee of such a deployment to Ever's app.
		it("apps/web/.env: email callback URLs are empty (this app's origin)", () => {
			const values = envFileValues('apps/web/.env');

			expect(CALLBACK_KEYS.map((key) => [key, values[key] ?? ''])).toEqual(CALLBACK_KEYS.map((key) => [key, '']));
		});
	});

	// A self-hoster who passes these files as they are must not end up on Ever's Jitsi / whiteboard servers or
	// Ever's GitHub App: the defaults leave those features off, and the Ever values are only documented.
	describe('Ever-operated services are opt-in', () => {
		it.each(WEB_COMPOSE_SERVICES)('%s (%s): Ever-operated settings default to empty', (file, service) => {
			const environment = serviceEnvironment(file, service);
			const nonEmpty = EVER_OPERATED_KEYS.filter(
				(key) => key in environment && (composeDefault(environment[key]) ?? '') !== ''
			).map((key) => `${key}: ${composeDefault(environment[key])}`);

			expect(nonEmpty).toEqual([]);
		});

		it('.env.docker: Ever-operated settings are empty', () => {
			const values = envFileValues('.env.docker');
			const nonEmpty = EVER_OPERATED_KEYS.filter((key) => (values[key] ?? '') !== '').map(
				(key) => `${key}=${values[key]}`
			);

			expect(nonEmpty).toEqual([]);
		});

		it('.env.docker: every Ever-operated service keeps a commented, labelled example', () => {
			const labelledExamples = read('.env.docker')
				.split('\n')
				.filter((line) => line.startsWith('#') && line.includes('(Ever-operated: '));
			const ever = [
				'meet.ever.team',
				'https://board.ever.team',
				'https://jsonboard.ever.team/api/v2/post/',
				'ever-github'
			];

			expect(ever.filter((value) => !labelledExamples.some((line) => line.includes(value)))).toEqual([]);
		});
	});

	describe('social login behind a reverse proxy', () => {
		it.each(IMAGE_COMPOSE_FILES)('%s passes AUTH_URL through (empty = taken from the request)', (file) => {
			expect(webappEnvironment(file).AUTH_URL).toBe('${AUTH_URL:-}');
		});
	});

	describe('docker-compose.build.yml demo mode', () => {
		// A literal 'true' made demo mode impossible to turn off from .env.docker or the shell.
		it('can be turned off from the env (build arg and runtime env)', () => {
			const compose = parseYaml(read('docker-compose.build.yml'), { merge: true }) as {
				services: { webapp: { build: { args: Record<string, string> }; environment: Record<string, string> } };
			};
			const { build, environment } = compose.services.webapp;

			expect([build.args.NEXT_PUBLIC_DEMO, environment.NEXT_PUBLIC_DEMO]).toEqual([
				'${NEXT_PUBLIC_DEMO:-true}',
				'${NEXT_PUBLIC_DEMO:-true}'
			]);
		});
	});

	// The one-click deploy buttons used to start the app with no runtime env at all (so no AUTH_SECRET), or,
	// for Render, with Ever's callback URLs and the public AUTH_SECRET of apps/web/.env.
	describe('one-click templates', () => {
		it('app.json (Heroku) generates AUTH_SECRET and asks for the API origins', () => {
			const app = JSON.parse(read('app.json')) as {
				env: Record<string, { generator?: string; value?: string; required?: boolean }>;
			};

			expect(app.env.AUTH_SECRET).toEqual(expect.objectContaining({ generator: 'secret' }));
			expect(app.env.AUTH_SECRET.value).toBeUndefined();
			for (const key of ['GAUZY_API_SERVER_URL', 'NEXT_PUBLIC_GAUZY_API_SERVER_URL']) {
				expect(app.env[key]).toEqual(
					expect.objectContaining({ value: 'https://api.ever.team', required: true })
				);
			}
		});

		it('fly.toml sets the API origins in [env] and keeps AUTH_SECRET out of the file', () => {
			const fly = read('fly.toml');
			const envTable = /^\[env\]\n((?:[ \t]*[A-Z0-9_]+ = "[^"\n]*"\n)+)/m.exec(fly)?.[1] ?? '';
			const env = Object.fromEntries(
				[...envTable.matchAll(/^[ \t]*([A-Z0-9_]+) = "([^"\n]*)"$/gm)].map((match) => [match[1], match[2]])
			);

			expect(env).toEqual({
				GAUZY_API_SERVER_URL: 'https://api.ever.team',
				NEXT_PUBLIC_GAUZY_API_SERVER_URL: 'https://api.ever.team'
			});
			expect(fly).toMatch(/^#.*fly secrets set AUTH_SECRET=/m);
		});

		it('northflank-template.json sets the API origins and a generated AUTH_SECRET secret', () => {
			type Node = {
				kind: string;
				spec?: {
					steps?: Node[];
					runtimeEnvironment?: Record<string, string>;
					secrets?: { variables?: Record<string, string> };
				};
			};
			const template = JSON.parse(read('northflank-template.json')) as { spec: Node };
			const nodes: Node[] = [];
			const collect = (node: Node) => {
				nodes.push(node);
				for (const step of node.spec?.steps ?? []) collect(step);
			};
			collect(template.spec);
			const service = nodes.find((node) => node.kind === 'DeploymentService');
			const secretGroup = nodes.find((node) => node.kind === 'SecretGroup');

			expect(service?.spec?.runtimeEnvironment).toEqual({
				GAUZY_API_SERVER_URL: 'https://api.ever.team',
				NEXT_PUBLIC_GAUZY_API_SERVER_URL: 'https://api.ever.team'
			});
			// Generated once per deployment and kept across template runs (Northflank randomSecret).
			expect(secretGroup?.spec?.secrets?.variables?.AUTH_SECRET).toMatch(/^\$\{fn\.randomSecret\(\d+\)\}$/);
		});

		it.each(['render.yaml', '.render/render.dev.yaml'])(
			"%s generates AUTH_SECRET and no longer sends email links to Ever's app",
			(file) => {
				const blueprint = parseYaml(read(file)) as {
					services: { envVars: { key: string; value?: unknown; generateValue?: boolean }[] }[];
				};
				const envVars = blueprint.services[0].envVars;
				const byKey = Object.fromEntries(envVars.map((envVar) => [envVar.key, envVar]));

				expect(byKey.AUTH_SECRET).toEqual({ key: 'AUTH_SECRET', generateValue: true });
				expect(
					envVars
						.filter((envVar) => /CALLBACK_URL$|^NEXT_PUBLIC_COOKIE_DOMAINS$/.test(envVar.key))
						.map((envVar) => envVar.key)
				).toEqual([]);
			}
		);
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
				'NEXT_PUBLIC_DEMO_ACCOUNTS',
				'AUTH_URL',
				'APP_FAVICON_URL',
				'NEXT_PUBLIC_MEET_DOMAIN',
				'NEXT_PUBLIC_BOARD_APP_DOMAIN',
				'NEXT_PUBLIC_BOARD_BACKEND_POST_URL',
				'NEXT_PUBLIC_GITHUB_APP_NAME',
				'SENTRY_DSN',
				'NEXT_PUBLIC_SENTRY_DSN',
				'NEXT_PUBLIC_POSTHOG_HOST',
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
