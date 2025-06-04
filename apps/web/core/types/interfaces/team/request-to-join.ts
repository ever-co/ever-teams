export interface IJoinTeamRequest {
	email: string;
	fullName: string;
	linkAddress: string;
	position: string;
	organizationTeamId: string;
}

export interface IValidateRequestToJoinTeam extends Pick<IJoinTeamRequest, 'email' | 'organizationTeamId'> {
	code: string;
}

export interface IJoinTeamResponse extends IJoinTeamRequest {
	id: string;
	createdAt: string;
	updatedAt: string;
	status: string;
}
