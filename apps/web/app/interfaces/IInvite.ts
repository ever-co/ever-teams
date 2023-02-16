export interface IInviteCreate {
	emailIds: string[];
	projectIds: any[];
	departmentIds: any[];
	organizationContactIds: any[];
	teamIds: any[];
	inviteType: 'TEAM';
	appliedDate?: null;
	invitationExpirationPeriod: 'Never' | number;
	roleId: string;
	organizationId: string;
	fullName: string;
	callbackUrl?: string;
	startedWorkOn: string;
}

export interface IInvitation {
	id: string;
	createdAt: string;
	updatedAt: string;
	tenantId: string;
	organizationId: string;
	token: string;
	email: string;
	status: string;
	expireDate: any;
	actionDate: string;
	fullName: any;
	invitedById: string;
	roleId: string;
	userId: any;
	isExpired: boolean;
}

export type IInviteRequest = {
	name: string;
	email: string;
};

export type IInviteVerifyCode = {
	email: string;
	code: number;
};

export interface IInviteVerified {
	id: string;
	email: string;
	fullName: string;
	organization: {
		name: string;
	};
	isExpired: boolean;
}
