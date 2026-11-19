'use client';

import { useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Notice } from '@/core/components/common/notice';
import { Spinner } from '@/core/components/common/spinner';
import { Button } from '@/core/components/duplicated-components/_button';
import { ShieldCheck, Timer } from '@/core/components/icons';
import { FocusCard, FocusIconTile, FocusPanel } from '@/core/components/layouts/focus/focus-shell';
import { SignedInAccount } from '@/core/components/layouts/focus/signed-in-account';
import { APP_NAME, DEFAULT_APP_PATH } from '@/core/constants/config/constants';
import { useReactiveAccessTokenCookie } from '@/core/hooks/auth/use-reactive-access-token-cookie';
import { useAuthorizeEmbedSite } from '@/core/hooks/embeds/use-authorize-embed-site';
import { useTeamMenuOrganizations } from '@/core/hooks/organizations/teams/use-team-menu-organizations';
import { setPathAfterSignIn } from '@/core/lib/auth/navigate-after-sign-in';
import {
	currentPageOf,
	embedAuthorizeRequestOf,
	embedSiteRefusalOf,
	handTokensToSite,
	organizationOfRequest,
	siteWindowOf,
	tellSiteDenied,
	type EmbedAuthorizeRequest,
	type EmbedSiteRefusal
} from '@/core/lib/utils/embed-authorize';

type TranslationKey = Parameters<ReturnType<typeof useTranslations>>[0];

const REFUSAL_KEYS: Record<EmbedSiteRefusal, TranslationKey> = {
	'site-not-allowed': 'pages.embedAuthorize.REFUSED_SITE_NOT_ALLOWED',
	'sign-in-off': 'pages.embedAuthorize.REFUSED_SIGN_IN_OFF',
	'member-not-allowed': 'pages.embedAuthorize.REFUSED_MEMBER_NOT_ALLOWED',
	unavailable: 'pages.embedAuthorize.REFUSED_UNAVAILABLE',
	failed: 'pages.embedAuthorize.REFUSED_FAILED'
};

// What the person did here: the window then closes, or says it can be closed when the browser keeps it open.
type Outcome = 'allowed' | 'cancelled';

const hearNothing = () => () => {};
const readSiteWindow = () => siteWindowOf(window);
// Before the browser answers (the server's render): not known yet.
const readNoWindow = (): Window | null | undefined => undefined;

/** The site's page that opened this window: undefined until the browser answers, null when there is none. */
function useSiteWindow(): Window | null | undefined {
	return useSyncExternalStore(hearNothing, readSiteWindow, readNoWindow);
}

/** The window closes once the site has its answer; a browser that keeps it open shows the outcome instead. */
function closeWindow() {
	window.close();
}

function SiteMark() {
	return (
		<FocusIconTile>
			<Timer aria-hidden="true" />
		</FocusIconTile>
	);
}

/** A card that only says something: a link that is not valid, a page opened in its own tab, the outcome. */
function MessageCard({ title, text, children }: Readonly<{ title: string; text: string; children?: ReactNode }>) {
	return <FocusCard mark={<SiteMark />} title={title} description={text} footer={children} />;
}

function LoadingCard() {
	const t = useTranslations();
	return (
		<section
			aria-busy="true"
			aria-label={t('pages.embedAuthorize.LOADING')}
			className="w-full max-w-md rounded-2xl bg-card p-6 hairline-ring ring-border shadow-md shadow-black/6.5 sm:p-7"
		>
			<span className="mb-5 block size-11 animate-pulse rounded-xl bg-foreground/[0.07]" />
			<span className="block h-5 w-56 animate-pulse rounded-full bg-foreground/[0.07]" />
			<span className="mt-3 block h-3.5 w-72 max-w-full animate-pulse rounded-full bg-foreground/[0.06]" />
			<span className="mt-6 block h-20 animate-pulse rounded-xl bg-foreground/[0.04]" />
			<span className="mt-6 flex justify-end gap-3">
				<span className="h-9 w-20 animate-pulse rounded-full bg-foreground/[0.05]" />
				<span className="h-9 w-24 animate-pulse rounded-full bg-foreground/[0.07]" />
			</span>
		</section>
	);
}

/** The site, as text, and the organization it signs people in to. */
function SiteFacts({ origin, organizationName }: Readonly<{ origin: string; organizationName: string }>) {
	const t = useTranslations();
	return (
		<FocusPanel>
			<dl className="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-4 gap-y-2 text-[13px]">
				<dt className="text-xs text-muted-foreground">{t('pages.embedAuthorize.SITE_LABEL')}</dt>
				<dd className="break-all font-mono font-medium text-foreground">{origin}</dd>
				<dt className="text-xs text-muted-foreground">{t('pages.embedAuthorize.ORGANIZATION_LABEL')}</dt>
				<dd className="truncate font-medium text-foreground">{organizationName}</dd>
			</dl>
		</FocusPanel>
	);
}

/** Signed out: sign in first, and come back here after. */
function SignInFirst({ request }: Readonly<{ request: EmbedAuthorizeRequest }>) {
	const t = useTranslations();
	const signIn = () => {
		setPathAfterSignIn(currentPageOf(window));
		window.location.assign(DEFAULT_APP_PATH);
	};
	return (
		<FocusCard
			mark={<SiteMark />}
			title={t('pages.embedAuthorize.SIGN_IN_TITLE')}
			description={t('pages.embedAuthorize.SIGN_IN_TEXT', { appName: APP_NAME, site: request.origin })}
			footer={
				<Button type="button" size="lg" className="ml-auto min-w-28" onClick={signIn}>
					{t('pages.embedAuthorize.SIGN_IN')}
				</Button>
			}
		/>
	);
}

