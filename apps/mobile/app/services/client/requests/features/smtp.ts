import { serverFetch } from '../../fetch';
import { SMTP_FROM_ADDRESS, SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USERNAME, SMTP_PASSWORD } from '@env';

import { I_SMTP, I_SMTPRequest } from '../../../interfaces/ISmtp';

export const smtpConfiguration: () => I_SMTPRequest = () => ({
	fromAddress: SMTP_FROM_ADDRESS || '',
	host: SMTP_HOST || '',
	port: parseInt(SMTP_PORT, 10) || 0,
	secure: SMTP_SECURE === 'true' ? true : false,
	username: SMTP_USERNAME || '',
	password: SMTP_PASSWORD || ''
});

export function createSmtpTenantRequest(bearer_token: string, tenantId) {
	const config = smtpConfiguration();
	return serverFetch<I_SMTP>({
		path: '/smtp',
		method: 'POST',
		body: config,
		bearer_token,
		tenantId
	});
}
