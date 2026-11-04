'use client';

import { ReactNode, useId, useState } from 'react';
import dynamic from 'next/dynamic';
import { type DottedLanguageObjectStringPaths, useLocale, useTranslations } from 'next-intl';
import { AnimatedHeight } from '@/core/components/common/animated-height';
import { badgeVariants } from '@/core/components/common/badge';
import { Notice } from '@/core/components/common/notice';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/core/components/common/select';
import { Button } from '@/core/components/duplicated-components/_button';
import { Alert, ArrowUpRight, ChevronDown } from '@/core/components/icons';
import { DangerRow } from '@/core/components/settings/kit/danger';
import { InlineTextRow } from '@/core/components/settings/kit/inline-text-row';
import {
	SETTINGS_ROW_DESCRIPTION,
	SETTINGS_ROW_LABEL,
	SettingsRow,
	SettingsSection,
	SettingsSurface
} from '@/core/components/settings/kit/settings-page';
import { SwitchRow } from '@/core/components/settings/kit/settings-switch';
import type { GithubIntegrationSettings } from '@/core/hooks/settings/use-github-integration-settings';
import { cn } from '@/core/lib/helpers';
import { errorReasonKeyOf } from '@/core/lib/utils/error-feedback';
import { formatInstallDay, repositoryLabelOfId } from '@/core/lib/utils/settings-integrations';
import { GithubProviderRowSkeleton, GithubTile, PROVIDER_ROW } from './integrations-settings-skeleton';

const GithubRemoveDialog = dynamic(
	() => import('./github-remove-dialog').then((mod) => ({ default: mod.GithubRemoveDialog })),
	{ ssr: false, loading: () => null }
);

type GithubProps = Readonly<{ github: GithubIntegrationSettings }>;

type GithubWithRemoveProps = Readonly<{ github: GithubIntegrationSettings; onRemove: () => void }>;

const ROW_DIVIDER = 'hairline-t';

const HEADER_BUTTON = cn(
	PROVIDER_ROW,
	'cursor-pointer outline-none transition-colors hover:bg-foreground/[0.025] focus-visible:bg-foreground/[0.025] focus-visible:inset-ring-2 focus-visible:inset-ring-ring/40'
);

function ManageOnGithubLink({ href }: Readonly<{ href: string }>) {
	const t = useTranslations();
	return (
		<Button asChild variant="ghost" size="sm" className="shrink-0 text-muted-foreground">
			<a href={href} target="_blank" rel="noopener noreferrer">
				{t('settings.integrations.github.MANAGE_ON_GITHUB')}
				<ArrowUpRight className="size-3.5" />
			</a>
		</Button>
	);
}

function GithubInstallRow({ installUrl }: Readonly<{ installUrl: string }>) {
	const t = useTranslations();
	const noteId = useId();
	const canInstall = Boolean(installUrl);
	let note = t('settings.integrations.github.INSTALL_NOTE');
	if (!canInstall) {
		note = t('settings.integrations.github.INSTALL_UNAVAILABLE');
	}

	return (
		<div className={PROVIDER_ROW}>
			<GithubTile />
			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				<span className={SETTINGS_ROW_LABEL}>{t('pages.settingsTeam.GITHUB')}</span>
				<span id={noteId} className={SETTINGS_ROW_DESCRIPTION}>
					{note}
				</span>
			</div>
			{canInstall && (
				<Button asChild className="shrink-0">
					<a href={installUrl} aria-describedby={noteId}>
						{t('pages.settingsTeam.INSTALL')}
					</a>
				</Button>
			)}
			{!canInstall && (
				<Button type="button" disabled aria-describedby={noteId} className="shrink-0">
					{t('pages.settingsTeam.INSTALL')}
				</Button>
			)}
		</div>
	);
}

