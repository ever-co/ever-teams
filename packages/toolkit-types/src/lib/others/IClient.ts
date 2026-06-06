import { IEmployee, ILog } from '../atoms/interfaces';
import { ContactType } from './IContact';
import { IProject } from './IProject';
import { Tag } from './ITask';

export interface IOrganizationContact {
	id: string;
	name: string;
	contactType: ContactType;
	primaryEmail: string;
	primaryPhone: string;
	phones?: string[];
	projects?: IProject[];
	notes?: string;
	members?: IEmployee[];
	imageUrl?: string;
	inviteStatus?: any;
	timeLogs?: ILog[];
	tags: Tag[];
	contact?: any;
	createdBy?: string;
	budget?: number;
	budgetType?: any;
}
