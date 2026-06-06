import { IEmployee, IUser } from '../atoms/interfaces';

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
	public?: boolean;
	imageId?: string | null;
	image?: string;
	// projects?: IProject[];
}

export type IOrganizationTeamUpdate = IOrganizationTeamCreate & { id: string };

export type ITeamRequestParams = {
	organizationId: string;
	tenantId: string;
	relations?: string[];
};

export interface IOrganizationTeam {
	tenantId: string;
	organizationId: string;
	name: string;
	prefix: string;
	tenant: {
		id: string;
	};
	members: OT_Member[];
	tags: any[];
	id: string;
	createdAt: string;
	updatedAt: string;
	shareProfileView?: boolean;
	imageId?: string | null;
	image?: string | null;
	employees?: IEmployee[];
	allowAgentAppExit: boolean;
	allowDeleteTime: boolean;
	allowLogoutFromAgentApp: boolean;
	allowManualTime: boolean;
	allowModifyTime: boolean;
	allowScreenshotCapture: boolean;
	allowTrackInactivity: boolean;
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
	logo?: string;
	teamSize?: string;
	updated?: boolean;
	prefix: string;
	members: OT_Member[];
	shareProfileView?: boolean;
	public?: boolean;
	createdById: string;
	createdBy: IUser;
	profile_link?: string;
	imageId?: string | null;
	image?: string | null;
	projects?: any[];
}

export type IOrganizationTeamWithMStatus = IOrganizationTeamList;

export interface OT_Member {
	id: string;
	order?: number;
	createdAt: string;
	updatedAt: string;
	tenantId: any;
	organizationId: any;
	organizationTeamId: string;
	employeeId: string;
	roleId?: string;
	role?: OT_Role;
	employee: IEmployee;
	lastWorkedTask?: any;
	running?: boolean;
	duration?: number;
	isTrackingEnabled?: boolean;
	totalTodayTasks: any[];
	totalWorkedTasks: any[];
	timerStatus?: ITimerStatusEnum;
	activeTaskId?: string;
}

export type ITimerStatusEnum = 'running' | 'idle' | 'pause' | 'online' | 'suspended';

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
	MEMBER = 'MEMBER'
}

export interface IUserOrganization {
	deletedAt: string | null;
	id: string | null;
	createdAt: string | null;
	updatedAt: string | null;
	isActive: boolean;
	isArchived: boolean;
	archivedAt: string | null;
	tenantId: string;
	organizationId: string;
	isDefault: boolean;
	userId: string;
	organization: IOrganizationTeam;
}
