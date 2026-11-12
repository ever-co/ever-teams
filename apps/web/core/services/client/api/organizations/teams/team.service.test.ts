import { organizationProjectService } from '../organization-project.service';
import { organizationTeamService } from './team.service';

const TENANT_ID = '11111111-1111-4111-8111-111111111111';
const ORGANIZATION_ID = '22222222-2222-4222-8222-222222222222';
const TEAM_ID = '33333333-3333-4333-8333-333333333333';

describe('OrganizationTeamService.createOrganizationTeamGauzy', () => {
	afterEach(() => jest.restoreAllMocks());

	it('names the project it creates for the team as the team default project', async () => {
		jest.spyOn(organizationProjectService, 'createOrganizationProject').mockResolvedValue({
			id: 'proj-1',
			name: 'Support'
		} as never);
		const post = jest.spyOn(organizationTeamService, 'post').mockResolvedValue({
			config: {},
			data: { id: TEAM_ID, name: 'Support', organization: { id: ORGANIZATION_ID } },
			headers: {},
			status: 201,
			statusText: 'Created'
		} as never);

		await organizationTeamService.createOrganizationTeamGauzy({
			data: { name: 'Support', tenantId: TENANT_ID, organizationId: ORGANIZATION_ID, public: true },
			bearer_token: 'token-1'
		});

		const [path, body] = post.mock.calls[0];
		expect(path).toBe('/organization-team');
		expect(body).toMatchObject({ projects: [{ id: 'proj-1' }], defaultProjectId: 'proj-1', withStarterTags: true });
	});
});
