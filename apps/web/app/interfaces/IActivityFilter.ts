import { OT_Member } from './IOrganizationTeam';

export interface IActivityFilter {
	type: 'DATE' | 'TICKET';
	member: OT_Member | null;
	dateStart?: Date;
	dateStop?: Date;
}
