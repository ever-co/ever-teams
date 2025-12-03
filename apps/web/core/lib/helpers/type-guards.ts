/**
 * Type Guards for differentiating between Projects and Teams
 *
 * In Ever Teams, Projects and Teams share some common properties (name, color, imageUrl, tags)
 * but have distinct properties that allow us to differentiate between them.
 *
 */

import { TOrganizationProject, TOrganizationTeam } from '@/core/types/schemas';

/**
 * Type guard to check if an entity is a Project
 *
 * Projects have exclusive properties that do NOT exist in Teams:
 * - billing, budget, currency, budgetType (financial properties)
 * - startDate, endDate (date range)
 * - status (open, in_progress, closed, completed)
 *
 * We use `'property' in entity` to check for property EXISTENCE (not value).
 * Using AND (&&) ensures ALL properties must be present - a real Project has all of them
 * in its schema, while a Team has NONE of them.
 *
 *
 * @param entity - The entity to check (Project or Team)
 * @returns true if entity is a Project
 *
 * ```
 */
export function isProject(entity: TOrganizationProject | TOrganizationTeam): entity is TOrganizationProject {
	// Check for Project-exclusive properties (per guide section 2.2)
	// ALL these properties must exist - a real Project has all of them, a Team has none
	return (
		'status' in entity &&
		'billing' in entity &&
		'billingFlat' in entity &&
		'budget' in entity &&
		'currency' in entity &&
		'budgetType' in entity &&
		'projectUrl' in entity &&
		'status' in entity &&
		'teams' in entity
	);
}

/**
 * Type guard to check if an entity is a Team
 *
 * Teams have exclusive properties like:
 * - emoji (team emoji)
 * - teamSize (size category)
 * - shareProfileView, requirePlanToTrack (team settings)
 * - prefix, logo (team branding)
 *
 * @param entity - The entity to check (Project or Team)
 * @returns true if entity is a Team
 *
 * @example
 * ```typescript
 * if (isTeam(entity)) {
 *   console.log('Emoji:', entity.emoji);
 *   console.log('Team Size:', entity.teamSize);
 * }
 * ```
 */
export function isTeam(entity: TOrganizationProject | TOrganizationTeam): entity is TOrganizationTeam {
	return (
		'emoji' in entity &&
		'teamSize' in entity &&
		'shareProfileView' in entity &&
		'requirePlanToTrack' in entity &&
		'prefix' in entity &&
		'logo' in entity &&
		'projects' in entity
	);
}

/**
 * Type guard based on the structure of members
 *
 * Team members have `organizationTeamId`, while Project members have `organizationProjectId`
 *
 * @param entity - The entity to check
 * @returns true if entity is a Team (based on member structure)
 */
export function isTeamByMembers(entity: TOrganizationProject | TOrganizationTeam): entity is TOrganizationTeam {
	if (!entity.members || entity.members.length === 0) return false;
	const firstMember = entity.members[0];
	return 'organizationTeamId' in firstMember;
}

/**
 * Checks if a project is valid for display
 *
 * A valid project must:
 * 1. Be a real Project (not a Team or other entity) - verified by isProject()
 * 2. Have a non-empty name
 * 3. Match the archived filter:
 *    - showArchived=false → show only NON-archived projects
 *    - showArchived=true → show only ARCHIVED projects
 *
 * NOTE: `isActive` and `status` are NOT used for filtering.
 * Only `isArchived` determines visibility based on the filter toggle.
 *
 * IMPORTANT: isActive alone is NOT sufficient to identify a Project.
 * Teams can also have isActive=true. We MUST use isProject() type guard
 * to properly distinguish Projects from Teams at runtime.
 *
 * @param project - The project to validate
 * @param showArchived - If true, show ONLY archived projects. If false, show ONLY non-archived.
 * @returns true if project is valid for display
 */
export function isValidProjectForDisplay(
	project: TOrganizationProject | TOrganizationTeam | null | undefined,
	showArchived = false
): project is TOrganizationProject {
	if (!project) return false;

	// CRITICAL: First verify this is actually a Project, not a Team
	// This prevents Teams or other entities from appearing in project lists
	if (!isProject(project) || isTeam(project)) return false;

	const hasValidName = Boolean(project.name && project.name.trim().length > 0);
	const isArchived = project.isArchived === true;

	// showArchived=true → show ONLY archived projects
	// showArchived=false → show ONLY non-archived projects
	if (showArchived) {
		return hasValidName && isArchived;
	}

	return hasValidName && !isArchived;
}

/**
 * Type for entities that have a teams property
 * This allows the helpers to work with both TOrganizationProject and ProjectViewDataType
 */
type WithTeams = {
	teams?: Array<{ id: string }> | null;
};

/**
 * Checks if a project belongs to a specific team
 *
 * @param project - The project or any entity with teams property
 * @param teamId - The team ID to check against
 * @returns true if project belongs to the team
 */
export function projectBelongsToTeam(project: WithTeams, teamId: string): boolean {
	if (!project.teams || project.teams.length === 0) return false;
	return project.teams.some((team) => team.id === teamId);
}

/**
 * Checks if a project has no teams assigned
 *
 * @param project - The project or any entity with teams property
 * @returns true if project has no teams
 */
export function projectHasNoTeams(project: WithTeams): boolean {
	return !project.teams || project.teams.length === 0;
}
