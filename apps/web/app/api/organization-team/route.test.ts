/**
 * @jest-environment node
 */
/**
 * GET /api/organization-team in proxy mode answers the teams of every organization of the person. Gauzy refuses a
 * member (not a workspace admin) the teams of an organization other than their session's: that organization is left
 * out instead of turning the whole list into a 500 (ever-co/ever-teams#5204).
 */
const mockAuthenticatedGuard = jest.fn();
const mockGetUserOrganizations = jest.fn();
const mockGetAllOrganizationTeams = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));
jest.mock('@/core/services/server/requests', () => ({
	createOrganizationTeamRequest: jest.fn(),
	getUserOrganizationsRequest: (...args: unknown[]) => mockGetUserOrganizations(...args),
	getAllOrganizationTeamRequest: (...args: unknown[]) => mockGetAllOrganizationTeams(...args)
}));

import { GET } from './route';

/** A Gauzy error answer as serverFetch rejects it: a rejected promise of the error body, marked handled. */
function gauzyAnswer(statusCode: number): Promise<never> {
	const rejection = Promise.reject({ statusCode, message: 'refused' });
	rejection.catch(() => undefined);
	return rejection;
}

describe('GET /api/organization-team', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockAuthenticatedGuard.mockResolvedValue({
			$res: (data: unknown) => Response.json(data),
			user: { id: 'user-1' },
			access_token: 'token-studio',
			tenantId: 'tenant-1',
			organizationId: 'studio'
		});
		mockGetUserOrganizations.mockResolvedValue({
			data: { items: [{ organizationId: 'studio' }, { organizationId: 'labs' }] }
		});
	});

	it("keeps the teams of the session's organization when Gauzy refuses another one", async () => {
		mockGetAllOrganizationTeams.mockImplementation(async ({ organizationId }: { organizationId: string }) => {
			if (organizationId === 'labs') {
				throw gauzyAnswer(400);
			}
			return { data: { items: [{ id: 'studio-team', organizationId: 'studio' }], total: 1 } };
		});

		const response = await GET(new Request('https://app.example.test/api/organization-team'));

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({
			items: [{ id: 'studio-team', organizationId: 'studio' }],
			total: 1
		});
	});

	it('answers the teams of every organization Gauzy answers', async () => {
		mockGetAllOrganizationTeams.mockImplementation(async ({ organizationId }: { organizationId: string }) => ({
			data: { items: [{ id: `${organizationId}-team`, organizationId }], total: 1 }
		}));

		const response = await GET(new Request('https://app.example.test/api/organization-team'));

		await expect(response.json()).resolves.toMatchObject({ total: 2 });
	});

	it("fails the list when the session's own organization cannot be read, instead of answering it empty", async () => {
		mockGetAllOrganizationTeams.mockImplementation(async ({ organizationId }: { organizationId: string }) => {
			if (organizationId === 'studio') {
				throw gauzyAnswer(503);
			}
			return { data: { items: [{ id: 'labs-team', organizationId: 'labs' }], total: 1 } };
		});

		const response = await GET(new Request('https://app.example.test/api/organization-team'));

		expect(response.status).toBe(500);
	});

	it('fails the list when another organization fails for a reason other than a refusal', async () => {
		mockGetAllOrganizationTeams.mockImplementation(async ({ organizationId }: { organizationId: string }) => {
			if (organizationId === 'labs') {
				throw new TypeError('fetch failed');
			}
			return { data: { items: [{ id: 'studio-team', organizationId: 'studio' }], total: 1 } };
		});

		const response = await GET(new Request('https://app.example.test/api/organization-team'));

		expect(response.status).toBe(500);
	});
});
