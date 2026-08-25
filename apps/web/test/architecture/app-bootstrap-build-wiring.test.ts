import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';

const REPOSITORY_ROOT = resolve(__dirname, '../../../..');
const WORKFLOWS = [
	{ branch: 'develop', environment: 'dev', file: 'docker-build-publish-dev.yml', imageSuffix: '-dev' },
	{ branch: 'stage', environment: 'stage', file: 'docker-build-publish-stage.yml', imageSuffix: '-stage' },
	{ branch: 'main', environment: 'prod', file: 'docker-build-publish-prod.yml', imageSuffix: '' }
] as const;

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

function parseWorkflow(file: string): Workflow {
	return parseYaml(read(`.github/workflows/${file}`)) as Workflow;
}

describe('application bootstrap build wiring', () => {
	it.each(WORKFLOWS)(
		'wires safe defaults and immutable tags through the $environment workflow',
		({ branch, environment, file, imageSuffix }) => {
			const workflow = parseWorkflow(file);
			const job = workflow.jobs['ever-teams-webapp'];
			const build = job.steps.find((step) => step.uses === 'docker/build-push-action@v7');
			const validation = job.steps.find((step) => step.name === 'Validate NEXT_PUBLIC_GAUZY_API_SERVER_URL');
			const allRunScripts = job.steps.map((step) => step.run ?? '').join('\n');
			const tags = String(build?.with?.tags ?? '');

			expect(workflow.on.push.branches).toEqual([branch]);
			expect(job.environment).toBe(environment);
			expect(Boolean(workflow.on.workflow_dispatch)).toBe(environment === 'dev');
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

	it('isolates Jest and Cypress TypeScript globals in separate projects', () => {
		const web = JSON.parse(read('apps/web/tsconfig.json')) as {
			compilerOptions: { types: string[] };
			exclude: string[];
		};
		const cypress = JSON.parse(read('apps/web/cypress/tsconfig.json')) as {
			compilerOptions: { types: string[] };
			include: string[];
		};
		const workflow = parseYaml(read('.github/workflows/web.before-merge.yml')) as {
			jobs: { deploy: { steps: WorkflowStep[] } };
		};
		const cypressTypecheck = workflow.jobs.deploy.steps.find((step) => step.name === 'Typecheck Cypress');

		expect(web.compilerOptions.types).toEqual(['node', 'jest']);
		expect(web.exclude).toEqual(expect.arrayContaining(['node_modules', 'cypress', 'cypress.config.ts']));
		expect(cypress.compilerOptions.types).toEqual(['cypress', 'node']);
		expect(cypress.include).toEqual(expect.arrayContaining(['../cypress.config.ts', './**/*.ts']));
		expect(cypressTypecheck?.run).toBe('yarn workspace @ever-teams/web tsc --noEmit -p cypress/tsconfig.json');
	});

	it('installs the trusted Cypress binary directly after the ignore-scripts package install', () => {
		const workflow = parseYaml(read('.github/workflows/web.before-merge.yml')) as {
			jobs: { 'browser-parity': { steps: WorkflowStep[] } };
		};
		const steps = workflow.jobs['browser-parity'].steps;
		const packagesIndex = steps.findIndex((step) => step.name === 'Install Packages');
		const cypressIndex = steps.findIndex((step) => step.name === 'Install trusted Cypress binary');
		const cypressInstall = steps[cypressIndex];

		expect(packagesIndex).toBeGreaterThanOrEqual(0);
		expect(steps[packagesIndex]?.run).toContain('--ignore-scripts');
		expect(cypressIndex).toBeGreaterThan(packagesIndex);
		expect(cypressInstall?.run).toBe('node ./node_modules/cypress/bin/cypress install');
		expect(cypressInstall?.run).not.toMatch(/\b(?:yarn|npm)\b/);
	});

	it('verifies the changed web application without inheriting unrelated monorepo baseline failures', () => {
		const workflow = parseYaml(read('.github/workflows/web.before-merge.yml')) as {
			jobs: { deploy: { steps: WorkflowStep[] } };
		};
		const test = workflow.jobs.deploy.steps.find((step) => step.name === 'Test Web');
		const lint = workflow.jobs.deploy.steps.find((step) => step.name === 'Lint Web');
		const build = workflow.jobs.deploy.steps.find((step) => step.name === 'Build Web');
		const packageJson = JSON.parse(read('package.json')) as { scripts: Record<string, string> };

		expect(test?.run).toBe('yarn test:web --runInBand');
		expect(lint?.run).toBe('yarn nx run web:lint');
		expect(build?.run).toContain('yarn build:web');
		expect(workflow.jobs.deploy.steps.some((step) => step.run?.includes('nx affected'))).toBe(false);
		expect(packageJson.scripts['preservation:web']).toContain('--base=origin/develop');
	});
});
