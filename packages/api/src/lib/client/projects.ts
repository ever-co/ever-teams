import { Identity } from './identity';
import { Transport } from './transport';

/** A project of the member, with the fields GET /organization-projects/employee/:employeeId answers. */
export interface EverTeamsProject {
	id: string;
	name: string;
	billing: string | null;
	currency: string | null;
	public: boolean | null;
	owner: string | null;
	taskListType: string;
	imageUrl: string | null;
}

export interface ProjectsResource {
	/** GET /organization-projects/employee/:employeeId: the projects of the token's member. */
	list(): Promise<EverTeamsProject[]>;
}

export function createProjects(transport: Transport, identity: Identity): ProjectsResource {
	async function list(): Promise<EverTeamsProject[]> {
		const { tenantId, organizationId, employeeId } = await identity.member();
		return transport.request<EverTeamsProject[]>({
			method: 'GET',
			path: `/organization-projects/employee/${encodeURIComponent(employeeId)}`,
			query: { organizationId, tenantId },
			tenantId,
			organizationId
		});
	}

	return { list };
}
