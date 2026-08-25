import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse as parseDotenv } from 'dotenv';
import { parse as parseYaml } from 'yaml';

const REPOSITORY_ROOT = resolve(__dirname, '../../../..');
const FLAGS = ['NEXT_PUBLIC_FAST_APP_BOOTSTRAP', 'NEXT_PUBLIC_PRELOAD_YEAR_TIME_LOGS'] as const;
const WORKFLOWS = [
	{ branch: 'develop', environment: 'dev', file: 'docker-build-publish-dev.yml', imageSuffix: '-dev' },
	{ branch: 'stage', environment: 'stage', file: 'docker-build-publish-stage.yml', imageSuffix: '-stage' },
	{ branch: 'main', environment: 'prod', file: 'docker-build-publish-prod.yml', imageSuffix: '' }
] as const;

type ComposeConfig = {
	services: Record<
		string,
		{
			build?: { args?: Record<string, string> };
			environment?: Record<string, string>;
		}
	>;
};

type WorkflowStep = {
	env?: Record<string, string>;
	name?: string;
	run?: string;
	uses?: string;
	with?: Record<string, string | boolean>;
};

type Workflow = {
	jobs: Record<string, { environment: string; steps: WorkflowStep[] }>;
	on: { push: { branches: string[] }; workflow_dispatch?: Record<string, never> };
};

function read(relativePath: string): string {
	return readFileSync(resolve(REPOSITORY_ROOT, relativePath), 'utf8');
}

function renderCompose(relativePath: string, overrides: Record<string, string> = {}): ComposeConfig {
	const env = { ...process.env };
	for (const flag of FLAGS) delete env[flag];
	Object.assign(env, overrides);

	return JSON.parse(
		execFileSync('docker', ['compose', '-f', relativePath, 'config', '--format', 'json'], {
			cwd: REPOSITORY_ROOT,
			encoding: 'utf8',
			env
		})
	) as ComposeConfig;
}

function parseWorkflow(file: string): Workflow {
	return parseYaml(read(`.github/workflows/${file}`)) as Workflow;
}

