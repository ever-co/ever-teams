export type I_SMTPRequest = {
    fromAddress: string;
    host: string;
    port: number;
    secure: boolean;
    username: string;
    password: string;
};

export interface I_SMTP {
	tenantId: string;
	host: string;
	port: number;
	secure: boolean;
	fromAddress: string;
	tenant: { id: string };
	organizationId: any;
	id: string;
	createdAt: string;
	updatedAt: string;
	isValidate: boolean;
}