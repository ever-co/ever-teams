import type { TOrganizationProject } from '@/core/types/schemas/organization/organization-project.schema';

/** Who sees a project: everyone in the organization, or only its members and managers (CORE-08, ever-gauzy#11465). */
export type ProjectVisibility = 'everyone' | 'private';

type VisibleProject = Pick<TOrganizationProject, 'public'>;

/**
 * Whether a project is kept to its members and managers. Only a project stated private (`public` false) is: one that
 * never chose (the API holds null) is seen by everyone, as the API reads it.
 */
export function isPrivateProject(project: VisibleProject | null | undefined): boolean {
	return project?.public === false;
}

/** A stored project's choice as the form shows it: null when it never chose, which reads as Everyone. */
export function visibilityOfProject(project: VisibleProject | null | undefined): ProjectVisibility | null {
	if (project?.public === false) {
		return 'private';
	}
	if (project?.public === true) {
		return 'everyone';
	}
	return null;
}

/** What the form shows for a draft's choice: Everyone until someone picks Members and managers only. */
export function shownVisibilityOf(visibility: ProjectVisibility | null): ProjectVisibility {
	return visibility ?? 'everyone';
}

/**
 * The part of a project save that names who sees it. Without a choice the field is left out, so a project that never
 * chose keeps the value it has (other apps read an unset value their own way).
 */
export function visibilityFieldOf(visibility: ProjectVisibility | null): { public?: boolean } {
	if (visibility === null) {
		return {};
	}
	return { public: visibility === 'everyone' };
}

/**
 * The key every project the API keeps from the caller is grouped under (CORE-27, ever-co/ever-gauzy#12031): a report
 * shows all of that time on one "Private projects" row, beside "No project".
 */
export const PRIVATE_PROJECTS_KEY = 'private-projects';

/** A project as a record names it: the API answers one the caller may not see as its id and `projectHidden`. */
type NamedProject = { projectHidden?: boolean | null };

/**
 * Whether the API keeps a record's project from the caller: a private project they are not on, in a workspace that
 * keeps private projects private. An API without the marker never answers it, and every project reads as before.
 */
export function isHiddenProject(project: NamedProject | null | undefined): boolean {
	return project?.projectHidden === true;
}

/** How a hidden project is named: one record's project, and the group of all of them in a report or a filter. */
export interface HiddenProjectLabels {
	one: string;
	many: string;
}
