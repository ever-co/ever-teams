export interface IIssueTypesCreate {
	id: string
	description?: string
	icon?: string
	color?: string
	projectId?: string
	organizationId?: string
	tenantId?: string | undefined | null
	organizationTeamId?: string | undefined | null
}

export interface IIssueTypesItemList extends IIssueTypesCreate {
	id: string
	createdAt: string
	updatedAt: string
	tenantId: string
	organizationId: string
	value?: string
	fullIconUrl?: string
	is_system?: boolean
	isSystem?: boolean
}

export interface IIssueType {
	id: string
	createdAt: string
	updatedAt: string
	tenantId: string
	organizationId: string
	name: string
	value: string
	description: string
	icon: string
	color: string
	isSystem: boolean
	imageId: string | null
	projectId: string | null
	organizationTeamId: string
	image: string | null
	fullIconUrl: string
}

export interface IIssuesList {
	items: IIssueType[]
	total: number
}
