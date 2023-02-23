export interface ITaskPrioritiesItemList {
	id: string;
	createdAt: string;
	updatedAt: string;
	tenantId: string;
	organizationId: string;
	name?: string;
	value?: string;
	description?: string;
	icon?: string;
	fullIconUrl?: string;
	color?: string;
	is_system?: boolean;
	isSystem?: boolean;
	projectId?: string;
}

export interface ITaskPrioritiesCreate {
	name: string;
	description?: string;
	icon?: string;
	color?: string;
	projectId?: string;
	organizationId?: string;
	tenantId?: string | undefined | null;
}
