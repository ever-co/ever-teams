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
	public?: boolean;
	imageId?: string | null;
	image?: IImageAssets | null;
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
	color?: string;
	emoji?: string;
	teamSize?: string;
	updated?: boolean;
	prefix: string;
	members: OT_Member[];
	public?: boolean;
	createdById: string;
	createdBy: IUser;
	profile_link?: string;
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
	lastWorkedTask?: ITeamTask;
	running?: boolean;
	duration?: number;
	isTrackingEnabled?: boolean;
	totalTodayTasks: ITasksTimesheet[];
	totalWorkedTasks: ITasksTimesheet[];
	timerStatus: ITimerStatusEnum;
	activeTaskId?: string;
}

export type ITimerStatusEnum =
	| 'running'
	| 'idle'
	| 'pause'
	| 'online'
	| 'suspended';

export interface OT_Role {
	id: string;
	createdAt: string;
	updatedAt: string;
	tenantId: string;
	name: string;
	isSystem: boolean;
}

export enum RoleNameEnum {
	SUPER_ADMIN = 'SUPER_ADMIN',
	ADMIN = 'ADMIN',
	MANAGER = 'MANAGER',
	VIEWER = 'VIEWER',
	MEMBER = 'MEMBER',
}