function GithubStateChip({ isSuspended }: Readonly<{ isSuspended: boolean }>) {
	const t = useTranslations();
	if (isSuspended) {
		return (
			<span className={badgeVariants({ variant: 'warning' })}>
				{t('settings.integrations.github.STATE_SUSPENDED')}
			</span>
		);
	}
	return (
		<span className={badgeVariants({ variant: 'success' })}>
			{t('settings.integrations.github.STATE_CONNECTED')}
		</span>
	);
}

function FactRow({ label, value }: Readonly<{ label: string; value: string }>) {
	return (
		<>
			<dt className="text-xs leading-5 text-muted-foreground">{label}</dt>
			<dd className="min-w-0 truncate text-[13px] leading-5 text-foreground">{value}</dd>
		</>
	);
}

function GithubFacts({ github }: GithubProps) {
	const t = useTranslations();
	const locale = useLocale();
	const { facts, project, repositoryCount } = github;

	return (
		<div className={cn(ROW_DIVIDER, 'flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start sm:justify-between')}>
			<dl className="grid min-w-0 grid-cols-[minmax(0,7.5rem)_minmax(0,1fr)] gap-x-4 gap-y-1.5">
				{facts.account && (
					<FactRow label={t('settings.integrations.github.FACT_ACCOUNT')} value={facts.account} />
				)}
				{facts.installedAt && (
					<FactRow
						label={t('settings.integrations.github.FACT_INSTALLED')}
						value={formatInstallDay(facts.installedAt, locale)}
					/>
				)}
				<FactRow
					label={t('settings.integrations.github.FACT_REPOSITORIES')}
					value={t('settings.integrations.github.FACT_REPOSITORIES_VALUE', { count: repositoryCount })}
				/>
				{project && <FactRow label={t('settings.integrations.github.FACT_PROJECT')} value={project.name} />}
			</dl>
			{facts.manageUrl && <ManageOnGithubLink href={facts.manageUrl} />}
		</div>
	);
}

function SuspendedNote({ github }: GithubProps) {
	const t = useTranslations();
	const locale = useLocale();
	const suspendedAt = github.facts.suspendedAt;
	let sentence = t('settings.integrations.github.SUSPENDED_NOTE_NO_DATE');
	if (suspendedAt) {
		sentence = t('settings.integrations.github.SUSPENDED_NOTE', { date: formatInstallDay(suspendedAt, locale) });
	}

	return (
		<div className={cn(ROW_DIVIDER, 'flex items-start gap-2.5 px-4 py-3')}>
			<Alert className="mt-0.5 size-4 shrink-0 text-warning-foreground" />
			<p className="min-w-0 flex-1 text-[13px] text-pretty text-foreground">{sentence}</p>
		</div>
	);
}

function MutedRow({ children }: Readonly<{ children: ReactNode }>) {
	return (
		<div className={cn(ROW_DIVIDER, 'px-4 py-3')}>
			<p className="text-[13px] text-pretty text-muted-foreground">{children}</p>
		</div>
	);
}

function RepositoryRow({ github }: GithubProps) {
	const t = useTranslations();
	const selectId = useId();
	const { settings, project, repositoryOptions, pending } = github;
	const linkedId = settings.linkedRepositoryId;
	const linkedLabel = repositoryLabelOfId(repositoryOptions, linkedId);
	const projectName = project?.name ?? '';
	let description = t('settings.integrations.github.REPOSITORY_DESCRIPTION_EMPTY', { project: projectName });
	if (linkedId) {
		description = t('settings.integrations.github.REPOSITORY_DESCRIPTION_LINKED', { project: projectName });
	}

	return (
		<SettingsRow
			className={ROW_DIVIDER}
			label={t('settings.integrations.github.REPOSITORY_LABEL')}
			description={description}
			htmlFor={selectId}
			controlClassName="w-full sm:w-auto"
		>
			<Select value={linkedId ?? ''} onValueChange={github.linkRepository} disabled={pending.repository}>
				<SelectTrigger
					id={selectId}
					aria-busy={pending.repository || undefined}
					className="h-8 w-full min-w-0 text-[13px] sm:w-60"
				>
					<SelectValue placeholder={t('settings.integrations.github.REPOSITORY_PLACEHOLDER')} />
				</SelectTrigger>
				<SelectContent align="end" className="max-h-72 w-72 overflow-y-auto p-1">
					<SelectGroup>
						{repositoryOptions.map((option) => (
							<SelectItem
								key={option.value}
								value={option.value}
								textValue={option.label}
								className="text-[13px]"
							>
								{option.label}
							</SelectItem>
						))}
					</SelectGroup>
				</SelectContent>
			</Select>
			{linkedId && (
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={github.unlinkRepository}
					disabled={pending.repository}
					aria-label={t('settings.integrations.github.UNLINK_REPOSITORY', { repository: linkedLabel })}
					className="shrink-0"
				>
					{t('settings.integrations.github.UNLINK')}
				</Button>
			)}
		</SettingsRow>
	);
}

