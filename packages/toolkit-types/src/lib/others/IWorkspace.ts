import { IUser } from '../atoms/interfaces';
import { IOrganizationTeam } from './IOrganizationTeam';

export interface IWorkspace {
	user: IUser;
	token: string;
	current_teams: IOrganizationTeam[];
}
