/* eslint-disable camelcase */
import { serverFetch } from '../fetch';

export function emailResetRequest({
	bearer_token,
	tenantId,
	email
}: {
	bearer_token: string | any;
	tenantId?: string;
	email: string;
}) {
	return serverFetch<any>({
		path: `/email-reset/request-change-email`,
		method: 'POST',
		bearer_token,
		tenantId,
		body: { email }
	});
}

export function verifyChangemailRequest({
	bearer_token,
	tenantId,
	code
}: {
	bearer_token: string | any;
	tenantId?: string;
	code: string | number;
}) {
	return serverFetch<any>({
		path: `/email-reset/verify-change-email`,
		method: 'POST',
		bearer_token,
		tenantId,
		body: { code }
	});
}
