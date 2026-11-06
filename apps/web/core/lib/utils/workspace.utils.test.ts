import type { ISigninEmailConfirmWorkspaces } from '@/core/types/interfaces/auth/auth';
import { isWorkspaceNotSetUp, isWorkspaceSetUp } from './workspace.utils';

function workspaceWithTenant(
	tenant: ISigninEmailConfirmWorkspaces['user']['tenant'] | null
): ISigninEmailConfirmWorkspaces {
	return {
		token: 'workspace-token',
		user: {
			email: 'ada@example.test',
			imageUrl: '',
			name: 'Ada Lovelace',
			tenant: tenant as ISigninEmailConfirmWorkspaces['user']['tenant']
		},
		current_teams: []
	};
}

describe('isWorkspaceSetUp', () => {
	it('is set up when Gauzy sends its tenant, even one without a name', () => {
		expect(isWorkspaceSetUp(workspaceWithTenant({ name: 'Acme', logo: '' }))).toBe(true);
		expect(isWorkspaceSetUp(workspaceWithTenant({ name: '', logo: '' }))).toBe(true);
	});

	it('is not set up when Gauzy sends no tenant, as for an account that was never set up', () => {
		expect(isWorkspaceSetUp(workspaceWithTenant(null))).toBe(false);
	});
});

describe('isWorkspaceNotSetUp', () => {
	it('labels a workspace without a tenant', () => {
		expect(isWorkspaceNotSetUp(workspaceWithTenant(null), 0)).toBe(true);
	});

	it('labels a workspace the list marks, even though an Ever ID sign-in filled its tenant with an empty one', () => {
		const filled = workspaceWithTenant({ name: '', logo: '' });

		expect(isWorkspaceNotSetUp(filled, 1, [1])).toBe(true);
		expect(isWorkspaceNotSetUp(filled, 0, [1])).toBe(false);
	});

	it('leaves a workspace with its tenant as it is', () => {
		expect(isWorkspaceNotSetUp(workspaceWithTenant({ name: 'Acme', logo: '' }), 0, [])).toBe(false);
	});
});
