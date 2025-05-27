import { smtpConfiguration } from '@/core/constants/config/constants';
import { serverFetch } from '../fetch';
import { ICustomSmtp } from '@/core/types/interfaces/smpt/ICustomSmtp';

export function createTenantSmtpRequest({ tenantId, access_token }: { tenantId: string; access_token: string }) {
	const config = smtpConfiguration();

	console.log(`SMTP Config: ${JSON.stringify(config)}`);

	return serverFetch<ICustomSmtp>({
		path: '/smtp',
		method: 'POST',
		body: config,
		bearer_token: access_token,
		tenantId
	});
}

export function countTenantTenantSmtpRequest({ tenantId, access_token }: { tenantId: string; access_token: string }) {
	return serverFetch<{ items: ICustomSmtp[]; total: number }>({
		path: '/smtp',
		method: 'GET',
		bearer_token: access_token,
		tenantId
	});
}
