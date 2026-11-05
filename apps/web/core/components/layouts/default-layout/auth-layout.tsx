'use client';

import { Text } from '@/core/components/common/typography';
import { OutsideHeader } from '@/core/components/layouts/outside/outside-header';
import { AuthHeading } from '@/core/components/auth/kit/auth-heading';
import { useAuthPageTravel } from '@/core/components/auth/kit/use-auth-page-travel';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';
import { PropsWithChildren, ReactNode, useRef } from 'react';

import {
	APP_NAME,
	APP_LINK,
	APP_SLOGAN_TEXT,
	COMPANY_NAME,
	COMPANY_LINK,
	MAIN_PICTURE,
	MAIN_PICTURE_DARK,
	MAIN_PICTURE_DARK_SET_BY_OPERATOR,
	MAIN_PICTURE_SET_BY_OPERATOR,
	IS_DEMO_MODE,
	TERMS_LINK,
	PRIVACY_POLICY_LINK,
	BRANDING_LINKS_SET_BY_OPERATOR
} from '@/core/constants/config/constants';
import { cn } from '@/core/lib/helpers';
import { ACCOUNT_DELETION_PATH } from '@/core/lib/auth/account-deletion';

type Props = {
	title?: string;
	description?: string | ReactNode;
	/** False renders the children straight on the canvas, without the stage (the 404 card). */
	isAuthPage?: boolean;
	headerLinkPrompt?: string;
	headerLinkText?: string;
	headerLinkHref?: string;
	aside?: ReactNode;
	/** A wider form column, for the demo accounts beside the password form. */
	wide?: boolean;
	/** Footer link to the public account deletion request (/delete-account), for people who cannot sign in. */
	showDeleteAccountLink?: boolean;
	/**
	 * Hides the language switcher. Switching navigates to another locale route, which remounts the page: the account
	 * deletion confirm page would lose the e-mailed token it holds in memory (it is no longer in the address bar).
	 */
	hideLanguageSwitcher?: boolean;
	/**
	 * Links the footer only to the branding links the operator set, never to the built-in Ever defaults: for the
	 * pages added after the egress audit's UI baseline (tools/egress-audit/ui-baseline.json), which may only shrink.
	 */
	operatorLinksOnly?: boolean;
} & PropsWithChildren;

const LEGAL_LINK =
	'rounded-sm underline-offset-4 outline-none transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25';

const SWITCH_LINK =
	'rounded-sm font-medium text-primary-ink underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/25';

/** The dark picture: the operator's own, or their light one when they set only that. */
function darkPictureOf() {
	if (MAIN_PICTURE_DARK_SET_BY_OPERATOR) {
		return MAIN_PICTURE_DARK;
	}
	return MAIN_PICTURE;
}

/** No priority preload: only the picture of the current theme shows. */
function OperatorPicture({ alt }: Readonly<{ alt: string }>) {
	const darkPicture = darkPictureOf();
	return (
		<>
			<Image src={MAIN_PICTURE} alt={alt} fill sizes="40vw" className="object-cover dark:hidden" />
			<Image src={darkPicture} alt={alt} fill sizes="40vw" className="hidden object-cover dark:block" />
		</>
	);
}

function trayWidthOf(hasAside: boolean, wide: boolean) {
	if (hasAside) {
		return 'sm:max-w-[29rem] lg:max-w-[65rem]';
	}
	if (wide) {
		return 'sm:max-w-[49rem]';
	}
	return 'sm:max-w-[29rem]';
}

function stageGridOf(hasAside: boolean) {
	if (hasAside) {
		return 'lg:grid lg:grid-cols-[minmax(0,27rem)_minmax(0,1fr)]';
	}
	return undefined;
}

/** With a scene the stage keeps one height, so a step change never moves the frame; alone it fits its content. */
function columnHeightOf(hasAside: boolean) {
	if (hasAside) {
		return 'lg:min-h-[36rem]';
	}
	return undefined;
}

function columnWidthOf(wide: boolean) {
	if (wide) {
		return 'max-w-2xl';
	}
	return 'max-w-[22rem]';
}

/** A footer link, or the bare text when the deployment turned it off or the page may only link to the operator's. */
function linkAllowed(link: string, setByOperator: boolean, operatorLinksOnly: boolean) {
	if (!operatorLinksOnly) {
		return link;
	}
	if (setByOperator) {
		return link;
	}
	return '';
}

