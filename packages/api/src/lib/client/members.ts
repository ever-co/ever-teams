import { IMember, PaginationResponse } from '@ever-teams/toolkit-types';
import { weekRange } from './dates';
import { Identity } from './identity';
import { Transport } from './transport';

export interface MembersResource {
	/**
	 * GET /employee/working: the organization's members working this week, with their user. The API answers it to a
	 * token whose role may select employees; another gets a forbidden error.
	 */
	list(): Promise<IMember[]>;
}

export function createMembers(transport: Transport, identity: Identity): MembersResource {
	async function list(): Promise<IMember[]> {
		const { tenantId, organizationId } = await identity.scope();
		const week = weekRange(new Date());
		const findInput = {
			organizationId,
			tenantId,
			forRange: { startDate: week.start.toISOString(), endDate: week.end.toISOString(), isCustomDate: false },
			withUser: true
		};
		const answer = await transport.request<PaginationResponse<IMember>>({
			method: 'GET',
			path: '/employee/working',
			query: { data: JSON.stringify({ findInput }) },
			tenantId,
			organizationId
		});
		return answer.items;
	}

	return { list };
}
