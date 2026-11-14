import { IUser } from '../../../interfaces/IUserData';
import { renewSessionNow } from '../../fetch';
import { currentAuthenticatedUserRequest } from '../../requests/auth';
import { sessionTokens } from '../../session';

type RefreshAnswer = { status: number; user?: IUser; access_token?: string; refresh_token?: string };

/**
 * Renews the session and reads the profile with the new token, for a screen that needs both afresh (an e-mail was
 * just confirmed). The renewal is the app's one renewal (session.ts): it sends the refresh token the app holds now
 * and keeps both tokens of the answer, so nothing is left for the caller to store.
 *
 * Answers 200 with the profile, 401 when the API refuses the refresh token (the session has then ended, and the
 * person was told), and 503 when the renewal could not be made.
 */
export const refresh = async (): Promise<RefreshAnswer> => {
	const renewal = await renewSessionNow();
	if (renewal !== 'renewed') {
		return { status: renewal === 'ended' ? 401 : 503 };
	}

	const { accessToken, refreshToken } = sessionTokens();
	const { data: user, response } = await currentAuthenticatedUserRequest({ bearer_token: accessToken as string });
	if (!response.ok) {
		return { status: response.status };
	}

	return {
		status: 200,
		user,
		access_token: accessToken,
		refresh_token: refreshToken
	};
};
