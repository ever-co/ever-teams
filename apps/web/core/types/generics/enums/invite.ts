export enum EInviteStatus {
	INVITED = 'INVITED',
	ACCEPTED = 'ACCEPTED',
	EXPIRED = 'EXPIRED',
	REJECTED = 'REJECTED'
}

export enum EInviteAction {
	ACCEPTED = 'ACCEPTED',
	REJECTED = 'REJECTED'
}

export enum EInvitationType {
	USER = 'USER',
	EMPLOYEE = 'EMPLOYEE',
	CANDIDATE = 'CANDIDATE',
	TEAM = 'TEAM'
}

export enum EInvitationExpiration {
	DAY = 1,
	WEEK = 7,
	TWO_WEEK = 14,
	MONTH = 30,
	NEVER = 'Never'
}
