import { ITeamProps, IUser } from "./IUserData"

export interface IEmailAndCodeConfirmResponse {
	workspaces: IWorkspace[]
	confirmed_email: string
	show_popup: boolean
	total_workspaces: number
}

export interface IWorkspace {
	user: IUserMultiTenant
	token: string
	current_teams: {
		team_id: string
		team_name: string
		team_logo: string
		team_member_count: string
		profile_link: string
		prefix: string | null
	}[]
}

interface IUserMultiTenant {
	email: string
	name: string
	imageUrl: string
	tenant: ITenant
}

interface ITenant {
	id: string
	name: string
	logo: string
}

export interface ISigninWorspaceResponse {
	user: IUser
	token: string
	refresh_token: string
}

export interface ILoginResponse {
	user: IUser
	token: string
	refresh_token: string
}

export interface IRegisterDataRequest {
	user: Required<Pick<IUser, "email" | "firstName" | "lastName">>
	password: string
	confirmPassword: string
}

export interface IDecodedRefreshToken {
	id: string
	email: string
	tenantId: any
	role: any
	iat: number
	exp: number
}

export type IRegisterDataAPI = ITeamProps & {
	timezone?: string
} & { [x: string]: string }

export interface ILoginDataAPI {
	email: string
	code: string
}

export interface ISuccessResponse {
	status: number
	message: string
}
