'use client';

import { type ReactNode, useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { PageLayout } from '@/core/components/layouts/default-layout';
import { Breadcrumb } from '@/core/components/duplicated-components/breadcrumb';
import { EverTeamsLogo } from '@/core/components/svgs';
import { Button } from '@/core/components/duplicated-components/_button';
import {
	ArrowUpRight,
	Copy,
	Desktop,
	Globe,
	InformationCircle,
	Layers,
	Link as LinkIcon,
	License,
	Users
} from '@/core/components/icons';
import {
	APP_LINK,
	APP_NAME,
	BRANDING_LINKS_SET_BY_OPERATOR,
	COMPANY_LINK,
	COMPANY_NAME,
	GAUZY_API_BASE_SERVER_URL,
	IS_DEMO_MODE,
	IS_DESKTOP_APP,
	PRIVACY_POLICY_LINK,
	TERMS_LINK
} from '@/core/constants/config/constants';
import { readRuntimeEnv } from '@/env-config';
import { useAppVersionQuery } from '@/core/hooks/common/use-app-version-query';
import {
	EVER_GAUZY_REPOSITORY_URL,
	EVER_TEAMS_REPOSITORY_URL,
	getCommitUrl,
	getShortCommit,
	getVersionNumber,
	getWebBuildInfo
} from '@/core/lib/build-info';
import {
	type BrandingLink,
	formatAboutDetails,
	getBrandingLinks,
	getBuildKind,
	getRepositoryLinks
} from '@/core/lib/about-info';
import type { IconComponent } from '@/core/components/icons/hugeicons';
import { cn } from '@/core/lib/helpers';

const CARD = 'rounded-2xl hairline-ring ring-border bg-card';
const SECTION_TITLE = 'text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground';
const LIST_ROW =
	'flex items-center gap-3 px-5 py-3 text-sm text-foreground transition-colors hover:bg-foreground/[0.03] [&:not(:last-child)]:hairline-b border-border';
const LICENSE_URL = `${EVER_TEAMS_REPOSITORY_URL}/blob/HEAD/LICENSE`;

type ApiState = 'checking' | 'connected' | 'unreachable';
type DotTone = 'ok' | 'notice' | 'error' | 'pending';

const DOT_TONES: Record<DotTone, string> = {
	ok: 'bg-emerald-500',
	notice: 'bg-amber-400',
	error: 'bg-red-500',
	pending: 'animate-pulse bg-amber-400'
};

const API_TONES: Record<ApiState, DotTone> = { connected: 'ok', unreachable: 'error', checking: 'pending' };

const API_LABELS = {
	connected: 'pages.about.API_CONNECTED',
	unreachable: 'pages.about.API_UNREACHABLE',
	checking: 'pages.about.API_CHECKING'
} as const;

/**
 * Whether the API answered its version, failed to, or has not said yet (loading, or paused while offline):
 * "not reachable" only once a request has actually failed.
 */
function getApiState(hasVersion: boolean, hasFailed: boolean): ApiState {
	if (hasVersion) {
		return 'connected';
	}
	return hasFailed ? 'unreachable' : 'checking';
}

/** A build as one line: version and commit, each only when known (`v1.2.3 (abc1234)`, `v1.2.3`, `abc1234`). */
function formatBuild(version?: string | null, commit?: string | null): string {
	const parts = [version?.trim() ? `v${getVersionNumber(version)}` : '', commit?.trim() ? `(${commit.trim()})` : ''];
	return parts
		.filter(Boolean)
		.join(' ')
		.replace(/^((.*))$/, '$1');
}

/** The deployment name the operator gave (the Sentry environment), if any. */
function getDeploymentName(): string | null {
	const value = (
		readRuntimeEnv('NEXT_PUBLIC_SENTRY_ENVIRONMENT') || process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT
	)?.trim();
	return value || null;
}

function getLanguageName(locale: string): string {
	try {
		return new Intl.DisplayNames([locale], { type: 'language' }).of(locale) ?? locale;
	} catch {
		return locale;
	}
}

function getTimeZone(): string | null {
	try {
		return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
	} catch {
		return null;
	}
}

async function copyText(text: string, success: string, failure: string) {
	try {
		await navigator.clipboard.writeText(text);
		toast.success(success);
	} catch {
		toast.error(failure);
	}
}

const BRANDING_ICONS: Record<BrandingLink['id'], IconComponent> = {
	app: Globe,
	company: Users,
	terms: License,
	privacy: License
};

function BrandingIcon({ id }: Readonly<{ id: BrandingLink['id'] }>) {
	const Icon = BRANDING_ICONS[id];
	return <Icon className="size-4" aria-hidden="true" />;
}

function IconTile({ children, className }: Readonly<{ children: ReactNode; className?: string }>) {
	return (
		<span
			className={cn(
				'flex size-9 shrink-0 items-center justify-center rounded-xl bg-foreground/[0.05] text-muted-foreground',
				className
			)}
		>
			{children}
		</span>
	);
}

function StatusDot({ tone }: Readonly<{ tone: DotTone }>) {
	return <span aria-hidden="true" className={cn('inline-block size-2 shrink-0 rounded-full', DOT_TONES[tone])} />;
}

function CommitChip({ commit, repositoryUrl }: Readonly<{ commit: string; repositoryUrl: string }>) {
	const t = useTranslations();
	const shortCommit = getShortCommit(commit);
	const chip = 'rounded-md bg-foreground/[0.06] px-1.5 py-0.5 font-mono text-xs text-foreground';
	if (commit === 'dev') {
		return <span className={chip}>{shortCommit}</span>;
	}
	return (
		<a
			href={getCommitUrl(repositoryUrl, commit)}
			target="_blank"
			rel="noopener noreferrer"
			title={t('layout.footer.OPEN_COMMIT', { commit })}
			className={cn(chip, 'hover:bg-foreground/[0.1]')}
		>
			{shortCommit}
		</a>
	);
}

function VersionRow({
	icon,
	name,
	state,
	version,
	commit,
	repositoryUrl
}: Readonly<{
	icon: ReactNode;
	name: string;
	state: ApiState;
	version?: string | null;
	commit?: string | null;
	repositoryUrl: string;
}>) {
	const t = useTranslations();
	return (
		<li className="flex items-center gap-3 px-5 py-4 [&:not(:last-child)]:hairline-b border-border">
			<IconTile>{icon}</IconTile>
			<div className="flex min-w-0 flex-1 flex-col gap-1">
				<span className="flex items-center gap-2 text-sm font-medium text-foreground">
					<StatusDot tone={API_TONES[state]} />
					{name}
				</span>
				<span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
					{commit ? <CommitChip commit={commit} repositoryUrl={repositoryUrl} /> : null}
					{version ? <span className="font-mono">v{getVersionNumber(version)}</span> : null}
					{!commit && !version && state === 'unreachable' ? t('pages.about.API_UNREACHABLE') : null}
					{!commit && !version && state === 'checking' ? t('pages.about.API_CHECKING') : null}
				</span>
			</div>
			<a
				href={commit && commit !== 'dev' ? getCommitUrl(repositoryUrl, commit) : repositoryUrl}
				target="_blank"
				rel="noopener noreferrer"
				aria-label={t('pages.about.REPOSITORY')}
				title={t('pages.about.REPOSITORY')}
				className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground"
			>
				<LinkIcon className="size-4" aria-hidden="true" />
			</a>
		</li>
	);
}

function DetailRow({ label, children }: Readonly<{ label: string; children: ReactNode }>) {
	return (
		<div className="grid grid-cols-[minmax(7rem,10rem)_1fr] items-center gap-3 px-5 py-3 text-sm [&:not(:last-child)]:hairline-b border-border">
			<dt className="text-muted-foreground">{label}</dt>
			<dd className="min-w-0 text-foreground">{children}</dd>
		</div>
	);
}

function ExternalRow({ href, icon, children }: Readonly<{ href: string; icon: ReactNode; children: ReactNode }>) {
	return (
		<li className="contents">
			<a href={href} target="_blank" rel="noopener noreferrer" className={LIST_ROW}>
				<IconTile className="size-8 rounded-lg">{icon}</IconTile>
				<span className="min-w-0 flex-1 truncate font-medium">{children}</span>
				<ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
			</a>
		</li>
	);
}

/**
 * About: what this deployment of the app is (its name, licence and purpose), which builds of the web app and the
 * API it runs, in which environment, and where to read more or take part. Modelled on Gauzy's About page.
 */
export function AboutPage() {
	const t = useTranslations();
	const locale = useLocale();
	const webBuild = getWebBuildInfo();
	const { data: apiVersion, isError: apiFailed } = useAppVersionQuery();

	const hasApiVersion = Boolean(apiVersion?.version?.trim() || apiVersion?.commit?.trim());
	const apiState = getApiState(hasApiVersion, apiFailed);
	const apiStatusLabel = t(API_LABELS[apiState]);

	const buildKind = getBuildKind(process.env.NODE_ENV);
	const deployment = getDeploymentName();
	const apiAddress = GAUZY_API_BASE_SERVER_URL.value || '';
	const timeZone = getTimeZone();
	const languageName = getLanguageName(locale);

	const brandingLinks = useMemo(
		() =>
			getBrandingLinks({
				appLink: APP_LINK,
				companyLink: COMPANY_LINK,
				companyName: COMPANY_NAME,
				termsLink: TERMS_LINK,
				privacyLink: PRIVACY_POLICY_LINK,
				setByOperator: BRANDING_LINKS_SET_BY_OPERATOR
			}),
		[]
	);
	const repositoryLinks = useMemo(() => getRepositoryLinks(EVER_TEAMS_REPOSITORY_URL), []);

	const buildLabel = t(buildKind === 'production' ? 'pages.about.BUILD_PRODUCTION' : 'pages.about.BUILD_DEVELOPMENT');
	const modeLabel = t(IS_DEMO_MODE ? 'pages.about.MODE_DEMO' : 'pages.about.MODE_STANDARD');
	const runningInLabel = t(IS_DESKTOP_APP ? 'pages.about.RUNNING_IN_DESKTOP' : 'pages.about.RUNNING_IN_BROWSER');

	const details = formatAboutDetails(APP_NAME, [
		[t('pages.about.WEB_APP'), formatBuild(webBuild.version, webBuild.commit)],
		[t('pages.about.API'), hasApiVersion ? formatBuild(apiVersion?.version, apiVersion?.commit) : apiStatusLabel],
		[t('pages.about.BUILD'), buildLabel],
		[t('pages.about.DEPLOYMENT'), deployment],
		[t('pages.about.MODE'), modeLabel],
		[t('pages.about.RUNNING_IN'), runningInLabel],
		[t('pages.about.API_ADDRESS'), apiAddress],
		[t('pages.about.LANGUAGE'), languageName],
		[t('pages.about.TIME_ZONE'), timeZone]
	]);

	return (
		<PageLayout
			title={t('pages.about.TITLE')}
			breadcrumb={
				<div className="flex min-w-0 items-center gap-2">
					<InformationCircle className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
					<Breadcrumb paths={[t('pages.about.TITLE')]} className="min-w-0 text-sm" />
				</div>
			}
		>
			<div className="mx-auto grid w-full max-w-5xl gap-4 py-2 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
				<div className="flex min-w-0 flex-col gap-4">
					<section className={cn(CARD, 'flex flex-col gap-4 p-5')}>
						{/* The deployment's own logo (or the built-in wordmark), linking home, never to an Ever host. */}
						<EverTeamsLogo dash />
						<div className="flex min-w-0 flex-col gap-2">
							<h1 className="text-xl font-semibold text-foreground">{APP_NAME}</h1>
							<p className="text-sm leading-relaxed text-muted-foreground">
								{t('pages.about.DESCRIPTION', { appName: APP_NAME })}
							</p>
							<span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-foreground/[0.05] px-3 py-1 text-xs text-muted-foreground">
								<License className="size-3.5" aria-hidden="true" />
								{t.rich('pages.about.LICENSE', {
									license: (chunks) => (
										<a
											href={LICENSE_URL}
											target="_blank"
											rel="noopener noreferrer"
											className="font-medium text-primary hover:underline"
										>
											{chunks}
										</a>
									)
								})}
							</span>
						</div>
					</section>

					<section className={CARD} aria-labelledby="about-version-details">
						<header className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
							<h2 id="about-version-details" className={SECTION_TITLE}>
								{t('pages.about.VERSION_DETAILS')}
							</h2>
							<span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
								<StatusDot tone={API_TONES[apiState]} />
								{apiStatusLabel}
							</span>
						</header>
						<ul className="hairline-t border-border">
							<VersionRow
								icon={<Desktop className="size-4" aria-hidden="true" />}
								name={t('pages.about.WEB_APP')}
								state="connected"
								version={webBuild.version}
								commit={webBuild.commit}
								repositoryUrl={EVER_TEAMS_REPOSITORY_URL}
							/>
							<VersionRow
								icon={<Layers className="size-4" aria-hidden="true" />}
								name={t('pages.about.API')}
								state={apiState}
								version={apiVersion?.version}
								commit={apiVersion?.commit}
								repositoryUrl={EVER_GAUZY_REPOSITORY_URL}
							/>
						</ul>
					</section>

					<section className={CARD} aria-labelledby="about-environment">
						<header className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
							<h2 id="about-environment" className={SECTION_TITLE}>
								{t('pages.about.ENVIRONMENT')}
							</h2>
							<Button
								variant="ghost"
								size="sm"
								className="gap-1.5"
								onClick={() =>
									void copyText(details, t('pages.about.COPIED'), t('pages.about.COPY_FAILED'))
								}
							>
								<Copy className="size-3.5" aria-hidden="true" />
								{t('pages.about.COPY_DETAILS')}
							</Button>
						</header>
						<dl className="hairline-t border-border">
							<DetailRow label={t('pages.about.BUILD')}>
								<span className="flex items-center gap-2">
									<StatusDot tone={buildKind === 'production' ? 'ok' : 'notice'} />
									{buildLabel}
								</span>
							</DetailRow>
							{deployment && <DetailRow label={t('pages.about.DEPLOYMENT')}>{deployment}</DetailRow>}
							<DetailRow label={t('pages.about.MODE')}>{modeLabel}</DetailRow>
							<DetailRow label={t('pages.about.RUNNING_IN')}>{runningInLabel}</DetailRow>
							{apiAddress && (
								<DetailRow label={t('pages.about.API_ADDRESS')}>
									<span className="flex min-w-0 items-center gap-2">
										<code className="min-w-0 truncate rounded-md bg-foreground/[0.06] px-1.5 py-0.5 font-mono text-xs">
											{apiAddress}
										</code>
										<button
											type="button"
											aria-label={t('pages.about.COPY')}
											title={t('pages.about.COPY')}
											onClick={() =>
												void copyText(
													apiAddress,
													t('pages.about.COPIED'),
													t('pages.about.COPY_FAILED')
												)
											}
											className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground"
										>
											<Copy className="size-3.5" aria-hidden="true" />
										</button>
									</span>
								</DetailRow>
							)}
							<DetailRow label={t('pages.about.LANGUAGE')}>{languageName}</DetailRow>
							{timeZone && <DetailRow label={t('pages.about.TIME_ZONE')}>{timeZone}</DetailRow>}
						</dl>
					</section>
				</div>

				<aside className="flex min-w-0 flex-col gap-4">
					{brandingLinks.length > 0 && (
						<section className={CARD} aria-labelledby="about-learn-more">
							<h2 id="about-learn-more" className={cn(SECTION_TITLE, 'px-5 pt-4 pb-3')}>
								{t('pages.about.LEARN_MORE')}
							</h2>
							<ul className="hairline-t border-border">
								{brandingLinks.map((link) => (
									<ExternalRow key={link.id} href={link.href} icon={<BrandingIcon id={link.id} />}>
										{link.labelKey ? t(link.labelKey) : link.label}
									</ExternalRow>
								))}
							</ul>
						</section>
					)}

					<section className={CARD} aria-labelledby="about-github">
						<div className="flex flex-col gap-1 px-5 pt-4 pb-3">
							<h2 id="about-github" className={SECTION_TITLE}>
								{t('pages.about.ON_GITHUB')}
							</h2>
							<p className="text-sm text-muted-foreground">
								{t('pages.about.ON_GITHUB_DESCRIPTION', { appName: APP_NAME })}
							</p>
						</div>
						<ul className="hairline-t border-border">
							{repositoryLinks.map((link) => (
								<ExternalRow
									key={link.key}
									href={link.href}
									icon={<LinkIcon className="size-4" aria-hidden="true" />}
								>
									{t(`pages.about.${link.key}`)}
								</ExternalRow>
							))}
							<ExternalRow
								href={EVER_GAUZY_REPOSITORY_URL}
								icon={<Layers className="size-4" aria-hidden="true" />}
							>
								{t('pages.about.API_REPOSITORY')}
							</ExternalRow>
						</ul>
					</section>
				</aside>
			</div>
		</PageLayout>
	);
}
