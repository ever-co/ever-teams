import { smtpConfiguration } from '@app/constants';
import { I_SMTP } from '@app/interfaces/ISmtp';
import { serverFetch } from '../fetch';

export async function createTenantSmtpRequest({
	tenantId,
	access_token,
}: {
	tenantId: string;
	access_token: string;
}) {
	const config = smtpConfiguration();
	return serverFetch<I_SMTP>({
		path: '/smtp',
		method: 'POST',
		body: config,
		bearer_token: access_token,
		tenantId,
	});
}
