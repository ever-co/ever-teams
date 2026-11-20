import { isEmbedToken } from '@ever-teams/api';
import { useTeamsContext } from '@lib/context/teams-context';

/**
 * Whether the kit holds an embed token, as the host's getToken and the sign-in with Ever Teams answer: the API refuses
 * it every report route (403 `EMBED_SCOPE`, a network error in a browser), so the report widgets read nothing with it
 * (#5602). A getToken that answers another token keeps every widget as it is.
 */
export const useTimerOnlyToken = (): boolean => {
	const { token } = useTeamsContext();
	return isEmbedToken(token);
};
