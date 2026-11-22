import { INVITE_CALLBACK_PATH, INVITE_CALLBACK_URL } from '@/core/constants/config/constants';

/**
 * The page an invitation e-mail links to: `INVITE_CALLBACK_URL` when the deployment sets it, otherwise the accept page
 * of this app at `appOrigin`. An invitation that names no page gets a link to Gauzy's own web app instead.
 */
export function inviteCallbackUrl(appOrigin: string): string {
	if (INVITE_CALLBACK_URL) {
		return INVITE_CALLBACK_URL;
	}
	return `${appOrigin}${INVITE_CALLBACK_PATH}`;
}
