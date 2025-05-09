import { IEmployee } from './IEmployee';
import { IImageAssets } from './IImageAssets';
import { ITeamTask } from './ITask';
import { ITasksTimesheet } from './ITimer';
import { IUser } from './IUserData';

export interface IOrganizationTeamCreate {
	name: string;
	color?: string;
	emoji?: string;
	teamSize?: string;
	memberIds?: string[];
	managerIds?: string[];
	tags?: any[];
	organizationId: string;
	tenantId: string;
	shareProfileView?: boolean;
	requirePlanToTrack?: boolean;
	public?: boolean;
	imageId?: string | null;
	image?: IImageAssets | null;
	projects?: any[];
}

export type IOrganizationTeamUpdate = IOrganizationTeamCreate & { id: string };

export interface IOrganizationTeam {
	tenantId: string;
	organizationId: string;
	name: string;
	prefix: string;
	tenant: {
		id: string;
	};
	members: any[];
	tags: any[];
	id: string;
	shareProfileView?: boolean;
	createdAt: string;
	updatedAt: string;
	imageId?: string | null;
	image?: IImageAssets | null;
}

export interface IOrganizationTeamList {
	id: string;
	createdAt: string;
	updatedAt: string;
	tenantId: string;
	organizationId: string;
	name: string;
	updated?: boolean;
	prefix: string;
	members: OT_Member[];
	managerIds?: string[];
	memberIds?: string[];
	shareProfileView?: boolean;
	public?: boolean;
	createdById: string;
	createdBy: IUser;
	profile_link?: string;
	logo: string | null;
	imageId?: string | null;
	image?: IImageAssets | null;
}

export type IOrganizationTeamWithMStatus = IOrganizationTeamList;

export interface OT_Member {
	id: string;
	createdAt: string;
	updatedAt: string;
	tenantId: any;
	organizationId: any;
	organizationTeamId: string;
	employeeId: string;
	roleId?: string;
	role?: OT_Role;
	employee: IEmployee;
	activeTaskId?: string;
	lastWorkedTask?: ITeamTask;
	running?: boolean;
	duration?: number;
	isTrackingEnabled?: boolean;
	totalTodayTasks: ITasksTimesheet[];
	totalWorkedTasks: ITasksTimesheet[];
	timerStatus: ITimerStatusEnum;
}

export type ITimerStatusEnum = 'running' | 'idle' | 'pause';

interface OT_Role {
	id: string;
	createdAt: string;
	updatedAt: string;
	tenantId: string;
	name: string;
	isSystem: boolean;
}
