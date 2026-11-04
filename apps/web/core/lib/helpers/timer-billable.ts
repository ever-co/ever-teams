import type { TTimerBillableChoice } from '@/core/stores/timer/timer-billable';
import type { TOrganizationProject } from '@/core/types/schemas/organization/organization-project.schema';
import type { TTask } from '@/core/types/schemas/task/task.schema';

type TBillableTask = Pick<TTask, 'id' | 'projectId'>;

export function isProjectBillable(projectId: string | null | undefined, projects: TOrganizationProject[]): boolean {
	if (!projectId) {
		return false;
	}
	const project = projects.find((item) => item.id === projectId);
	return project?.billable === true;
}

export function timerBillableOf(
	task: TBillableTask | null | undefined,
	projects: TOrganizationProject[],
	choice: TTimerBillableChoice | null
): boolean {
	if (!task) {
		return false;
	}
	if (choice && choice.taskId === task.id) {
		return choice.isBillable;
	}
	return isProjectBillable(task.projectId, projects);
}

export function choiceKeptForTask(choice: TTimerBillableChoice | null, taskId: string): TTimerBillableChoice | null {
	if (choice?.taskId === taskId) {
		return choice;
	}
	return null;
}
