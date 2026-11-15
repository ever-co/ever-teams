import { decodeJWT } from '@/core/lib/auth/jwt-utils';
import { TAB_TEAM_HEADER } from '@/core/lib/auth/tab-team-header';

/** A team id as the header may carry it: anything else is ignored. */
const TEAM_ID_PATTERN = /^[\w-]{1,64}$/;

type Claims = (ReturnType<typeof decodeJWT> & { sub?: string }) | null;

/** What a proxied request of a tab working in its own organization acts with. */
export interface TabSession {
	accessToken: string;
	organizationId: string;
	/** The tab's own team; the team cookie names the other tab's, of the other organization. */
	teamId: string | undefined;
}

/**
 * A tab that works in its own organization while the session in the cookies, shared by every tab, is in another one
 * (another tab switched it, or the switch back to this tab's organization is still on its way: tab-organization.ts,
 * #5134) sends its own access token in the Authorization header and names its team in `x-tab-team-id`.
 *
 * Its request acts with that token, its organization and that team when the token is of the same person in the same
 * workspace as the cookies' token and names another organization than it. Gauzy still checks the token, as for any
 * request. Any other request (no header, the cookies' own token, another person's or workspace's token, a token of the
 * same organization) acts with the cookies, as before.
 */
export function tabSessionOf(req: Request, sharedToken: string | null): TabSession | null {
	const authorization = req.headers.get('authorization') ?? '';
	const token = authorization.startsWith('Bearer ') ? authorization.slice('Bearer '.length).trim() : '';
	if (!token || !sharedToken || token === sharedToken) return null;
	const tab = decodeJWT(token) as Claims;
	const shared = decodeJWT(sharedToken) as Claims;
	const tabUserId = tab?.id ?? tab?.sub;
	const isSameSession =
		!!tab &&
		!!shared &&
		!!tabUserId &&
		tabUserId === (shared.id ?? shared.sub) &&
		(tab.tenantId ?? null) === (shared.tenantId ?? null);
	const tabOrganizationId = tab?.organizationId;
	if (!isSameSession || !tabOrganizationId || tabOrganizationId === (shared?.organizationId ?? null)) return null;
	const team = req.headers.get(TAB_TEAM_HEADER) ?? '';
	return {
		accessToken: token,
		organizationId: tabOrganizationId,
		teamId: TEAM_ID_PATTERN.test(team) ? team : undefined
	};
}
