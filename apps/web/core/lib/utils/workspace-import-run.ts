import { nameKeyOf, type ExistingRecord, type PlannedProject, type WorkspaceImportPlan } from './workspace-import-plan';

export type WorkspaceStep = 'clients' | 'projects' | 'labels';

export const WORKSPACE_STEPS: ReadonlyArray<WorkspaceStep> = ['clients', 'projects', 'labels'];

export interface WorkspaceStepTally {
	created: number;
	reused: number;
	failed: number;
	/** Planned but not created: the person's role cannot add labels. */
	skipped: number;
}

export type WorkspaceTallies = Readonly<Record<WorkspaceStep, WorkspaceStepTally>>;

export interface WorkspaceCreators {
	createClient: (name: string) => Promise<ExistingRecord>;
	createProject: (project: PlannedProject, clientId: string | null) => Promise<ExistingRecord>;
	createLabel: (name: string) => Promise<ExistingRecord>;
	/** Whether the role may add labels: when it may not, the labels are listed as not created and nothing stops. */
	canCreateLabels: boolean;
	/** False once the page was left: what is not sent yet stays unsent. */
	isRunGoing: () => boolean;
	onProgress?: (tallies: WorkspaceTallies) => void;
}

export interface WorkspaceCreation {
	tallies: WorkspaceTallies;
	/** The step that failed and the name it failed on: nothing after it was sent, and the entries are not saved. */
	failure: { step: WorkspaceStep; name: string; error: unknown } | null;
	/** Ended because the page was left. */
	isInterrupted: boolean;
	/** Every project the entries may be filed under, reused or created, by name. */
	projects: ExistingRecord[];
}

function clientIdOf(project: PlannedProject, clientIds: ReadonlyMap<string, string>): string | null {
	if (!project.clientName) {
		return null;
	}
	return clientIds.get(nameKeyOf(project.clientName)) ?? null;
}

function emptyTally(reused: number): WorkspaceStepTally {
	return { created: 0, reused, failed: 0, skipped: 0 };
}

function snapshotOf(tallies: WorkspaceTallies): WorkspaceTallies {
	return { clients: { ...tallies.clients }, projects: { ...tallies.projects }, labels: { ...tallies.labels } };
}

/**
 * Creates what the plan says, in order: clients, then projects with their client, then labels. A failure stops the
 * run where it is, so that no entry is saved without the project it names; what was created before it is kept and
 * counted, and running the same files again reuses it.
 */
export async function runWorkspaceCreation(
	plan: WorkspaceImportPlan,
	creators: WorkspaceCreators
): Promise<WorkspaceCreation> {
	const tallies: Record<WorkspaceStep, WorkspaceStepTally> = {
		clients: emptyTally(plan.clients.reuse.length),
		projects: emptyTally(plan.projects.reuse.length),
		labels: emptyTally(plan.labels.reuse.length)
	};
	const report = () => creators.onProgress?.(snapshotOf(tallies));
	const clientIds = new Map(plan.clients.reuse.map((client) => [nameKeyOf(client.name), client.id]));
	const projects: ExistingRecord[] = [...plan.projects.reuse];
	const result = (failure: WorkspaceCreation['failure'], isInterrupted = false): WorkspaceCreation => ({
		tallies: snapshotOf(tallies),
		failure,
		isInterrupted,
		projects
	});

	for (const name of plan.clients.create) {
		if (!creators.isRunGoing()) {
			return result(null, true);
		}
		try {
			const client = await creators.createClient(name);
			clientIds.set(nameKeyOf(name), client.id);
			tallies.clients.created += 1;
			report();
		} catch (error) {
			tallies.clients.failed += 1;
			report();
			return result({ step: 'clients', name, error });
		}
	}

	for (const project of plan.projects.create) {
		if (!creators.isRunGoing()) {
			return result(null, true);
		}
		const clientId = clientIdOf(project, clientIds);
		try {
			const created = await creators.createProject(project, clientId);
			projects.push({ id: created.id, name: project.name });
			tallies.projects.created += 1;
			report();
		} catch (error) {
			tallies.projects.failed += 1;
			report();
			return result({ step: 'projects', name: project.name, error });
		}
	}

	if (!creators.canCreateLabels) {
		tallies.labels.skipped = plan.labels.create.length;
		report();
		return result(null);
	}
	for (const name of plan.labels.create) {
		if (!creators.isRunGoing()) {
			return result(null, true);
		}
		try {
			await creators.createLabel(name);
			tallies.labels.created += 1;
			report();
		} catch (error) {
			tallies.labels.failed += 1;
			report();
			return result({ step: 'labels', name, error });
		}
	}
	return result(null);
}
