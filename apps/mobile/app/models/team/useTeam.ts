import { IOrganizationTeamList } from "../../services/interfaces/IOrganizationTeam"

export interface IGetTeamsParams {
	tenantId: string
	userId: string
	authToken: string
}

export interface ITeamsOut {
	items: IOrganizationTeamList[]
	total: number
}

export interface ICreateTeamParams {
	access_token: string
	tenantId: string
	userId: string
	organizationId: string
	employeeId: string
	teamName?: string
}