/** Gauzy ignores each sync option until the one it depends on is on. */
function SyncRows({ github }: GithubProps) {
	const t = useTranslations();
	const autoSyncId = useId();
	const labelSyncId = useId();
	const { settings, pending } = github;

	return (
		<>
			<div className={ROW_DIVIDER}>
				<SwitchRow
					id={autoSyncId}
					label={t('settings.integrations.github.AUTO_SYNC_LABEL')}
					description={t('settings.integrations.github.AUTO_SYNC_DESCRIPTION')}
					checked={settings.isTasksAutoSync}
					onCheckedChange={github.setAutoSync}
					pending={pending.autoSync}
				/>
			</div>
			<AnimatedHeight>
				{settings.isTasksAutoSync && (
					<div>
						<div className={ROW_DIVIDER}>
							<SwitchRow
								id={labelSyncId}
								label={t('settings.integrations.github.LABEL_SYNC_LABEL')}
								description={t('settings.integrations.github.LABEL_SYNC_DESCRIPTION')}
								checked={settings.isTasksAutoSyncOnLabel}
								onCheckedChange={github.setLabelSync}
								pending={pending.labelSync}
							/>
						</div>
						{settings.isTasksAutoSyncOnLabel && (
							<div className={ROW_DIVIDER}>
								<InlineTextRow
									label={t('settings.integrations.github.SYNC_TAG_LABEL')}
									description={t('settings.integrations.github.SYNC_TAG_DESCRIPTION')}
									value={settings.syncTag}
									emptyLabel={t('settings.integrations.github.SYNC_TAG_EMPTY')}
									onSave={github.saveSyncTag}
								/>
							</div>
						)}
					</div>
				)}
			</AnimatedHeight>
		</>
	);
}

function GithubProjectRows({ github }: GithubProps) {
	const t = useTranslations();
	const hasRepositories = github.repositoryOptions.length > 0;
	const isLinked = Boolean(github.settings.linkedRepositoryId);

	if (!github.project) {
		return <MutedRow>{t('settings.integrations.github.NO_PROJECT')}</MutedRow>;
	}
	if (!hasRepositories) {
		return <MutedRow>{t('settings.integrations.github.NO_REPOSITORIES')}</MutedRow>;
	}
	return (
		<>
			<RepositoryRow github={github} />
			{isLinked && <SyncRows github={github} />}
		</>
	);
}

