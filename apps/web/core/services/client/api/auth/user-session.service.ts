import { APIService } from '../../api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import type {
	IUserSession,
	IUserSessionSignOutOthersInput,
	IUserSessionSignOutOthersResponse
} from '@/core/lib/auth/user-sessions';

/**
 * The signed-in user's own sessions (Gauzy's `/auth/sessions`, ever-co/ever-gauzy#11943): Gauzy answers with this
 * user's sessions only and refuses to touch another user's. Direct mode calls Gauzy; proxy mode goes through the
 * app's `/api/auth/sessions` routes, which forward with the session's token.
 */
class UserSessionService extends APIService {
	list = async (signal?: AbortSignal): Promise<IUserSession[]> => {
		const { data } = await this.get<IUserSession[]>('/auth/sessions', { signal });
		return data;
	};

	/** Needs the account's password, or for an account without one the code of the sign-in code e-mail. */
	signOutOthers = async (input: IUserSessionSignOutOthersInput): Promise<IUserSessionSignOutOthersResponse> => {
		const { data } = await this.post<IUserSessionSignOutOthersResponse>('/auth/sessions/sign-out-others', input);
		return data;
	};

	signOut = async (sessionId: string): Promise<void> => {
		await this.delete(`/auth/sessions/${encodeURIComponent(sessionId)}`);
	};
}

export const userSessionService = new UserSessionService(GAUZY_API_BASE_SERVER_URL.value);
