export interface ITaskSizeItem {
	id: string
	createdAt: string
	updatedAt: string
	tenantId: string
	organizationId: string
	name?: string
	value?: string
	description?: string
	icon?: string
	color?: string
	fullIconUrl?: string
	is_system?: boolean
	isSystem?: boolean
	projectId?: string
}

export interface ITaskSizeCreate {
	name: string
	description?: string
	icon?: string
	color?: string
	projectId?: string
	organizationId?: string
	tenantId?: string | undefined | null
	organizationTeamId?: string | undefined | null
}
