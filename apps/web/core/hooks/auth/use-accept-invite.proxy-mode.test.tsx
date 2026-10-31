/**
 * @jest-environment jsdom
 *
 * Accepting an invitation from the e-mail link. In proxy mode the /api/invite/accept route reads the organization
 * and the first team and sets the session cookies itself, so the hook stops after the accept: the two reads it makes
 * in direct mode hand the new token to Gauzy, which no proxy route does. Direct mode keeps its reads and cookies.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
// The zod schema modules import each other in a cycle: the barrel first, as the app and use-accept-invite.test.tsx do.
import '@/core/types/schemas';
import { useAcceptInvite } from './use-accept-invite';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';

const mockAccept = jest.fn();
const mockGetUserOrganizations = jest.fn();
const mockGetAllOrganizationTeam = jest.fn();
const mockSetAuthCookies = jest.fn();

// The hook reads the base URL when the form is sent: each case sets it (empty is proxy mode).
jest.mock('@/core/constants/config/constants', () => ({
	...jest.requireActual('@/core/constants/config/constants'),
	GAUZY_API_BASE_SERVER_URL: { value: '' }
}));
jest.mock('@/core/services/client/api/organizations/teams/invites', () => ({
	inviteService: {
		validateInvitationByCodeAndEmail: jest.fn(async () => ({
			email: 'invited@example.test',
			organization: { name: 'Acme' }
		})),
		validateInviteByTokenAndEmail: jest.fn(),
		acceptInvite: (...args: unknown[]) => mockAccept(...args)
	}
}));
jest.mock('@/core/hooks/invitations/use-invitation-invalidation', () => ({
	useInvitationInvalidation: () => ({ invalidateMyInvitations: jest.fn() })
}));
jest.mock('@/core/services/client/api/users/user-organization.service', () => ({
	userOrganizationService: { getUserOrganizations: (...args: unknown[]) => mockGetUserOrganizations(...args) }
}));
jest.mock('@/core/services/client/api/organizations/teams/team.service', () => ({
	organizationTeamService: { getAllOrganizationTeam: (...args: unknown[]) => mockGetAllOrganizationTeam(...args) }
}));
jest.mock('@/core/lib/helpers/cookies', () => ({
	setAuthCookies: (...args: unknown[]) => mockSetAuthCookies(...args)
}));

const gauzyBaseUrl = GAUZY_API_BASE_SERVER_URL as { value: string };

const INVITATION = {
	password: 'a-password',
	user: { firstName: 'Invited', lastName: 'Person', email: 'invited@example.test' },
	code: 'AB12CD34',
	email: 'invited@example.test'
};

const ACCEPTED = {
	user: { id: 'user-1', tenantId: 'tenant-1' },
	token: 'access-token',
	refresh_token: 'refresh-token'
};

/** Validates the invitation as the page does, then submits the accept form. */
async function acceptInvitation() {
	const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
	const wrapper = ({ children }: PropsWithChildren) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
	const { result } = renderHook(() => useAcceptInvite(), { wrapper });

	await act(async () => {
		await result.current.validateInvitation({ code: INVITATION.code, email: INVITATION.email });
	});
	await waitFor(() => expect(result.current.invitationState.state).toBe('validated'));

	await act(async () => {
		await result.current.handleAcceptInvitation(INVITATION);
	});
}

beforeEach(() => {
	mockAccept.mockResolvedValue(ACCEPTED);
	mockGetUserOrganizations.mockResolvedValue({
		data: { items: [{ organizationId: 'org-1', organization: { name: 'Acme' } }] }
	});
	mockGetAllOrganizationTeam.mockResolvedValue({ data: { items: [{ id: 'team-1' }] } });
});

describe('useAcceptInvite → handleAcceptInvitation', () => {
	it('stops after the accept in proxy mode, where the route has set the session', async () => {
		gauzyBaseUrl.value = '';

		await acceptInvitation();

		expect(mockAccept).toHaveBeenCalledWith(INVITATION);
		expect(mockGetUserOrganizations).not.toHaveBeenCalled();
		expect(mockGetAllOrganizationTeam).not.toHaveBeenCalled();
		expect(mockSetAuthCookies).not.toHaveBeenCalled();
	});

	it('reads the organization and team and sets the cookies itself in direct mode', async () => {
		gauzyBaseUrl.value = 'https://api.example.test';

		await acceptInvitation();

		expect(mockGetUserOrganizations).toHaveBeenCalledWith({
			tenantId: 'tenant-1',
			userId: 'user-1',
			token: 'access-token'
		});
		expect(mockSetAuthCookies).toHaveBeenCalledWith(
			expect.objectContaining({
				access_token: 'access-token',
				tenantId: 'tenant-1',
				organizationId: 'org-1',
				teamId: 'team-1'
			})
		);
	});
});
