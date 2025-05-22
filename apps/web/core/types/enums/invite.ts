export enum InviteStatusEnum {
	INVITED = 'INVITED',
	ACCEPTED = 'ACCEPTED',
	EXPIRED = 'EXPIRED',
	REJECTED = 'REJECTED'
}

export enum InviteActionEnum {
	ACCEPTED = 'ACCEPTED',
	REJECTED = 'REJECTED'
}

export enum InvitationTypeEnum {
	USER = 'USER',
	EMPLOYEE = 'EMPLOYEE',
	CANDIDATE = 'CANDIDATE',
	TEAM = 'TEAM'
}

export enum InvitationExpirationEnum {
	DAY = 1,
	WEEK = 7,
	TWO_WEEK = 14,
	MONTH = 30,
	NEVER = 'Never'
}
