import { ITeamProps, IUser } from './IUserData';

export interface VerificationResponse {
	response?: number;
	success?: boolean;
	data?: IEmailAndCodeConfirmResponse | null;
	error?: string | null;
}

export interface IEmailAndCodeConfirmResponse {
	workspaces: IWorkspace[];
	confirmed_email: string;
	show_popup: boolean;
	total_workspaces: number;
}

export interface IWorkspace {
	user: IUserMultiTenant;
	token: string;
	current_teams: {
		team_id: string;
		team_name: string;
		team_logo: string;
		team_member_count: string;
		profile_link: string;
		prefix: string | null;
	}[];
}

interface IUserMultiTenant {
	email: string;
	name: string;
	id: string;
	imageUrl: string;
	tenant: ITenant;
}

interface ITenant {
	id: string;
	name: string;
	logo: string;
}

export interface ISigninWorspaceResponse {
	user: IUser;
	token: string;
	refresh_token: string;
}

interface User {
	id: string;
	createdAt: string;
	updatedAt: string;
	tenantId: string;
	thirdPartyId: string | null;
	firstName: string | null;
	lastName: string;
	email: string;
	phoneNumber: string | null;
	username: string | null;
	timeZone: string;
	imageUrl: string;
	preferredLanguage: string;
	preferredComponentLayout: string;
	isActive: boolean;
	roleId: string;
	imageId: string;
	employee: {
		id: string;
		createdAt: string;
		updatedAt: string;
		tenantId: string;
		organizationId: string;
		isActive: boolean;
		startedWorkOn: string;
		totalWorkHours: number;
		profile_link: string;
		isTrackingEnabled: boolean;
		isOnline: boolean;
		isAway: boolean;
		isTrackingTime: boolean;
		allowScreenshotCapture: boolean;
		userId: string;
		isDeleted: boolean;
	};
	role: {
		id: string;
		createdAt: string;
		updatedAt: string;
		tenantId: string;
		name: string;
		isSystem: boolean;
	};
	image: {
		id: string;
		createdAt: string;
		updatedAt: string;
		tenantId: string;
		organizationId: string;
		name: string;
		url: string;
		thumb: string;
		width: number;
		height: number;
		size: number;
		isFeatured: boolean;
		deletedAt: string | null;
		fullUrl: string;
		thumbUrl: string;
	};
	name: string;
	employeeId: string;
	isEmailVerified: boolean;
}

export interface ISignInResponse {
	user: User;
	token: string;
	refresh_token: string;
}

export interface ILoginResponse {
	user: IUser;
	token: string;
	refresh_token: string;
}

export interface IRegisterDataRequest {
	user: Required<Pick<IUser, 'email' | 'firstName' | 'lastName'>>;
	password: string;
	confirmPassword: string;
}

export interface IDecodedRefreshToken {
	id: string;
	email: string;
	tenantId: any;
	role: any;
	iat: number;
	exp: number;
}

export type IRegisterDataAPI = ITeamProps & {
	timezone?: string;
} & { [x: string]: string };

export interface ILoginDataAPI {
	email: string;
	code: string;
}
export interface ISignInDataAPI {
	email: string;
	token: string;
}

export interface ISuccessResponse {
	status: number;
	message: string;
}
