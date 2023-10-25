/* eslint-disable no-void */
import { EMAIL_REGEX } from '../../../../helpers/regex';
import { sendAuthCodeRequest } from '../../requests/auth';

export default async function sendAuthCode(email: string) {
	if (email.trim().length === 0) {
		return {
			error: 'Email should not be empty'
		};
	}

	if (!email.match(EMAIL_REGEX)) {
		return {
			error: 'Email must be a valid email'
		};
	}

	// removed the the then() block as it isn't working in stage api, always returning false and causing error message to appear
	const codeSendRes = await sendAuthCodeRequest(email).catch(() => void 0);

	if (!codeSendRes) {
		return {
			status: 400,
			error: "We couldn't find any account associated to this email"
		};
	}

	return {
		status: 200,
		data: codeSendRes.data
	};
}
