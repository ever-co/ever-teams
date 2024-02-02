import { ILoginResponse, IInviteVerifyCode, IInviteVerified } from '@app/interfaces';
import { AcceptInviteParams } from '@app/services/server/requests';
import { post } from '../../axios';
import { authFormValidate, generateToken } from '@app/helpers';

export function acceptInviteAPI(params: AcceptInviteParams) {
	return post<ILoginResponse>('/invite/accept', params)
		.then((res) => res.data)
		.catch(() => void 0);
}

export function verifyInviteCodeAPI(params: IInviteVerifyCode) {
	return post<IInviteVerified>('/invite/validate-by-code', params).then((res) => res.data);
}

/**
 *
 * @param email
 * @param code
 * @returns
 */
export async function signInEmailConfirmGauzy(email: string, code: string) {
	let loginResponse: ILoginResponse | null = null;
	const inviteReq = await verifyInviteCodeAPI({ email, code });

	const { errors, valid: formValid } = authFormValidate(['email', 'code'], { email, code } as any);

	if (!formValid) {
		return Promise.reject({ errors });
	}

	if (inviteReq && inviteReq.fullName) {
		const password = generateToken(8);
		const names = inviteReq.fullName.split(' ');

		const acceptInviteRes = await acceptInviteAPI({
			code,
			email,
			password,
			user: {
				firstName: names[0],
				lastName: names[1] || '',
				email
			}
		});

		if (!acceptInviteRes) {
			return Promise.reject({
				errors: {
					email: 'Authentication code or email address invalid'
				}
			});
		}

		loginResponse = acceptInviteRes;
	}

	if (loginResponse) {
		/**
		 * Get the first team from first organization
		 */
		const tenantId = loginResponse.user?.tenantId || '';
		const access_token = loginResponse.token;
		const userId = loginResponse.user?.id;
	}
}