export function AuthLayout({
	children,
	title,
	description,
	isAuthPage = true,
	headerLinkPrompt,
	headerLinkText,
	headerLinkHref,
	aside,
	wide = false,
	showDeleteAccountLink = false,
	hideLanguageSwitcher = false,
	operatorLinksOnly = false
}: Props) {
	const t = useTranslations();
	const frameRef = useRef<HTMLDivElement>(null);
	const formRef = useRef<HTMLDivElement>(null);
	const sceneRef = useRef<HTMLElement>(null);
	useAuthPageTravel({ frameRef, formRef, sceneRef });
	const appLink = linkAllowed(APP_LINK, BRANDING_LINKS_SET_BY_OPERATOR.app, operatorLinksOnly);
	const companyLink = linkAllowed(COMPANY_LINK, BRANDING_LINKS_SET_BY_OPERATOR.company, operatorLinksOnly);
	const termsLink = linkAllowed(TERMS_LINK, BRANDING_LINKS_SET_BY_OPERATOR.terms, operatorLinksOnly);
	const privacyPolicyLink = linkAllowed(
		PRIVACY_POLICY_LINK,
		BRANDING_LINKS_SET_BY_OPERATOR.privacy,
		operatorLinksOnly
	);

	const showsOperatorPicture = MAIN_PICTURE_SET_BY_OPERATOR && !IS_DEMO_MODE;
	const hasScene = Boolean(aside) && !IS_DEMO_MODE;
	const hasAside = showsOperatorPicture || hasScene;
	const hasHeading = Boolean(title || description);
	const showsHeading = isAuthPage && hasHeading;
	const hasSwitchLink = Boolean(headerLinkText && headerLinkHref);
	const linksApp = Boolean(APP_NAME && appLink);
	const linksCompany = Boolean(COMPANY_NAME && companyLink);
	const hasLegalLinks = Boolean(termsLink || privacyPolicyLink);
	const showsLegalSeparator = Boolean(termsLink && privacyPolicyLink);
	const trayWidth = trayWidthOf(hasAside, wide);
	const stageGrid = stageGridOf(hasAside);
	const columnWidth = columnWidthOf(wide);
	const columnHeight = columnHeightOf(hasAside);
	const pictureAlt = t('TITLE', { appName: APP_NAME });
	const year = new Date().getFullYear();

	return (
		<div className="flex min-h-dvh flex-col bg-card text-foreground scheme-light selection:bg-foreground/10 selection:text-foreground sm:bg-sidebar dark:scheme-dark">
			<OutsideHeader hideLanguageSwitcher={hideLanguageSwitcher} />

			<main className="flex flex-1 flex-col items-center justify-center sm:px-4 sm:py-6">
				{!isAuthPage && (
					<div className="flex w-full flex-1 flex-col items-center justify-center px-4">{children}</div>
				)}

				{isAuthPage && (
					<div
						ref={frameRef}
						className={cn(
							'flex w-full flex-col sm:rounded-[22px] sm:bg-foreground/[0.035] sm:p-1.5',
							trayWidth
						)}
					>
						<div
							className={cn(
								'w-full sm:rounded-2xl sm:bg-card sm:hairline-ring sm:ring-border sm:shadow-md sm:shadow-black/6.5',
								stageGrid
							)}
						>
							<div
								className={cn('flex flex-col justify-center px-5 py-8 sm:px-10 sm:py-10', columnHeight)}
							>
								<div ref={formRef} className={cn('mx-auto flex w-full flex-col', columnWidth)}>
									{showsHeading && (
										<AuthHeading title={title} description={description} className="mb-8" />
									)}
									{children}
								</div>
							</div>
							{hasAside && (
								<aside
									ref={sceneRef}
									aria-hidden="true"
									className="relative m-2 ml-0 hidden overflow-hidden rounded-[14px] bg-foreground/[0.03] lg:block dark:bg-foreground/[0.025]"
								>
									{showsOperatorPicture && <OperatorPicture alt={pictureAlt} />}
									{!showsOperatorPicture && aside}
								</aside>
							)}
						</div>
						{hasSwitchLink && (
							<p className="px-5 py-4 text-center text-[13px] text-muted-foreground sm:px-4 sm:pt-3 sm:pb-2">
								{headerLinkPrompt && <span>{headerLinkPrompt} </span>}
								<Link href={headerLinkHref ?? '/'} className={SWITCH_LINK}>
									{headerLinkText}
								</Link>
							</p>
						)}
					</div>
				)}
			</main>

			<footer className="flex flex-col items-center gap-1.5 px-5 pt-4 pb-6 text-center text-xs text-muted-foreground">
				{APP_SLOGAN_TEXT && <span className="text-foreground/70">{APP_SLOGAN_TEXT}</span>}
				<p className="leading-4">
					{t('layout.footer.COPY_RIGHT1', { date: year })}{' '}
					{linksApp && (
						<Text.Link className={cn(LEGAL_LINK, 'hover:underline')} href={appLink}>
							{APP_NAME}
						</Text.Link>
					)}
					{!linksApp && <span>{APP_NAME}</span>} {t('layout.footer.BY')}{' '}
					{linksCompany && (
						<Text.Link className={cn(LEGAL_LINK, 'hover:underline')} href={companyLink}>
							{COMPANY_NAME}
						</Text.Link>
					)}
					{!linksCompany && <span>{COMPANY_NAME}</span>} {t('layout.footer.RIGHTS_RESERVED')}
				</p>

				{hasLegalLinks && (
					<p>
						{termsLink && (
							<a className={cn(LEGAL_LINK, 'underline')} href={termsLink}>
								{t('pages.auth.TERMS_OF_SERVICE')}
							</a>
						)}
						{showsLegalSeparator && ' · '}
						{privacyPolicyLink && (
							<Link
								target="_blank"
								className={cn(LEGAL_LINK, 'underline')}
								href={privacyPolicyLink}
								rel="noreferrer"
							>
								{t('pages.auth.PRIVACY_POLICY')}
							</Link>
						)}
					</p>
				)}

				{showDeleteAccountLink && (
					<p>
						<Link
							href={ACCOUNT_DELETION_PATH}
							className={cn(LEGAL_LINK, 'underline')}
							data-testid="auth-delete-account-link"
						>
							{t('pages.accountDeletion.DELETE_BY_EMAIL_LINK')}
						</Link>
					</p>
				)}
			</footer>
		</div>
	);
}
