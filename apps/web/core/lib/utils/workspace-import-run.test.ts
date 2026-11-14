import type { WorkspaceImportPlan } from './workspace-import-plan';
import { runWorkspaceCreation, type WorkspaceCreators, type WorkspaceTallies } from './workspace-import-run';

const PLAN: WorkspaceImportPlan = {
	clients: { create: ['Acme', 'Globex'], reuse: [{ id: 'client-initech', name: 'Initech' }] },
	projects: {
		create: [
			{ name: 'Website', clientName: 'acme', color: '#3366FF', billable: true },
			{ name: 'Training', clientName: 'Initech', color: null, billable: null },
			{ name: 'Internal', clientName: null, color: null, billable: false }
		],
		reuse: [{ id: 'project-audit', name: 'Audit' }]
	},
	labels: { create: ['Design'], reuse: [] },
	entriesByMember: [],
	unknownEmails: [],
	taggedEntryCount: 0
};

function creatorsWith(patch: Partial<WorkspaceCreators> = {}) {
	const calls: string[] = [];
	const creators: WorkspaceCreators = {
		createClient: jest.fn(async (name: string) => {
			calls.push(`client ${name}`);
			return { id: `client-${name.toLowerCase()}`, name };
		}),
		createProject: jest.fn(async (project, clientId) => {
			calls.push(`project ${project.name} -> ${clientId}`);
			return { id: `project-${project.name.toLowerCase()}`, name: project.name };
		}),
		createLabel: jest.fn(async (name: string) => {
			calls.push(`label ${name}`);
			return { id: `label-${name.toLowerCase()}`, name };
		}),
		canCreateLabels: true,
		isRunGoing: () => true,
		...patch
	};
	return { creators, calls };
}

describe('runWorkspaceCreation', () => {
	it('creates clients, then projects with their client, then labels, and counts each step', async () => {
		const { creators, calls } = creatorsWith();

		const creation = await runWorkspaceCreation(PLAN, creators);

		expect(calls).toEqual([
			'client Acme',
			'client Globex',
			'project Website -> client-acme',
			'project Training -> client-initech',
			'project Internal -> null',
			'label Design'
		]);
		expect(creation.tallies).toEqual({
			clients: { created: 2, reused: 1, failed: 0, skipped: 0 },
			projects: { created: 3, reused: 1, failed: 0, skipped: 0 },
			labels: { created: 1, reused: 0, failed: 0, skipped: 0 }
		});
		expect(creation.failure).toBeNull();
		expect(creation.projects.map((project) => project.id)).toEqual([
			'project-audit',
			'project-website',
			'project-training',
			'project-internal'
		]);
	});

	it('stops at the first failure and keeps what it created before', async () => {
		const refusal = new Error('403');
		const { creators, calls } = creatorsWith({
			createProject: jest.fn(async (project) => {
				calls.push(`project ${project.name}`);
				if (project.name === 'Training') {
					throw refusal;
				}
				return { id: `project-${project.name.toLowerCase()}`, name: project.name };
			})
		});

		const creation = await runWorkspaceCreation(PLAN, creators);

		expect(calls).toEqual(['client Acme', 'client Globex', 'project Website', 'project Training']);
		expect(creation.failure).toEqual({ step: 'projects', name: 'Training', error: refusal });
		expect(creation.tallies.projects).toEqual({ created: 1, reused: 1, failed: 1, skipped: 0 });
		expect(creation.tallies.labels.created).toBe(0);
	});

	it('lists the labels as not created when the role cannot add them, without stopping', async () => {
		const { creators, calls } = creatorsWith({ canCreateLabels: false });

		const creation = await runWorkspaceCreation(PLAN, creators);

		expect(calls).not.toContain('label Design');
		expect(creation.tallies.labels).toEqual({ created: 0, reused: 0, failed: 0, skipped: 1 });
		expect(creation.failure).toBeNull();
	});

	it('sends nothing more once the page is left', async () => {
		let isGoing = true;
		const { creators, calls } = creatorsWith({
			isRunGoing: () => isGoing,
			createClient: jest.fn(async (name: string) => {
				calls.push(`client ${name}`);
				isGoing = false;
				return { id: 'client-1', name };
			})
		});

		const creation = await runWorkspaceCreation(PLAN, creators);

		expect(calls).toEqual(['client Acme']);
		expect(creation.isInterrupted).toBe(true);
	});

	it('reports the counts as it goes', async () => {
		const progress: number[] = [];
		const { creators } = creatorsWith({ onProgress: (tallies) => progress.push(tallies.clients.created) });

		await runWorkspaceCreation(PLAN, creators);

		expect(progress.slice(0, 2)).toEqual([1, 2]);
	});

	it('reports counts that the next steps leave as they were', async () => {
		const reports: WorkspaceTallies[] = [];
		const { creators } = creatorsWith({ onProgress: (tallies) => reports.push(tallies) });

		const creation = await runWorkspaceCreation(PLAN, creators);

		expect(reports[0].clients.created).toBe(1);
		expect(reports[0].projects.created).toBe(0);
		expect(creation.tallies).not.toBe(reports.at(-1));
	});
});
