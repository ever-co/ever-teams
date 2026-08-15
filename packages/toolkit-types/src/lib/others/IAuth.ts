import type { IUser } from '../atoms/interfaces';
import type { IWorkspace } from './IWorkspace';

export interface IAuthWithEmailPassword {
	workspaces: IWorkspace[];
	confirmed_email: string;
	show_popup: boolean;
	total_workspaces: number;
}

export interface IAuthLogin {
	user: IUser;
	token: string;
	refresh_token: string;
}
