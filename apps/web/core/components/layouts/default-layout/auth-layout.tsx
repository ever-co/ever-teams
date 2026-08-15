import { EverTeamsLogo } from '@/core/components/svgs';
import { Text, ThemeToggler } from '@/core/components';
import { LanguageDropDownWithFlags } from '@/core/components/common/language-dropdown-flags';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';
import { PropsWithChildren, ReactNode } from 'react';

import {
	APP_NAME,
	APP_LINK,
	APP_SLOGAN_TEXT,
	COMPANY_NAME,
	COMPANY_LINK,
	MAIN_PICTURE,
	MAIN_PICTURE_DARK,
	IS_DEMO_MODE,
	TERMS_LINK,
	PRIVACY_POLICY_LINK
} from '@/core/constants/config/constants';
import { cn } from '@/core/lib/helpers';

type Props = {
	title?: string;
	description?: string | ReactNode;
	isAuthPage?: boolean;
	/** Text for the top-right header link (e.g. "Sign in", "Sign up") */
	headerLinkText?: string;
	/** Href for the top-right header link */
	headerLinkHref?: string;
} & PropsWithChildren;

export function AuthLayout({ children, title, description, isAuthPage = true, headerLinkText, headerLinkHref }: Props) {
	const t = useTranslations();

	return (
		<div className="scheme-light selection:bg-foreground/10 selection:text-foreground bg-background dark:scheme-dark">
			<div className={cn('grid min-h-dvh', !IS_DEMO_MODE && 'lg:grid-cols-5')}>
				{/* Left panel - Image side (hidden in demo mode) */}
				{!IS_DEMO_MODE && (
					<div className="selection:text-blue-400! fixed inset-y-0 col-span-2 hidden w-2/5 selection:bg-black/20 lg:block">
						{/* Light mode image */}
						<div className="absolute inset-0 rounded-4xl max-w-[560px] lg:max-w-[640px]">
							<Image
								src={MAIN_PICTURE}
								alt={t('TITLE', { appName: APP_NAME })}
								priority
								fill
								className="object-scale-down md:max-w-[560px] lg:max-w-[640px] right-0 left-12 dark:hidden rounded-4xl"
								sizes="40vw"
							/>
						</div>
						{/* Dark mode image */}
						<Image
							src={MAIN_PICTURE_DARK}
							alt={t('TITLE', { appName: APP_NAME })}
							priority
							fill
							className="hidden object-scale-down md:max-w-[560px] lg:max-w-[640px] right-0 left-6 dark:block rounded-4xl"
							sizes="40vw"
						/>
						{/* Gradient overlays */}
						<div className="mask-t-from-25% mask-t-to-60% absolute inset-0 from-black/60 to-black/20 backdrop-blur-xl" />
						<div className="absolute inset-0 border-r bg-linear-to-t from-black/60 to-black/20" />
						{/* Bottom quote */}
						<div className="absolute right-12 bottom-12 left-12">
							<blockquote className="space-y-4">
								<p className="text-xl font-medium text-white text-balance">
									{t('pages.auth.COVER_TITLE')}
								</p>
								<footer className="text-sm text-white/80">{t('pages.auth.COVER_DESCRIPTION')}</footer>
							</blockquote>
						</div>
					</div>
				)}

				{/* Right panel - Content side */}
				<div className={cn('flex flex-col p-6', !IS_DEMO_MODE && 'lg:col-span-3 lg:col-start-3 lg:p-12')}>
					{/* Top bar: Logo + slogan + header link */}
					<div className="flex justify-between items-start">
						<div className="flex flex-col gap-1">
							<EverTeamsLogo dash className="h-5" />
							{APP_SLOGAN_TEXT && (
								<span className="mt-1 text-xs tracking-wide text-muted-foreground">
									{APP_SLOGAN_TEXT}
								</span>
							)}
						</div>
						{headerLinkText && headerLinkHref && (
							<Link
								href={headerLinkHref}
								className="text-sm font-medium text-muted-foreground hover:text-foreground hover:underline"
							>
								{headerLinkText}
							</Link>
						)}
					</div>

					{/* Centered content */}
					<div className={cn('m-auto w-full', IS_DEMO_MODE ? 'max-w-2xl' : 'max-w-sm')}>
						{isAuthPage && (title || description) && (
							<div className="mb-8 space-y-2  px-1.5">
								{title && <h1 className="text-2xl font-semibold">{title}</h1>}
								{description &&
									(typeof description === 'string' ? (
										<p className="text-muted-foreground">{description}</p>
									) : (
										<div className="text-muted-foreground">{description}</div>
									))}
							</div>
						)}

						{children}
					</div>

					{/* Footer */}
					<footer className="pt-6 space-y-3">
						{/* Copyright */}
						<p className="text-xs font-normal leading-4 text-center text-muted-foreground">
							{t('layout.footer.COPY_RIGHT1', { date: new Date().getFullYear() })}{' '}
							{APP_NAME && APP_LINK ? (
								<Text.Link className="hover:underline" href={APP_LINK}>
									{APP_NAME}
								</Text.Link>
							) : (
								<span>{APP_NAME}</span>
							)}{' '}
							{t('layout.footer.BY')}{' '}
							{COMPANY_NAME && COMPANY_LINK ? (
								<Text.Link className="hover:underline" href={COMPANY_LINK}>
									{COMPANY_NAME}
								</Text.Link>
							) : (
								<span>{COMPANY_NAME}</span>
							)}{' '}
							{t('layout.footer.RIGHTS_RESERVED')}
						</p>

						{/* Terms + Privacy */}
						<p className="text-xs text-center text-muted-foreground">
							<a className="underline hover:text-foreground" href={TERMS_LINK}>
								{t('pages.auth.TERMS_OF_SERVICE')}
							</a>
							{' · '}
							<Link
								target="_blank"
								className="underline hover:text-foreground"
								href={PRIVACY_POLICY_LINK}
								rel="noreferrer"
							>
								{t('pages.auth.PRIVACY_POLICY')}
							</Link>
						</p>

						{/* Language + Theme controls */}
						<div className="flex gap-3 justify-center items-center">
							<LanguageDropDownWithFlags
								showFlag
								btnClassName="bg-light--theme-dark dark:bg-[#1D222A] border-none max-w-28 text-xs"
							/>
							<ThemeToggler />
						</div>
					</footer>
				</div>
			</div>
		</div>
	);
}
