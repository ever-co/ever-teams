export interface IRequestToJoinCreate {
	email: string;
	fullName: string;
	linkAddress: string;
	position: string;
	organizationTeamId: string;
}

export interface IValidateRequestToJoin
	extends Pick<IRequestToJoinCreate, 'email' | 'organizationTeamId'> {
	code: number;
}

export interface IRequestToJoin extends IRequestToJoinCreate {
	id: string;
	createdAt: string;
	updatedAt: string;
	status: string;
}

export enum IRequestToJoinActionEnum {
	ACCEPTED = 'ACCEPTED',
	REJECTED = 'REJECTED',
}
