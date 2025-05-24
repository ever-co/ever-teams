import { IBasePerTenantAndOrganizationEntityModel } from '../global/base-interfaces';

export interface ICustomSmtp extends I_SMTPRequest, IBasePerTenantAndOrganizationEntityModel {
	isValidate?: boolean;
}
export interface I_SMTPRequest {
	fromAddress: string;
	host: string;
	port: number;
	secure: boolean;
	username: string;
	password: string;
}