function GithubConnected({ github, onRemove }: GithubWithRemoveProps) {
	const t = useTranslations();
	const panelId = useId();
	const [isOpen, setIsOpen] = useState(true);
	const isSuspended = github.status === 'suspended';
	let summary = t('settings.integrations.github.SUMMARY_CONNECTED_NO_ACCOUNT');
	if (github.facts.account) {
		summary = t('settings.integrations.github.SUMMARY_CONNECTED', { account: github.facts.account });
	}

	return (
		<SettingsSurface>
			<div>
				<button
					type="button"
					className={HEADER_BUTTON}
					aria-expanded={isOpen}
					aria-controls={panelId}
					onClick={() => setIsOpen((open) => !open)}
				>
					<GithubTile />
					<span className="flex min-w-0 flex-1 flex-col gap-0.5">
						<span className={SETTINGS_ROW_LABEL}>{t('pages.settingsTeam.GITHUB')}</span>
						<span className={cn(SETTINGS_ROW_DESCRIPTION, 'truncate')}>{summary}</span>
					</span>
					<GithubStateChip isSuspended={isSuspended} />
					<ChevronDown
						aria-hidden="true"
						className={cn(
							'size-4 shrink-0 text-muted-foreground transition-transform duration-200',
							isOpen && 'rotate-180'
						)}
					/>
				</button>
				<div id={panelId}>
					<AnimatedHeight>
						{isOpen && (
							<div>
								{isSuspended && <SuspendedNote github={github} />}
								<GithubFacts github={github} />
								<GithubProjectRows github={github} />
								<div className={ROW_DIVIDER}>
									<DangerRow
										label={t('settings.integrations.github.REMOVE_LABEL')}
										consequence={t('settings.integrations.github.REMOVE_CONSEQUENCE')}
										actionLabel={t('common.REMOVE')}
										onAction={onRemove}
									/>
								</div>
							</div>
						)}
					</AnimatedHeight>
				</div>
			</div>
		</SettingsSurface>
	);
}

function RetryButton({ github }: GithubProps) {
	const t = useTranslations();
	return (
		<Button type="button" variant="outline" onClick={github.retry} disabled={github.isRetrying}>
			{t('notifications.RETRY')}
		</Button>
	);
}

function GithubLoadError({ github }: GithubProps) {
	const t = useTranslations();
	const reasonKey = errorReasonKeyOf(github.readError) as DottedLanguageObjectStringPaths;
	return (
		<Notice
			tone="error"
			title={t('settings.integrations.github.LOAD_ERROR_TITLE')}
			description={t(reasonKey)}
			actions={<RetryButton github={github} />}
		/>
	);
}

function GithubUnreachable({ github, onRemove }: GithubWithRemoveProps) {
	const t = useTranslations();
	return (
		<Notice
			tone="error"
			title={t('settings.integrations.github.GITHUB_ERROR_TITLE')}
			description={t('settings.integrations.github.GITHUB_ERROR_HINT')}
			actions={
				<>
					<RetryButton github={github} />
					<Button type="button" variant="ghost" onClick={onRemove} className="text-destructive-ink">
						{t('settings.integrations.github.REMOVE_LABEL')}
					</Button>
				</>
			}
		/>
	);
}

function GithubProviderBody({ github, onRemove }: GithubWithRemoveProps) {
	if (github.status === 'loading') {
		return (
			<SettingsSurface>
				<GithubProviderRowSkeleton />
			</SettingsSurface>
		);
	}
	if (github.status === 'loadError') {
		return <GithubLoadError github={github} />;
	}
	if (github.status === 'githubError') {
		return <GithubUnreachable github={github} onRemove={onRemove} />;
	}
	if (github.status === 'notConnected') {
		return (
			<SettingsSurface>
				<GithubInstallRow installUrl={github.installUrl} />
			</SettingsSurface>
		);
	}
	return <GithubConnected github={github} onRemove={onRemove} />;
}

export function GithubProviderSection({ github }: GithubProps) {
	const t = useTranslations();
	const [isRemoveOpen, setIsRemoveOpen] = useState(false);

	return (
		<SettingsSection
			id="github"
			title={t('settings.integrations.APPS_TITLE')}
			description={t('settings.integrations.APPS_DESCRIPTION')}
		>
			<GithubProviderBody github={github} onRemove={() => setIsRemoveOpen(true)} />
			{isRemoveOpen && (
				<GithubRemoveDialog
					open={isRemoveOpen}
					account={github.facts.account}
					onClose={() => setIsRemoveOpen(false)}
					onConfirm={github.removeIntegration}
				/>
			)}
		</SettingsSection>
	);
}