describe('fast bootstrap build wiring', () => {
	it('defaults both public flags off and lets compose callers override them', () => {
		const sample = parseDotenv(read('apps/web/.env.sample'));
		const defaultBuild = renderCompose('docker-compose.build.yml');
		const defaultDev = renderCompose('docker-compose.dev.yml');
		const enabledBuild = renderCompose('docker-compose.build.yml', {
			NEXT_PUBLIC_FAST_APP_BOOTSTRAP: 'true',
			NEXT_PUBLIC_PRELOAD_YEAR_TIME_LOGS: 'true'
		});
		const enabledDev = renderCompose('docker-compose.dev.yml', {
			NEXT_PUBLIC_FAST_APP_BOOTSTRAP: 'true',
			NEXT_PUBLIC_PRELOAD_YEAR_TIME_LOGS: 'true'
		});

		for (const flag of FLAGS) {
			expect(sample[flag]).toBe('false');
			expect(defaultBuild.services.webapp.build?.args?.[flag]).toBe('false');
			expect(defaultDev.services['webapp-dev'].environment?.[flag]).toBe('false');
			expect(enabledBuild.services.webapp.build?.args?.[flag]).toBe('true');
			expect(enabledDev.services['webapp-dev'].environment?.[flag]).toBe('true');
		}
	});

	it('makes both flags available in the Docker build stage before the web bundle is compiled', () => {
		const dockerfile = read('.deploy/web/Dockerfile');
		const buildStageStart = dockerfile.indexOf('FROM base AS build');
		const buildCommand = dockerfile.indexOf('RUN yarn run build:web', buildStageStart);
		const buildStage = dockerfile.slice(buildStageStart, buildCommand);

		expect(buildStageStart).toBeGreaterThanOrEqual(0);
		expect(buildCommand).toBeGreaterThan(buildStageStart);
		for (const flag of FLAGS) {
			expect(buildStage).toContain(`ARG ${flag}=false`);
			expect(buildStage).toContain(`ENV ${flag}=\${${flag}:-false}`);
		}
	});

	it.each(WORKFLOWS)(
		'wires safe defaults and immutable tags through the $environment workflow',
		({ branch, environment, file, imageSuffix }) => {
			const workflow = parseWorkflow(file);
			const job = workflow.jobs['ever-teams-webapp'];
			const build = job.steps.find((step) => step.uses === 'docker/build-push-action@v7');
			const validation = job.steps.find((step) => step.name === 'Validate NEXT_PUBLIC_GAUZY_API_SERVER_URL');
			const allRunScripts = job.steps.map((step) => step.run ?? '').join('\n');
			const tags = String(build?.with?.tags ?? '');
			const buildArguments = String(build?.with?.['build-args'] ?? '');

			expect(workflow.on.push.branches).toEqual([branch]);
			expect(job.environment).toBe(environment);
			expect(Boolean(workflow.on.workflow_dispatch)).toBe(environment === 'dev');
			for (const flag of FLAGS) {
				expect(buildArguments).toContain(`${flag}=\${{ vars.${flag} || 'false' }}`);
			}

			for (const registry of ['ghcr.io/ever-co/', 'everco/', 'registry.digitalocean.com/ever/']) {
				const image = `${registry}ever-teams-webapp${imageSuffix}`;
				expect(tags).toContain(`${image}:latest`);
				expect(tags).toContain(`${image}:sha-\${{ github.sha }}`);
				expect(allRunScripts).toContain(`docker push ${image}:latest`);
				expect(allRunScripts).toContain(`docker push ${image}:sha-\${{ github.sha }}`);
			}

			expect(validation?.env?.NEXT_PUBLIC_GAUZY_API_SERVER_URL).toBe(
				'${{ secrets.NEXT_PUBLIC_GAUZY_API_SERVER_URL }}'
			);
			expect(validation?.run).toContain('[ -z "$NEXT_PUBLIC_GAUZY_API_SERVER_URL" ]');
			expect(allRunScripts).not.toContain('${{ secrets.NEXT_PUBLIC_GAUZY_API_SERVER_URL }}');
			expect(allRunScripts).not.toMatch(/echo[^\n]*\$\{?NEXT_PUBLIC_GAUZY_API_SERVER_URL/);
		}
	);

	it('includes both flags in Turbo and Nx build cache inputs', () => {
		const turbo = JSON.parse(read('turbo.json')) as { globalEnv: string[] };
		const nx = JSON.parse(read('nx.json')) as { namedInputs: { sharedGlobals: Array<string | { env?: string }> } };
		const nxEnvironmentInputs = nx.namedInputs.sharedGlobals
			.filter((input): input is { env?: string } => typeof input === 'object')
			.map((input) => input.env);

		for (const flag of FLAGS) {
			expect(turbo.globalEnv).toContain(flag);
			expect(nxEnvironmentInputs).toContain(flag);
		}
	});

	it('isolates Jest and Cypress TypeScript globals in separate projects', () => {
		const web = JSON.parse(read('apps/web/tsconfig.json')) as {
			compilerOptions: { types: string[] };
			exclude: string[];
		};
		const cypress = JSON.parse(read('apps/web/cypress/tsconfig.json')) as {
			compilerOptions: { types: string[] };
			include: string[];
		};

		expect(web.compilerOptions.types).toEqual(['node', 'jest']);
		expect(web.exclude).toEqual(expect.arrayContaining(['node_modules', 'cypress', 'cypress.config.ts']));
		expect(cypress.compilerOptions.types).toEqual(['cypress', 'node']);
		expect(cypress.include).toEqual(expect.arrayContaining(['../cypress.config.ts', './**/*.ts']));
	});

	it('uses the pull-request base for affected projects while preserving the reviewed surface baseline', () => {
		const workflow = parseYaml(read('.github/workflows/web.before-merge.yml')) as {
			jobs: { deploy: { steps: WorkflowStep[] } };
		};
		const audit = workflow.jobs.deploy.steps.find((step) => step.name === 'Audit affected projects');
		const verify = workflow.jobs.deploy.steps.find((step) => step.name === 'Verify affected projects');
		const packageJson = JSON.parse(read('package.json')) as { scripts: Record<string, string> };
		const pullRequestBase = '${{ github.event.pull_request.base.sha }}';

		expect(audit?.run).toBe(`yarn nx show projects --affected --base=${pullRequestBase} --head=HEAD`);
		expect(verify?.run).toBe(`yarn nx affected -t lint,test,build --base=${pullRequestBase} --head=HEAD`);
		expect(`${audit?.run}\n${verify?.run}`).not.toContain('--base=7a75a102464779008f4b6e9fa61bb69e2cde8621');
		expect(packageJson.scripts['preservation:web']).toContain('--base=7a75a102464779008f4b6e9fa61bb69e2cde8621');
	});
});
