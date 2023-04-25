import { IImageAssets } from "./IImageAssets"

export interface IInviteCreate {
	emailIds: string[]
	projectIds?: string[]
	departmentIds?: string[]
	teamIds: string[]
	organizationContactIds?: string[]
	roleId: string
	organizationId: string
	tenantId: string
	invitedById: string
	fullName?: string
	inviteType: "TEAM"
	startedWorkOn: string
	appliedDate?: any
	invitationExpirationPeriod: string
	callbackUrl?: string
}

export interface IInvitation {
	id: string
	createdAt: string
	updatedAt: string
	tenantId: string
	organizationId: string
	token: string
	email: string
	status: string
	expireDate: any
	actionDate: string
	fullName: any
	invitedById: string
	roleId: string
	userId: any
	isExpired: boolean
}

export interface ITeamInvitation {
	id: string
	name: string
	image: IImageAssets | null
	prefix: string
}
export interface IMyInvitation {
	id: string
	teams: ITeamInvitation[]
}

export type IInviteRequest = {
	name: string
	email: string
}

export type IInviteVerifyCode = {
	email: string
	code: number
}

export type MyInvitationActionEnum = "ACCEPTED" | "REJECTED"
