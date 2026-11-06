/**
 * The tracking requirements an organization created from this app starts with, so its time is always filed under a
 * team and a project. Gauzy leaves them off for every other organization; an admin turns them off in the team
 * settings.
 */
export const NEW_ORGANIZATION_TRACKING_REQUIREMENTS = {
	requireTeam: true,
	requireProject: true
} as const;

/** The body that creates an organization, with the tracking requirements it starts with. */
export function withNewOrganizationTrackingRequirements<T extends object>(organization: T) {
	return { ...NEW_ORGANIZATION_TRACKING_REQUIREMENTS, ...organization };
}
