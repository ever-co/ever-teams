import { OT_Member } from './IOrganizationTeam';

export interface IActivityFilter {
	type: 'DATE' | 'TICKET';
	member: OT_Member | null;
	taskId?: string;
	dateStart?: Date;
	dateStop?: Date;
}
