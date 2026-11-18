/* eslint-disable no-void */
import { EMAIL_REGEX } from '../../../../helpers/regex';
import { sendAuthCodeRequest } from '../../requests/auth';
import { translate } from '../../../../i18n';

export default async function sendAuthCode(email: string) {
	if (email.trim().length === 0) {
		return {
			error: translate('loginScreen.errors.emptyEmail')
		};
	}

	if (!email.match(EMAIL_REGEX)) {
		return {
			error: translate('loginScreen.errors.invalidEmail')
		};
	}

	// removed the the then() block as it isn't working in stage api, always returning false and causing error message to appear
	const codeSendRes = await sendAuthCodeRequest(email).catch(() => void 0);

	if (!codeSendRes) {
		return {
			status: 400,
			error: translate('loginScreen.errors.noAccount')
		};
	}

	return {
		status: 200,
		data: codeSendRes.data
	};
}
