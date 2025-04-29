import { IOrganizationTeamList } from '@app/interfaces/IOrganizationTeam';

export type IMember = IOrganizationTeamList['members'][number];

export type MC_EditableValues = {
	memberName: string;
	memberTask: string;
	estimateHours: number;
	estimateMinutes: number;
};
