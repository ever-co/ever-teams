import type { IAuthResponse } from '@/core/types/interfaces/auth/auth';
import type {
	ITwoFactorConfirmation,
	ITwoFactorEnrollment,
	ITwoFactorProof,
	ITwoFactorRecoveryCodes,
	ITwoFactorStatus,
	ITwoFactorVerifyInput
} from '@/core/types/interfaces/auth/two-factor';
import { serverFetch } from '../fetch';

/** The session of the caller, for Gauzy's signed-in two-factor routes. */
interface ISession {
	bearer_token: string;
	tenantId: string;
}

/** `GET /auth/two-factor`: the caller's own state (the organization decides `requiredByOrganization`). */
export function twoFactorStatusRequest({ organizationId, ...session }: ISession & { organizationId?: string }) {
	const query = organizationId ? `?organizationId=${encodeURIComponent(organizationId)}` : '';
	return serverFetch<ITwoFactorStatus>({ path: `/auth/two-factor${query}`, method: 'GET', ...session });
}

export function enrollTwoFactorRequest({ issuer, ...session }: ISession & { issuer?: string }) {
	return serverFetch<ITwoFactorEnrollment>({
		path: '/auth/two-factor/enroll',
		method: 'POST',
		body: issuer ? { issuer } : {},
		...session
	});
}

export function confirmTwoFactorRequest({ code, ...session }: ISession & { code: string }) {
	return serverFetch<ITwoFactorConfirmation>({
		path: '/auth/two-factor/confirm',
		method: 'POST',
		body: { code },
		...session
	});
}

export function disableTwoFactorRequest({ proof, ...session }: ISession & { proof: ITwoFactorProof }) {
	return serverFetch<ITwoFactorStatus>({ path: '/auth/two-factor/disable', method: 'POST', body: proof, ...session });
}

export function regenerateRecoveryCodesRequest({ proof, ...session }: ISession & { proof: ITwoFactorProof }) {
	return serverFetch<ITwoFactorRecoveryCodes>({
		path: '/auth/two-factor/recovery-codes',
		method: 'POST',
		body: proof,
		...session
	});
}

/** An administrator turns a member's second factor off (recorded by the API). */
export function resetMemberTwoFactorRequest({ userId, ...session }: ISession & { userId: string }) {
	return serverFetch<{ reset: boolean }>({
		path: `/auth/two-factor/users/${encodeURIComponent(userId)}`,
		method: 'DELETE',
		...session
	});
}

/** Public: trades the challenge of a sign-in and its code (or a recovery code) for the session. */
export function verifyTwoFactorRequest(input: ITwoFactorVerifyInput) {
	return serverFetch<IAuthResponse>({ path: '/auth/two-factor/verify', method: 'POST', body: input });
}
