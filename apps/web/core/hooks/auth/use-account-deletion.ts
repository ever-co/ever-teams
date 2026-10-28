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
import { isTokenExpired } from '@/core/lib/auth/jwt-utils';
import {
	accountDeletionService,
	isAccountDeletionLinkGone,
	isAccountDeletionPlanChanged
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
				await accountDeletionService.requestLink({
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
 * After a confirmed deletion: when this browser holds a session whose account no longer exists, drop it — cookies and
 * cached queries — so the app does not keep acting as a deleted user. Returns whether a session was cleared.
 *
 * Only a conclusive answer clears anything: the access token must still be valid locally (not expired) and the API
 * must refuse it (401/404). An expired access token proves nothing (it is refused for any account), so such a session
 * — possibly of another account, whose refresh token still works — is left to the app's own refresh, which signs it
 * out if its account is gone. No refresh is attempted here: Gauzy rotates refresh tokens, and a refresh whose new
 * tokens this page did not store would end a session that is still valid.
 */
export async function clearSessionIfAccountGone(queryClient: Pick<QueryClient, 'clear'>): Promise<boolean> {
	const token = getAccessTokenCookie();
	if (!token || isTokenExpired(token, 0)) return false;

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

/** A `verify` result, tagged with the token generation it was read for. */
type TPreviewResult = { generation: number } & (
	| { details: IAccountDeletionVerifyResponse }
	| { gone: true }
	| { failed: true }
);

/**
 * The confirm page (`/delete-account/confirm#token=…`).
 *
 * The token is taken from the address and removed from it in a layout effect: before any passive effect of the page
 * (analytics page views included) can read the address. It then lives only in a ref of this hook, so a failed call
 * can be tried again although the address no longer has it.
 *
 * Only a 410 means the link is dead. A 409 on confirm means the accounts changed since the preview (nothing deleted,
 * token kept): the preview is read again and shown with `planChanged`, to be confirmed again. Anything else (network,
 * 5xx, 429) is transient: `phase: 'error'` (verify) or `confirmFailed` (confirm), each with a retry.
 */
export function useAccountDeletionConfirm() {
	const queryClient = useQueryClient();
	// undefined: not read yet; null: the page was opened without a token. A ref survives React's dev double effects.
	const tokenRef = useRef<string | null | undefined>(undefined);
	// Bumped whenever another token takes over (a link pasted into the same tab): answers of calls made for an earlier
	// token are dropped, so they can neither replace the new preview nor pair its token with an old planHash.
	const generationRef = useRef(0);
	const [phase, setPhase] = useState<TAccountDeletionConfirmPhase>('verifying');
	const [details, setDetails] = useState<IAccountDeletionVerifyResponse | null>(null);
	const [result, setResult] = useState<IAccountDeletionConfirmResponse | null>(null);
	const [confirmFailed, setConfirmFailed] = useState(false);
	const [planChanged, setPlanChanged] = useState(false);
	const [sessionCleared, setSessionCleared] = useState(false);

	useLayoutEffect(() => {
		if (tokenRef.current === undefined) {
			tokenRef.current = takeAccountDeletionToken();
		}
	}, []);

	/**
	 * Reads the preview for the token in memory, tagged with the generation it was made for. Never sets state itself,
	 * so the mount effect sets state only after the call.
	 */
	const loadPreview = useCallback(async (): Promise<TPreviewResult> => {
		const generation = generationRef.current;
		const token = tokenRef.current;
		if (!token) return { generation, gone: true };
		try {
			const data = await accountDeletionService.verify(token);
			return data?.accounts?.length ? { generation, details: data } : { generation, gone: true };
		} catch (error) {
			return isAccountDeletionLinkGone(error) ? { generation, gone: true } : { generation, failed: true };
		}
	}, []);

	/** Shows a preview result, unless another token took over since its call was made. */
	const applyPreview = useCallback((preview: TPreviewResult) => {
		if (preview.generation !== generationRef.current) return;
		if ('details' in preview) {
			setDetails(preview.details);
			setPhase('ready');
		} else {
			setPhase('gone' in preview ? 'invalid' : 'error');
		}
	}, []);

	/** Reads the preview again (Try again, after a 409, or for a new token), showing the spinner meanwhile. */
	const verify = useCallback(async () => {
		setPhase('verifying');
		applyPreview(await loadPreview());
	}, [applyPreview, loadPreview]);

	useEffect(() => {
		let cancelled = false;
		void loadPreview().then((preview) => {
			if (!cancelled) applyPreview(preview);
		});
		return () => {
			cancelled = true;
		};
	}, [applyPreview, loadPreview]);

	// A link pasted into this same tab only changes the fragment (no reload): take its token and start over.
	useEffect(() => {
		const onHashChange = () => {
			const token = takeAccountDeletionToken();
			if (!token) return;
			generationRef.current += 1;
			tokenRef.current = token;
			setDetails(null);
			setResult(null);
			setConfirmFailed(false);
			setPlanChanged(false);
			void verify();
		};
		window.addEventListener('hashchange', onHashChange);
		return () => window.removeEventListener('hashchange', onHashChange);
	}, [verify]);

	const planHash = details?.planHash;
	/** Deletes what the shown preview describes (its planHash), with the token in memory. */
	const confirm = useCallback(async () => {
		const generation = generationRef.current;
		const token = tokenRef.current;
		if (!token) {
			setPhase('invalid');
			return;
		}
		setConfirmFailed(false);
		setPlanChanged(false);
		setPhase('deleting');
		try {
			const data = await accountDeletionService.confirm(token, planHash);
			if (generation !== generationRef.current) return;
			// Single use: the API consumed it.
			tokenRef.current = null;
			setResult(data);
			setSessionCleared(await clearSessionIfAccountGone(queryClient));
			setPhase('deleted');
		} catch (error) {
			if (generation !== generationRef.current) return;
			if (isAccountDeletionLinkGone(error)) {
				tokenRef.current = null;
				setPhase('invalid');
				return;
			}
			if (isAccountDeletionPlanChanged(error)) {
				// Nothing was deleted and the token still works: show what would happen now, to be confirmed again.
				setPlanChanged(true);
				await verify();
				return;
			}
			setConfirmFailed(true);
			setPhase('ready');
		}
	}, [queryClient, planHash, verify]);

	return {
		phase,
		details,
		result,
		confirmFailed,
		planChanged,
		sessionCleared,
		confirm,
		retry: () => void verify()
	};
}
