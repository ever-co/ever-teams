'use client';

import { Switch } from '@headlessui/react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { EVER_TEAMS_REPOSITORY_URL } from '@/core/lib/build-info';
import { useEverStatsLast, useEverStatsView, useSetEverStatsEnabled } from '@/core/hooks/ever-platform/use-ever-stats';
import type { IEverStatsAttempt, IEverStatsStatus } from '@/core/types/interfaces/ever-platform/ever-platform';

/** The public page that says what is sent, when and how to switch it off. */
export const EVER_STATS_DOCS_URL = `${EVER_TEAMS_REPOSITORY_URL}/blob/develop/docs/ever-platform/anonymous-usage-statistics.md`;

const prettyPayload = (payload: string): string => {
	try {
		return JSON.stringify(JSON.parse(payload), null, 2);
	} catch {
		return payload;
	}
};

function DocsLink() {
	const t = useTranslations();
	return (
		<a
			href={EVER_STATS_DOCS_URL}
			target="_blank"
			rel="noopener noreferrer"
			className="text-sm font-medium text-primary underline-offset-2 hover:underline dark:text-primary-light"
		>
			{t('pages.settingsTeam.everPlatform.STATS_DOCS_LINK')}
		</a>
	);
}

function AttemptView({ label, attempt }: Readonly<{ label: string; attempt: IEverStatsAttempt }>) {
	const t = useTranslations();
	return (
		<div className="flex flex-col gap-2" data-testid="ever-stats-last-payload">
			<p className="text-xs text-muted-foreground">
				{label} · {t('pages.settingsTeam.everPlatform.STATS_SENT_AT')}: {attempt.sent_at ?? '-'} ·{' '}
				{t('pages.settingsTeam.everPlatform.STATS_HTTP_STATUS')}: {attempt.http_status ?? attempt.outcome ?? '-'}
			</p>
			<pre className="max-h-80 overflow-auto rounded-md border bg-muted/40 p-3 text-xs dark:border-white/10">
				{prettyPayload(attempt.payload)}
			</pre>
		</div>
	);
}

function LastReports() {
	const t = useTranslations();
	const last = useEverStatsLast(true);
	if (last.isLoading) return <p className="text-xs">{t('common.LOADING')}</p>;
	const teams = last.data?.teams.last[0];
	const api = last.data?.api;
	if (!teams && !api) {
		return <p className="text-xs">{t('pages.settingsTeam.everPlatform.STATS_NO_PAYLOAD')}</p>;
	}
	return (
		<div className="flex flex-col gap-4">
			{teams ? <AttemptView label={t('pages.settingsTeam.everPlatform.STATS_WEB_APP')} attempt={teams} /> : null}
			{api ? <AttemptView label={t('pages.settingsTeam.everPlatform.STATS_API')} attempt={api} /> : null}
		</div>
	);
}

/** Why nothing is sent, as the paired API says it. */
function ReasonText({ reason }: Readonly<{ reason: string | null }>) {
	const t = useTranslations();
	if (reason === 'ui') return <> · {t('pages.settingsTeam.everPlatform.STATS_REASON_UI')}</>;
	if (reason === 'config') return <> · {t('pages.settingsTeam.everPlatform.STATS_REASON_CONFIG')}</>;
	if (reason === 'key_unreadable') return <> · {t('pages.settingsTeam.everPlatform.STATS_REASON_KEY')}</>;
	return null;
}

function OperatorView({ status }: Readonly<{ status: IEverStatsStatus }>) {
	const t = useTranslations();
	const setEnabled = useSetEverStatsEnabled();
	const [showLast, setShowLast] = useState(false);
	const enabled = setEnabled.isPending && setEnabled.variables !== undefined ? setEnabled.variables : status.enabled;

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center justify-between gap-4">
				<div className="flex flex-col">
					<span className="font-medium text-foreground">
						{t('pages.settingsTeam.everPlatform.STATS_TOGGLE_LABEL')}
					</span>
					<span className="text-xs" data-testid="ever-stats-state">
						{enabled ? t('pages.settingsTeam.everPlatform.STATS_ON') : t('pages.settingsTeam.everPlatform.STATS_OFF')}
						<ReasonText reason={status.reason} />
					</span>
				</div>
				<Switch
					checked={enabled}
					disabled={setEnabled.isPending}
					onChange={(next: boolean) => setEnabled.mutate(next)}
					data-testid="ever-stats-toggle"
					className={`${enabled ? 'bg-primary dark:bg-primary-light' : 'bg-[#80808061]'}
						relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60`}
				>
					<span className="sr-only">{t('pages.settingsTeam.everPlatform.STATS_TOGGLE_LABEL')}</span>
					<span
						aria-hidden="true"
						className={`${enabled ? 'translate-x-5' : 'translate-x-0'}
							pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
					/>
				</Switch>
			</div>
			{setEnabled.isError ? (
				<p className="text-xs text-destructive">{t('pages.settingsTeam.everPlatform.STATS_TOGGLE_ERROR')}</p>
			) : null}
			<dl className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
				<div>
					<dt className="text-muted-foreground">{t('pages.settingsTeam.everPlatform.STATS_NEXT_SEND')}</dt>
					<dd>{status.next_send_at ?? '-'}</dd>
				</div>
				<div>
					<dt className="text-muted-foreground">{t('pages.settingsTeam.everPlatform.STATS_WEB_APP')}</dt>
					<dd data-testid="ever-stats-web-reporter">
						{status.teams.reporter}
						{status.teams.next_send_at ? ` · ${status.teams.next_send_at}` : ''}
					</dd>
				</div>
			</dl>
			<div className="flex flex-wrap items-center gap-4">
				<button
					type="button"
					className="text-sm font-medium text-primary underline-offset-2 hover:underline dark:text-primary-light"
					onClick={() => setShowLast((value) => !value)}
				>
					{t('pages.settingsTeam.everPlatform.STATS_LAST_PAYLOAD')}
				</button>
				<DocsLink />
			</div>
			{showLast ? <LastReports /> : null}
		</div>
	);
}

/**
 * The anonymous usage statistics of this installation: the operator's switch (stored in the paired
 * API), what the next report is and the exact bytes of the last ones. Everyone else reads who manages
 * them and where what is sent is documented. Nothing renders when this web app runs without its
 * statistics module.
 */
export function EverStatsCard() {
	const t = useTranslations();
	const view = useEverStatsView(true);
	if (!view.data || view.data.kind === 'off') return null;

	return (
		<section className="flex flex-col gap-3" data-testid="ever-stats-card">
			<div className="flex flex-col gap-1">
				<h3 className="text-base font-semibold text-foreground">
					{t('pages.settingsTeam.everPlatform.STATS_TITLE')}
				</h3>
				<p className="text-sm">{t('pages.settingsTeam.everPlatform.STATS_DESCRIPTION')}</p>
			</div>
			{view.data.kind === 'operator' ? (
				<OperatorView status={view.data.status} />
			) : (
				<div className="flex flex-col gap-2" data-testid="ever-stats-managed">
					<p className="text-sm font-medium">
						{view.data.managedBy === 'ever_cloud'
							? t('pages.settingsTeam.everPlatform.STATS_MANAGED_CLOUD')
							: t('pages.settingsTeam.everPlatform.STATS_MANAGED_OPERATOR')}
					</p>
					<DocsLink />
				</div>
			)}
		</section>
	);
}
