'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { EmbedSiteTokens } from '@ever-teams/api';
import { appOriginOf, KitSiteSignIn, openSitePopup, SitePopup } from '@lib/session/site-popup';
import { createSiteSession, isGrantEnded, KitSiteSession, KitSiteSignedOut } from '@lib/session/site-session';
import { SiteSignInControls, SiteSignInStatus } from '@lib/session/site-sign-in-context';
import { warnOnce } from '@lib/utils/warn-once';
import type { TokenFailureWarning } from './useHostToken';

/** The warning of a renewal that failed; none while nobody signed in from this site. */
export const siteSignInWarning: TokenFailureWarning = (error) => {
	if (error instanceof KitSiteSignedOut) {
		return null;
	}
	if (isGrantEnded(error)) {
		return {
			key: 'site-sign-in-ended',
			message:
				'the sign-in with Ever Teams ended (revoked, expired, or its renewal token was used twice): the widgets offer to sign in again.'
		};
	}
	const { message, nextStep } = (error ?? {}) as { message?: string; nextStep?: string };
	let step = '';
	if (nextStep) {
		step = ` ${nextStep}`;
	}
	return {
		key: 'site-sign-in-failed',
		message: `the sign-in with Ever Teams could not be renewed (${message ?? error}): the widgets show the person as signed out.${step}`
	};
};

/**
 * The session of a sign-in with Ever Teams for the provider's API address, or null without config.signIn 'ever-teams'.
 * Another address gets a session of its own.
 */
export function useSiteSession(signIn: KitSiteSignIn | null, apiUrl: string): KitSiteSession | null {
	const enabled = signIn !== null;
	const appUrl = signIn?.appUrl;
	useEffect(() => {
		if (appUrl === undefined || appOriginOf(appUrl) !== null) {
			return;
		}
		warnOnce(
			'site-sign-in-app-url',
			'config.appUrl is not an http or https address: the sign-in popup cannot open.'
		);
	}, [appUrl]);
	return useMemo(() => {
		if (!enabled) {
			return null;
		}
		return createSiteSession(apiUrl);
	}, [enabled, apiUrl]);
}

/**
 * What the sign-in button and the user menu call: open the popup and take the tokens it posts, or sign out.
 *
 * @param askForToken The provider's token refresh, which reads the timer token the popup handed over.
 */
export function useSiteSignInControls(
	site: KitSiteSession | null,
	signIn: KitSiteSignIn | null,
	askForToken: () => Promise<void>
): SiteSignInControls | null {
	const [status, setStatus] = useState<SiteSignInStatus>('idle');
	const popup = useRef<SitePopup | null>(null);
	const mounted = useRef(false);
	// A provider that leaves the page stops listening to its popup.
	useEffect(() => {
		mounted.current = true;
		return () => {
			mounted.current = false;
			popup.current?.stop();
		};
	}, []);

	const takeTokens = useCallback(
		async (session: KitSiteSession, tokens: EmbedSiteTokens) => {
			session.accept(tokens);
			await askForToken();
			// A refresh already running when the popup answered (a renewal at start) did not take the handed token.
			if (session.holdsHandedToken()) {
				await askForToken();
			}
		},
		[askForToken]
	);

	const open = useCallback(() => {
		if (!site || !signIn) {
			return;
		}
		// A second click opens the web app's page again, in the same window and in front: the person may have left that
		// window on another page of the web app (its home page after a sign-in).
		popup.current?.stop();
		const opened = openSitePopup(signIn);
		popup.current = opened;
		if (!opened.window) {
			setStatus('blocked');
			return;
		}
		opened.window.focus();
		setStatus('waiting');
		void opened.result.then(async (result) => {
			// A popup opened again since, or a provider that left the page or started afresh (another address): this
			// wait no longer counts.
			const isCurrent = popup.current === opened;
			if (!isCurrent || !mounted.current) {
				return;
			}
			popup.current = null;
			setStatus('idle');
			if (result.kind === 'authorized') {
				await takeTokens(site, result.tokens);
			}
		});
	}, [site, signIn, takeTokens]);

	const signOut = useCallback(async () => {
		if (!site) {
			return;
		}
		await site.signOut();
		await askForToken();
	}, [site, askForToken]);

	return useMemo(() => {
		if (!site) {
			return null;
		}
		return { status, signIn: open, signOut };
	}, [site, status, open, signOut]);
}
