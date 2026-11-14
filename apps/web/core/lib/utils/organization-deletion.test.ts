import {
	canDeleteOrganization,
	organizationDeletionBlock,
	organizationToLandInAfterDeletion
} from '@/core/lib/utils/organization-deletion';

const studio = { id: 'org-studio', name: 'Studio' };
const labs = { id: 'org-labs', name: 'Labs' };
const trial = { id: 'org-trial', name: 'Trial' };

describe('canDeleteOrganization', () => {
	it('lets a role holding ALL_ORG_EDIT delete, as Gauzy guards DELETE /organization/:id', () => {
		expect(canDeleteOrganization(['ORG_TASK_EDIT', 'ALL_ORG_EDIT'])).toBe(true);
	});

	it('refuses every other role', () => {
		expect(canDeleteOrganization(['ALL_ORG_VIEW', 'ORG_TEAM_EDIT'])).toBe(false);
		expect(canDeleteOrganization([])).toBe(false);
	});
});

describe('organizationDeletionBlock', () => {
	it('blocks the last organization of the workspace, which only an account deletion removes', () => {
		expect(organizationDeletionBlock([trial], trial.id)).toBe('lastOrganization');
	});

	it('lets an organization go while another one remains', () => {
		expect(organizationDeletionBlock([studio, trial], trial.id)).toBeNull();
	});

	it('counts each organization once when the list repeats one', () => {
		expect(organizationDeletionBlock([trial, trial], trial.id)).toBe('lastOrganization');
	});
});

describe('organizationToLandInAfterDeletion', () => {
	it('lands in another organization of the workspace, the first one by name', () => {
		expect(organizationToLandInAfterDeletion([trial, studio, labs], trial.id)).toEqual(labs);
	});

	it('answers null when none is left, so the person goes to the workspace picker', () => {
		expect(organizationToLandInAfterDeletion([trial], trial.id)).toBeNull();
	});
});