/**
 * Signed in: the site, the organization, what the site may do, and Allow or Cancel. Allow asks the API with the
 * person's session and hands the tokens to the site's page, at its exact origin only.
 */
function Consent({
	request,
	site,
	onOutcome
}: Readonly<{ request: EmbedAuthorizeRequest; site: Window; onOutcome: (outcome: Outcome) => void }>) {
	const t = useTranslations();
	const organizations = useTeamMenuOrganizations();
	const authorize = useAuthorizeEmbedSite();
	const [refusal, setRefusal] = useState<EmbedSiteRefusal | null>(null);
	// Set by "Not you?": an answer that arrives while the sign-out runs belongs to the account the person rejected.
	const leaving = useRef(false);
	const comeBackAfterSignIn = () => setPathAfterSignIn(currentPageOf(window));
	const notYou = () => {
		leaving.current = true;
		comeBackAfterSignIn();
	};

	if (organizations.isPending) {
		return <LoadingCard />;
	}
	if (organizations.isError) {
		return (
			<MessageCard title={t('pages.embedAuthorize.TITLE')} text={t('pages.embedAuthorize.ORGANIZATIONS_FAILED')}>
				<Button type="button" size="lg" className="ml-auto" onClick={() => void organizations.refetch()}>
					{t('pages.embedAuthorize.RETRY')}
				</Button>
			</MessageCard>
		);
	}

	const cancel = () => {
		tellSiteDenied(site, request);
		onOutcome('cancelled');
		closeWindow();
	};

	const organization = organizationOfRequest(organizations.data, request.organizationId);
	if (!organization) {
		return (
			<FocusCard
				mark={<SiteMark />}
				title={t('pages.embedAuthorize.NOT_MEMBER_TITLE')}
				description={t('pages.embedAuthorize.NOT_MEMBER_TEXT')}
				footer={
					<Button type="button" variant="outline" size="lg" className="ml-auto" onClick={cancel}>
						{t('pages.embedAuthorize.CANCEL')}
					</Button>
				}
			>
				<SignedInAccount onNotYou={comeBackAfterSignIn} />
			</FocusCard>
		);
	}

	const allow = () => {
		setRefusal(null);
		const siteToAllow = { origin: request.origin, organizationId: request.organizationId };
		authorize.mutate(siteToAllow, {
			onSuccess: (tokens) => {
				if (leaving.current) {
					authorize.reset();
					return;
				}
				handTokensToSite(site, request, tokens);
				// The tokens leave the page with the message: nothing here keeps them.
				authorize.reset();
				onOutcome('allowed');
				closeWindow();
			},
			onError: (error) => setRefusal(embedSiteRefusalOf(error))
		});
	};

	const isAllowing = authorize.isPending;
	const organizationName = organization.name || t('pages.embedAuthorize.UNNAMED_ORGANIZATION');
	return (
		<FocusCard
			mark={<SiteMark />}
			title={t('pages.embedAuthorize.TITLE')}
			description={t('pages.embedAuthorize.DESCRIPTION', { appName: APP_NAME })}
			footer={
				<>
					<Button type="button" variant="outline" size="lg" disabled={isAllowing} onClick={cancel}>
						{t('pages.embedAuthorize.CANCEL')}
					</Button>
					<Button type="button" size="lg" className="min-w-28" disabled={isAllowing} onClick={allow}>
						{isAllowing && <Spinner className="size-4" />}
						{t('pages.embedAuthorize.ALLOW')}
					</Button>
				</>
			}
		>
			<SignedInAccount onNotYou={notYou} disabled={isAllowing} />
			<SiteFacts origin={request.origin} organizationName={organizationName} />
			<p className="flex items-start gap-2 text-sm text-pretty text-muted-foreground">
				<ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
				<span>{t('pages.embedAuthorize.PERMISSION')}</span>
			</p>
			{refusal && <Notice tone="error" title={t(REFUSAL_KEYS[refusal])} />}
		</FocusCard>
	);
}

/**
 * `/embed/authorize?origin=<site>&organization=<id>&state=<kit's state>`, the popup of the kit's "Sign in with Ever
 * Teams": the signed-in person allows a site to start and stop their timer. The tokens go to the site's page alone, by
 * message with the kit's state, never in an address, a log or this app's storage.
 */
export function EmbedAuthorizePage() {
	const t = useTranslations();
	const query = useSearchParams();
	const request = useMemo(() => embedAuthorizeRequestOf(query), [query]);
	const site = useSiteWindow();
	const accessToken = useReactiveAccessTokenCookie();
	const [outcome, setOutcome] = useState<Outcome | null>(null);

	if (!request) {
		return (
			<MessageCard
				title={t('pages.embedAuthorize.INVALID_TITLE')}
				text={t('pages.embedAuthorize.INVALID_TEXT')}
			/>
		);
	}
	if (site === undefined) {
		return <LoadingCard />;
	}
	if (outcome === 'allowed') {
		return (
			<MessageCard
				title={t('pages.embedAuthorize.ALLOWED_TITLE')}
				text={t('pages.embedAuthorize.ALLOWED_TEXT')}
			/>
		);
	}
	if (outcome === 'cancelled') {
		return (
			<MessageCard
				title={t('pages.embedAuthorize.CANCELLED_TITLE')}
				text={t('pages.embedAuthorize.CANCELLED_TEXT')}
			/>
		);
	}
	if (!site) {
		return (
			<MessageCard
				title={t('pages.embedAuthorize.NO_OPENER_TITLE')}
				text={t('pages.embedAuthorize.NO_OPENER_TEXT')}
			/>
		);
	}
	if (!accessToken) {
		return <SignInFirst request={request} />;
	}
	return <Consent request={request} site={site} onOutcome={setOutcome} />;
}
