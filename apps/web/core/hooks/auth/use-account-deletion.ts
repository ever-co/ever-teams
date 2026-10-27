'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { APPLICATION_DEFAULT_LANGUAGE, GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import {
	accountDeletionConfirmUrl,
	takeAccountDeletionToken,
	type IAccountDeletionConfirmResponse,
	type IAccountDeletionVerifyResponse
} from '@/core/lib/auth/account-deletion';
import { appEmailBranding } from '@/core/lib/helpers/app-email-branding';
import { getAccessTokenCookie, removeAuthCookies } from '@/core/lib/helpers/cookies';
import {
	accountDeletionService,
	isAccountDeletionLinkGone
} from '@/core/services/client/api/auth/account-deletion.service';

/**
 * The request form (`/delete-account`): sends the e-mail address with this app's confirm page as `callbackUrl`, the
 * visitor's locale and the app's e-mail branding (the same fields the Ever ID sign-in sends).
 *
 * `sent` becomes true for every accepted request: the API answers the same whether or not an account exists, and so
 * does the page. Only a failed call (network, rate limit, server error) shows `error`.
 */
export function useAccountDeletionRequest() {
	const locale = useLocale();
	const [loading, setLoading] = useState(false);
	const [sent, setSent] = useState(false);
	const [error, setError] = useState(false);

	const requestLink = useCallback(
		async (email: string) => {
			setError(false);
			setLoading(true);
			try {
				await accountDeletionService.request({
					...appEmailBranding(),
					email: email.trim(),
					callbackUrl: accountDeletionConfirmUrl(window.location.origin, locale, APPLICATION_DEFAULT_LANGUAGE),
					locale
				});
				setSent(true);
			} catch {
				setError(true);
			} finally {
				setLoading(false);
			}
		},
		[locale]
	);

	return { requestLink, loading, sent, error, reset: () => setSent(false) };
}

/**
 * After a confirmed deletion: when this browser holds a session whose account no longer exists (the API now answers
 * 401 for its token), drop it — cookies and cached queries — so the app does not keep acting as a deleted user. A
 * session of another account is left alone. Returns whether a session was cleared.
 */
export async function clearSessionIfAccountGone(queryClient: Pick<QueryClient, 'clear'>): Promise<boolean> {
	const token = getAccessTokenCookie();
	if (!token) return false;

	const base = GAUZY_API_BASE_SERVER_URL.value;
	// Direct mode asks Gauzy; proxy mode asks this app's /api/user/me, which reads the same cookie.
	const url = base ? `${base}/api/user/me` : '/api/user/me';
	try {
		const response = await fetch(url, {
			headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
			cache: 'no-store'
		});
		if (response.status !== 401 && response.status !== 404) return false;
	} catch {
		// Unknown: keep the session; it fails on its own at its next call if its account is gone.
		return false;
	}

	removeAuthCookies();
	queryClient.clear();
	return true;
}

export type TAccountDeletionConfirmPhase = 'verifying' | 'ready' | 'deleting' | 'deleted' | 'invalid' | 'error';

/**
 * The confirm page (`/delete-account/confirm#token=…`).
 *
 * The token is taken from the address and removed from it in a layout effect: before any passive effect of the page
 * (analytics page views included) can read the address. It then lives only in a ref of this hook.
 */
export function useAccountDeletionConfirm() {
	const queryClient = useQueryClient();
	// undefined: not read yet; null: the page was opened without a token. A ref survives React's dev double effects.
	const tokenRef = useRef<string | null | undefined>(undefined);
	const [phase, setPhase] = useState<TAccountDeletionConfirmPhase>('verifying');
	const [details, setDetails] = useState<IAccountDeletionVerifyResponse | null>(null);
	const [result, setResult] = useState<IAccountDeletionConfirmResponse | null>(null);
	const [confirmFailed, setConfirmFailed] = useState(false);
	const [sessionCleared, setSessionCleared] = useState(false);

	useLayoutEffect(() => {
		if (tokenRef.current === undefined) {
			tokenRef.current = takeAccountDeletionToken();
		}
	}, []);

	const verify = useCallback(async (isCancelled: () => boolean = () => false) => {
		const token = tokenRef.current;
		if (!token) {
			setPhase('invalid');
			return;
		}
		setPhase('verifying');
		try {
			const data = await accountDeletionService.verify(token);
			if (isCancelled()) return;
			setDetails(data);
			setPhase(data?.accounts?.length ? 'ready' : 'invalid');
		} catch (error) {
			if (isCancelled()) return;
			setPhase(isAccountDeletionLinkGone(error) ? 'invalid' : 'error');
		}
	}, []);

	useEffect(() => {
		let cancelled = false;
		void verify(() => cancelled);
		return () => {
			cancelled = true;
		};
	}, [verify]);

	const confirm = useCallback(async () => {
		const token = tokenRef.current;
		if (!token) {
			setPhase('invalid');
			return;
		}
		setConfirmFailed(false);
		setPhase('deleting');
		try {
			const data = await accountDeletionService.confirm(token);
			// Single use: the API consumed it.
			tokenRef.current = null;
			setResult(data);
			setSessionCleared(await clearSessionIfAccountGone(queryClient));
			setPhase('deleted');
		} catch (error) {
			if (isAccountDeletionLinkGone(error)) {
				tokenRef.current = null;
				setPhase('invalid');
				return;
			}
			setConfirmFailed(true);
			setPhase('ready');
		}
	}, [queryClient]);

	return {
		phase,
		details,
		result,
		confirmFailed,
		sessionCleared,
		confirm,
		retry: () => void verify()
	};
}
