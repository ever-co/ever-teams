import type { TOrganizationProject } from '@/core/types/schemas/organization/organization-project.schema';

type BillableProject = Pick<TOrganizationProject, 'billable'>;

/**
 * Whether time on the project starts as billable. A project that never chose (the API holds null) starts its time
 * as not billable: it is what the timer and the Add time dialog apply.
 */
export function isBillableByDefault(project: BillableProject | null | undefined): boolean {
	return project?.billable === true;
}

/**
 * The part of a project save that names the billable setting. Without a choice the field is left out: the API
 * gives the saved time of a task the setting of the project the task moves to, when that project has one, so a
 * value nobody chose would later change that time.
 */
export function billableFieldOf(billable: boolean | null): { billable?: boolean } {
	if (billable === null) {
		return {};
	}
	return { billable };
}
