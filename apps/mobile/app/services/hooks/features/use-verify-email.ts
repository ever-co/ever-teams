import { useState } from 'react';
import { resentVerifyUserLinkRequest, verifyUserEmailByCodeRequest } from '../../client/requests/auth';
import { useStores } from '../../../models';
import { authFormValidate } from '../../../helpers/validations';

export function useVerifyEmail() {
	const [isLoading, setIsLoading] = useState(false);

	const {
		authenticationStore: { tenantId, authToken }
	} = useStores();

	const resendAccountVerificationCode = async (email: any) => {
		setIsLoading(true);
		await resentVerifyUserLinkRequest({
			bearer_token: authToken,
			email,
			tenantId
		});
		setIsLoading(false);
	};

	const verifyEmailByCode = async (email: string, code: string) => {
		const params = { email, code };

		setIsLoading(true);
		const { valid: formValid } = authFormValidate(['code', 'email'], params as any);

		if (!formValid) {
			setIsLoading(false);
			return;
		}
		await verifyUserEmailByCodeRequest({
			bearer_token: authToken,
			code,
			email,
			tenantId
		});
		setIsLoading(false);
	};

	return {
		resendAccountVerificationCode,
		verifyEmailByCode,
		isLoading
	};
}
