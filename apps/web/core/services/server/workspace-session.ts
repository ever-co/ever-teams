import { NextResponse } from 'next/server';
import { setAuthCookies } from '@/core/lib/helpers/index';
import { pickTokenOrganization } from '@/core/lib/auth/jwt-utils';
import type { IAuthResponse } from '@/core/types/interfaces/auth/auth';
import { getUserOrganizationsRequest } from './requests';

/**
 * Answers `body` with the session cookies of a workspace sign-in (`POST /auth/signin.workspace`, or its two-factor
 * completion `POST /auth/two-factor/verify`): the organization the token names, the tenant, the user and `teamId`.
 * Null when the account has no organization yet, for the caller to answer as it does today.
 */
export async function respondWithWorkspaceSession({
	req,
	loginResponse,
	teamId,
	body
}: {
	req: Request;
	loginResponse: IAuthResponse;
	teamId: string;
	body: unknown;
}): Promise<NextResponse | null> {
	const tenantId = loginResponse.user?.tenantId || '';
	const access_token = loginResponse.token;
	const userId = loginResponse.user?.id;

	// An account with no tenant yet has no organization to list (and the list needs a tenant)
	const organizations = tenantId
		? (await getUserOrganizationsRequest({ tenantId, userId }, access_token)).data
		: undefined;
	const organization = pickTokenOrganization(organizations?.items, access_token);
	if (!organization) {
		return null;
	}

	const res = NextResponse.json(body);
	setAuthCookies(
		{
			access_token: loginResponse.token,
			refresh_token: {
				token: loginResponse.refresh_token
			},
			teamId,
			tenantId,
			organizationId: organization.organizationId || '',
			languageId: 'en', // TODO: not sure what should be here
			noTeamPopup: true,
			userId
		},
		{ req, res }
	);
	return res;
}
