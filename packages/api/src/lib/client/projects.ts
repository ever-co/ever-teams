import { IProject } from '@ever-teams/toolkit-types';
import { Identity } from './identity';
import { Transport } from './transport';

export interface ProjectsResource {
	/** GET /organization-projects/employee/:employeeId: the projects of the token's member. */
	list(): Promise<IProject[]>;
}

export function createProjects(transport: Transport, identity: Identity): ProjectsResource {
	async function list(): Promise<IProject[]> {
		const { tenantId, organizationId, employeeId } = await identity.member();
		return transport.request<IProject[]>({
			method: 'GET',
			path: `/organization-projects/employee/${encodeURIComponent(employeeId)}`,
			query: { organizationId, tenantId },
			tenantId,
			organizationId
		});
	}

	return { list };
}
