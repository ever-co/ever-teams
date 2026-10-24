/**
 * Architecture guard: the second published image, ghcr.io/ever-co/ever-teams-chatgpt-{dev,stage,prod}
 * (apps/chatgpt/Dockerfile, built by .github/workflows/chatgpt.docker-build-publish-*.yml), must build and
 * be self-hostable.
 *
 * It never published: the Dockerfile COPYed packages/config-typescript and packages/config-eslint, which do
 * not exist (the workspace packages are packages/ts-config and packages/eslint-config), and its node:20 base
 * fails the root package.json `engines` check that `yarn install` enforces. Once built, it advertised Ever's
 * own domain to ChatGPT (`openai/widgetDomain: 'ever.team'`) whatever the deployment.
 *
 * The contract these tests pin:
 * - every COPY source exists, and each `yarn install` sees every workspace manifest it has to resolve;
 * - the Node base image satisfies the root `engines` constraint;
 * - nothing deployment-specific is a build argument (the Node app reads its config from the runtime env);
 * - Ever's hosts appear in the app source only as the runtime-overridable defaults of src/config/environment.ts.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { parse as parseYaml } from 'yaml';

const REPOSITORY_ROOT = resolve(__dirname, '../../../..');
const CHATGPT_ROOT = join(REPOSITORY_ROOT, 'apps/chatgpt');

function read(relativePath: string): string {
	return readFileSync(resolve(REPOSITORY_ROOT, relativePath), 'utf8');
}

function readJson<T>(relativePath: string): T {
	return JSON.parse(read(relativePath)) as T;
}

type Manifest = {
	name: string;
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
	optionalDependencies?: Record<string, string>;
	peerDependencies?: Record<string, string>;
	engines?: Record<string, string>;
	workspaces?: { packages: string[] } | string[];
};

type Stage = { name: string; from: string; instructions: string[] };

const dockerfile = read('apps/chatgpt/Dockerfile').replace(/\r\n/g, '\n');

function dockerInstructions(source: string): string[] {
	return source
		.replace(/\\\n/g, ' ')
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line && !line.startsWith('#'));
}

function dockerStages(source: string): Stage[] {
	const stages: Stage[] = [];
	for (const instruction of dockerInstructions(source)) {
		const from = /^FROM\s+(\S+)(?:\s+AS\s+(\S+))?/i.exec(instruction);
		if (from) {
			stages.push({ name: from[2] ?? String(stages.length), from: from[1], instructions: [] });
		} else if (stages.length > 0) {
			stages.at(-1)?.instructions.push(instruction);
		}
	}
	return stages;
}

/** Context paths of `COPY <src>... <dest>` (flags and `COPY --from=<stage>` excluded). */
function copySources(instruction: string): string[] {
	const tokens = instruction.split(/\s+/).slice(1);
	if (!/^COPY$/i.test(instruction.split(/\s+/)[0]) || tokens.some((token) => token.startsWith('--from='))) return [];
	return tokens.filter((token) => !token.startsWith('--')).slice(0, -1);
}

function workspaceDependencies(manifest: Manifest, workspaces: Map<string, string>): string[] {
	return Object.keys({
		...manifest.dependencies,
		...manifest.devDependencies,
		...manifest.optionalDependencies
	}).filter((name) => workspaces.has(name));
}

/** Workspace package name -> repository-relative directory, from the root `workspaces` globs. */
function workspacePackages(root: Manifest): Map<string, string> {
	const patterns = Array.isArray(root.workspaces) ? root.workspaces : (root.workspaces?.packages ?? []);
	const packages = new Map<string, string>();
	for (const pattern of patterns) {
		const parent = pattern.endsWith('/*') ? pattern.slice(0, -2) : undefined;
		if (parent !== undefined && !existsSync(join(REPOSITORY_ROOT, parent))) continue;
		const directories = parent
			? readdirSync(join(REPOSITORY_ROOT, parent), { withFileTypes: true })
					.filter((entry) => entry.isDirectory())
					.map((entry) => `${parent}/${entry.name}`)
			: [pattern];
		for (const directory of directories) {
			const manifestPath = join(REPOSITORY_ROOT, directory, 'package.json');
			if (existsSync(manifestPath)) packages.set(readJson<Manifest>(`${directory}/package.json`).name, directory);
		}
	}
	return packages;
}

function sourceFiles(directory: string): string[] {
	return readdirSync(directory).flatMap((entry) => {
		const path = join(directory, entry);
		if (statSync(path).isDirectory()) return sourceFiles(path);
		return /\.ts$/.test(entry) ? [path] : [];
	});
}

