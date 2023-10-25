export interface ITaskStatusItem {
	id: string;
	createdAt: string;
	updatedAt: string;
	tenantId: string;
	organizationId: string;
	name?: string;
	value?: string;
	description?: string;
	icon?: string;
	color?: string;
	is_system?: boolean;
	isSystem?: boolean;
	projectId?: string;
	fullIconUrl?: string;
}

export interface ITaskStatusCreate {
	name: string;
	description?: string;
	icon?: string;
	color?: string;
	projectId?: string;
	organizationId?: string;
	tenantId?: string | undefined | null;
	organizationTeamId?: string | undefined | null;
}
