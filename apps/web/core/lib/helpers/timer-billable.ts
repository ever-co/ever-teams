import type { TTimerBillableChoices } from '@/core/stores/timer/timer-billable';
import type { TOrganizationProject } from '@/core/types/schemas/organization/organization-project.schema';
import type { TTask } from '@/core/types/schemas/task/task.schema';

type TBillableTask = Pick<TTask, 'id' | 'projectId'>;

/** The value picked by hand for the task, or undefined when the task starts from its project's. */
export function pickedBillableOf(task: TBillableTask, choices: TTimerBillableChoices): boolean | undefined {
	const picked = choices[task.id];
	if (typeof picked === 'boolean') {
		return picked;
	}
	return undefined;
}

export function findTaskProject(
	task: TBillableTask,
	projects: TOrganizationProject[]
): TOrganizationProject | undefined {
	if (!task.projectId) {
		return undefined;
	}
	return projects.find((project) => project.id === task.projectId);
}

export function timerBillableOf(
	task: TBillableTask | null | undefined,
	projects: TOrganizationProject[],
	choices: TTimerBillableChoices
): boolean {
	if (!task) {
		return false;
	}
	const picked = pickedBillableOf(task, choices);
	if (picked !== undefined) {
		return picked;
	}
	const project = findTaskProject(task, projects);
	return project?.billable === true;
}
