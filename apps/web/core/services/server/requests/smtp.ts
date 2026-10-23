import { smtpConfiguration } from '@/core/constants/config/constants';
import { serverFetch } from '../fetch';
import { ICustomSmtp } from '@/core/types/interfaces/auth/custom-smtp';

export function createTenantSmtpRequest({ tenantId, access_token }: { tenantId: string; access_token: string }) {
	// The config holds the operator's SMTP password: it goes to the Gauzy API, never to the server log
	return serverFetch<ICustomSmtp>({
		path: '/smtp',
		method: 'POST',
		body: smtpConfiguration(),
		bearer_token: access_token,
		tenantId
	});
}

export function countTenantSmtpRequest({ tenantId, access_token }: { tenantId: string; access_token: string }) {
	return serverFetch<{ items: ICustomSmtp[]; total: number }>({
		path: '/smtp',
		method: 'GET',
		bearer_token: access_token,
		tenantId
	});
}
