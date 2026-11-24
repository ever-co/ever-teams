import { PaginationResponse } from '@ever-teams/toolkit-types';
import { weekRange } from './dates';
import { Identity } from './identity';
import { Transport } from './transport';

/** The user of a member, with the fields GET /employee/working answers. */
export interface EverTeamsMemberUser {
	id: string;
	firstName: string | null;
	lastName: string | null;
	/** The first and last names. */
	name: string;
	email: string | null;
	imageUrl: string | null;
	timeZone: string | null;
	/** The clock the user reads: 12 or 24 hours. */
	timeFormat: 12 | 24;
}

/** A member working this week, with the fields GET /employee/working answers. */
export interface EverTeamsMember {
	id: string;
	userId: string;
	fullName: string;
	isActive: boolean;
	isTrackingEnabled: boolean;
	isOnline: boolean;
	isAway: boolean;
	startedWorkOn: string | null;
	user: EverTeamsMemberUser;
}

export interface MembersResource {
	/**
	 * GET /employee/working: the organization's members working this week, with their user. The API answers it to a
	 * token whose role may select employees; another gets a forbidden error.
	 */
	list(): Promise<EverTeamsMember[]>;
}

export function createMembers(transport: Transport, identity: Identity): MembersResource {
	async function list(): Promise<EverTeamsMember[]> {
		const { tenantId, organizationId } = await identity.scope();
		const week = weekRange(new Date());
		const findInput = {
			organizationId,
			tenantId,
			forRange: { startDate: week.start.toISOString(), endDate: week.end.toISOString(), isCustomDate: false },
			withUser: true
		};
		const answer = await transport.request<PaginationResponse<EverTeamsMember>>({
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
