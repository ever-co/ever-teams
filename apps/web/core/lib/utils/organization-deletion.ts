/** Gauzy guards the organization routes, its delete included, with this permission. */
const ORGANIZATION_DELETE_PERMISSION = 'ALL_ORG_EDIT';

/** Why an organization cannot be deleted from its settings. */
export type OrganizationDeletionBlock = 'lastOrganization';

export interface DeletableOrganization {
	id: string;
	name: string;
}

export function canDeleteOrganization(permissions: ReadonlyArray<string>): boolean {
	return permissions.includes(ORGANIZATION_DELETE_PERMISSION);
}

/**
 * The last organization of a workspace stays: removing it would leave the workspace with nowhere to sign in to, and only
 * an account deletion removes a workspace.
 */
export function organizationDeletionBlock(
	organizations: ReadonlyArray<DeletableOrganization>,
	organizationId: string
): OrganizationDeletionBlock | null {
	const otherIds = new Set(
		organizations
			.filter((organization) => organization.id !== organizationId)
			.map((organization) => organization.id)
	);
	if (otherIds.size === 0) {
		return 'lastOrganization';
	}
	return null;
}

/**
 * Where the person goes once the organization is deleted: another organization of the workspace, the first by name so
 * the choice does not depend on the order the API listed them in, or null for the workspace picker.
 */
export function organizationToLandInAfterDeletion(
	organizations: ReadonlyArray<DeletableOrganization>,
	deletedId: string
): DeletableOrganization | null {
	const others = organizations.filter((organization) => organization.id !== deletedId);
	const byName = [...others].sort((first, second) => first.name.localeCompare(second.name));
	return byName[0] ?? null;
}