describe('ChatGPT app Docker image', () => {
	const stages = dockerStages(dockerfile);
	const rootManifest = readJson<Manifest>('package.json');
	const chatgptManifest = readJson<Manifest>('apps/chatgpt/package.json');
	const workspaces = workspacePackages(rootManifest);

	it('has a build stage and a production stage', () => {
		expect(stages.map((stage) => stage.name)).toEqual(['builder', 'production']);
	});

	it('only COPYs paths that exist in the repository', () => {
		const sources = stages.flatMap((stage) => stage.instructions.flatMap(copySources));

		expect(sources.length).toBeGreaterThan(0);
		expect(sources.filter((source) => !existsSync(join(REPOSITORY_ROOT, source)))).toEqual([]);
	});

	it.each(['builder', 'production'])(
		'copies every workspace manifest the %s stage install resolves before running it',
		(stageName) => {
			const stage = stages.find((candidate) => candidate.name === stageName);
			const installIndex = stage?.instructions.findIndex((instruction) =>
				/^RUN\s+yarn install\b/.test(instruction)
			);
			expect(installIndex).toBeGreaterThan(-1);

			// Yarn resolves the root manifest's own dependencies (dev ones too, even with --production) and
			// every workspace it can see, transitively.
			const required = new Set<string>([chatgptManifest.name]);
			const pending = [
				...workspaceDependencies(rootManifest, workspaces),
				...workspaceDependencies(chatgptManifest, workspaces)
			];
			while (pending.length > 0) {
				const name = pending.pop() as string;
				if (required.has(name)) continue;
				required.add(name);
				pending.push(
					...workspaceDependencies(readJson<Manifest>(`${workspaces.get(name)}/package.json`), workspaces)
				);
			}

			const copiedManifests = new Set(stage?.instructions.slice(0, installIndex).flatMap(copySources) ?? []);
			const missing = [...required]
				.map((name) => `${workspaces.get(name)}/package.json`)
				.filter((manifest) => !copiedManifests.has(manifest));

			expect(missing).toEqual([]);
		}
	);

	it('copies the tsconfig base the build extends into the build stage', () => {
		const tsconfig = JSON.parse(read('apps/chatgpt/tsconfig.json')) as { extends?: string };
		const extendedPackage = /^(@[^/]+\/[^/]+)\//.exec(tsconfig.extends ?? '')?.[1];
		const builder = stages.find((stage) => stage.name === 'builder');

		expect(extendedPackage).toBeDefined();
		expect(builder?.instructions.flatMap(copySources)).toContain(workspaces.get(extendedPackage as string));
	});

	it('uses a Node base image that satisfies the root engines constraint', () => {
		const minimumMajor = Number(/(\d+)/.exec(rootManifest.engines?.node ?? '')?.[1]);
		const nodeVersionArg = /^ARG\s+NODE_VERSION=(\S+)/m.exec(dockerfile)?.[1];

		expect(minimumMajor).toBeGreaterThan(0);
		for (const stage of stages) {
			const image = stage.from.replace('${NODE_VERSION}', nodeVersionArg ?? '');
			const major = Number(/^node:(\d+)/.exec(image)?.[1]);
			expect({ stage: stage.name, satisfies: major >= minimumMajor }).toEqual({
				stage: stage.name,
				satisfies: true
			});
		}
	});

	it('declares no deployment-specific build arguments', () => {
		const args = Array.from(dockerfile.matchAll(/^ARG\s+([A-Za-z0-9_]+)/gm), (match) => match[1]);

		expect(args).toEqual(['NODE_VERSION']);
	});

	it.each(['dev', 'stage', 'prod'])('does not bake deployment values in the %s publish workflow', (environment) => {
		const workflow = parseYaml(read(`.github/workflows/chatgpt.docker-build-publish-${environment}.yml`)) as {
			jobs: Record<string, { steps: { uses?: string; with?: Record<string, string> }[] }>;
		};
		const build = Object.values(workflow.jobs)
			.flatMap((job) => job.steps)
			.find((step) => step.uses?.startsWith('docker/build-push-action@'));
		const buildArgNames = String(build?.with?.['build-args'] ?? '')
			.split('\n')
			.map((line) => line.trim().split('=')[0])
			.filter(Boolean);

		expect(build?.with?.file).toBe('./apps/chatgpt/Dockerfile');
		expect(buildArgNames.filter((name) => name !== 'NODE_ENV')).toEqual([]);
	});

	it("keeps Ever's hosts out of the app source except as runtime-overridable defaults", () => {
		const everHostLiteral = /(['"`])[^'"`\n]*(?:ever\.team|gauzy\.co)[^'"`\n]*\1/;
		const offenders = sourceFiles(join(CHATGPT_ROOT, 'src'))
			.map((path) => relative(CHATGPT_ROOT, path).split(sep).join('/'))
			.filter((path) => path !== 'src/config/environment.ts')
			.filter((path) => everHostLiteral.test(readFileSync(join(CHATGPT_ROOT, path), 'utf8')));

		expect(offenders).toEqual([]);

		const environment = read('apps/chatgpt/src/config/environment.ts');
		expect(environment).toMatch(/process\.env\.CHATGPT_WIDGET_DOMAIN|env\.CHATGPT_WIDGET_DOMAIN/);
		expect(environment).toMatch(/env\.CHATGPT_WIDGET_CSP/);
		expect(environment).toMatch(/process\.env\.MCP_SERVER_URL \|\|/);
		expect(environment).toMatch(/process\.env\.OAUTH_SERVER_URL \|\|/);
	});
});
