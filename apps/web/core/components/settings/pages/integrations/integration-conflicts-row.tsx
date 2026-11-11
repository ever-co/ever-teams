'use client';

import { useState } from 'react';
import Link from 'next/link';
import { type DottedLanguageObjectStringPaths, useLocale, useTranslations } from 'next-intl';
import { badgeVariants } from '@/core/components/common/badge';
import { Notice } from '@/core/components/common/notice';
import { Button } from '@/core/components/duplicated-components/_button';
import { SETTINGS_ROW_DESCRIPTION, SETTINGS_ROW_LABEL } from '@/core/components/settings/kit/settings-page';
import {
	type IntegrationConflicts,
	useIntegrationConflicts
} from '@/core/hooks/integrations/use-integration-conflicts';
import { errorReasonKeyOf } from '@/core/lib/utils/error-feedback';
import { conflictValueView, type ConflictValueView } from '@/core/lib/utils/integration-sync-conflicts';
import type {
	IIntegrationSyncConflict,
	TIntegrationConflictProvider,
	TIntegrationConflictStatus
} from '@/core/types/interfaces/integrations/integration-sync-conflict';

const KEYS = 'settings.integrations.conflicts';
const STATUSES: readonly TIntegrationConflictStatus[] = ['open', 'resolved'];

type Key = DottedLanguageObjectStringPaths;

function formatInstant(date: Date, locale: string): string {
	return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function ConflictValue({ label, view }: Readonly<{ label: string; view: ConflictValueView }>) {
	const t = useTranslations();
	const locale = useLocale();
	// A cut value is shown whole on request: a tooltip alone reaches neither touch nor keyboard users.
	const [isExpanded, setIsExpanded] = useState(false);
	const isCut = view.full !== view.text;
	let value;
	if (view.empty) value = <em className="text-muted-foreground">{t(`${KEYS}.EMPTY_VALUE` as Key)}</em>;
	// A calendar date (stored as UTC midnight) is shown as that day wherever the reader is.
	else if (view.date)
		value = new Intl.DateTimeFormat(locale, {
			dateStyle: 'medium',
			...(view.calendarDay ? { timeZone: 'UTC' } : {})
		}).format(view.date);
	else value = <span className="whitespace-pre-wrap">{isExpanded ? view.full : view.text}</span>;
	return (
		<div className="min-w-0">
			<dt className="text-xs leading-5 text-muted-foreground">{label}</dt>
			<dd className="min-w-0 break-words text-[13px] leading-5 text-foreground" title={view.full || undefined}>
				{value}
				{!view.empty && !view.date && isCut && (
					<Button
						type="button"
						variant="link"
						size="sm"
						className="ml-1 h-auto px-0"
						aria-expanded={isExpanded}
						onClick={() => setIsExpanded((open) => !open)}
					>
						{t(`${KEYS}.${isExpanded ? 'SHOW_LESS' : 'SHOW_FULL'}` as Key)}
					</Button>
				)}
			</dd>
		</div>
	);
}

function ConflictLine({
	conflict,
	providerName,
	list
}: Readonly<{ conflict: IIntegrationSyncConflict; providerName: string; list: IntegrationConflicts }>) {
	const t = useTranslations();
	const locale = useLocale();
	const title = list.titleOf(conflict);
	const found = conflict.createdAt ? formatInstant(new Date(conflict.createdAt), locale) : '';
	const isOpen = conflict.status === 'open';
	const busy = list.resolvingId !== null;
	return (
		<li
			className="flex flex-col gap-2 py-2.5"
			data-testid={`conflict-${conflict.id}`}
			aria-busy={list.resolvingId === conflict.id || undefined}
		>
			<div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[13px]">
				<Link
					href={`/task/${encodeURIComponent(conflict.taskId)}`}
					className="min-w-0 truncate font-medium text-foreground underline-offset-4 hover:underline"
				>
					{title ?? `${t(`${KEYS}.OPEN_TASK` as Key)} · ${conflict.taskId.slice(0, 8)}`}
				</Link>
				<span className={badgeVariants({ variant: 'outline' })}>
					{t(`${KEYS}.FIELD_${conflict.field}` as Key)}
				</span>
				<span className="text-xs text-muted-foreground">
					{t(`${KEYS}.ITEM` as Key, { provider: providerName, id: conflict.sourceId })}
				</span>
				{found && (
					<span className="text-xs text-muted-foreground">{t(`${KEYS}.FOUND` as Key, { when: found })}</span>
				)}
			</div>
			<dl className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
				<ConflictValue
					label={t(`${KEYS}.TASK_VALUE` as Key)}
					view={conflictValueView(conflict.field, conflict.platformValue)}
				/>
				<ConflictValue
					label={t(`${KEYS}.PROVIDER_VALUE` as Key, { provider: providerName })}
					view={conflictValueView(conflict.field, conflict.externalValue)}
				/>
			</dl>
			{isOpen ? (
				<div className="flex flex-wrap gap-2">
					<Button
						type="button"
						variant="outline"
						size="sm"
						disabled={busy}
						onClick={() => void list.resolve(conflict.id, 'external')}
					>
						{t(`${KEYS}.KEEP_PROVIDER` as Key, { provider: providerName })}
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						disabled={busy}
						onClick={() => void list.resolve(conflict.id, 'platform')}
					>
						{t(`${KEYS}.KEEP_TASK` as Key)}
					</Button>
				</div>
			) : (
				<p className="text-xs text-muted-foreground">
					{conflict.resolution
						? t(`${KEYS}.RESOLVED_${conflict.resolution}` as Key, { provider: providerName })
						: null}
					{conflict.resolvedAt ? ` · ${formatInstant(new Date(conflict.resolvedAt), locale)}` : null}
				</p>
			)}
		</li>
	);
}

function ResolveFeedback({ list, providerName }: Readonly<{ list: IntegrationConflicts; providerName: string }>) {
	const t = useTranslations();
	if (list.resolveError) {
		const { refusal, error } = list.resolveError;
		const description =
			refusal === 'stale'
				? t(`${KEYS}.ERROR_STALE` as Key, { provider: providerName })
				: refusal === 'notFound'
					? t(`${KEYS}.ERROR_NOT_FOUND` as Key)
					: t(errorReasonKeyOf(error) as Key);
		return (
			<Notice
				tone="error"
				title={t(`${KEYS}.ERROR_TITLE` as Key)}
				description={description}
				onDismiss={list.clearFeedback}
				dismissLabel={t('common.CLOSE')}
			/>
		);
	}
	if (list.resolved) {
		const title = list.resolved === 'platform' ? t(`${KEYS}.KEPT_TASK` as Key) : t(`${KEYS}.KEPT_PROVIDER` as Key);
		return <Notice tone="success" title={title} onDismiss={list.clearFeedback} dismissLabel={t('common.CLOSE')} />;
	}
	return null;
}

export interface IntegrationConflictsRowProps {
	provider: TIntegrationConflictProvider;
	/** The provider's name as the page shows it (Linear, Asana, Trello). */
	providerName: string;
	integrationId: string;
	/** Only what this run found (a run's count in the runs list sets it); null: every run. */
	runId: string | null;
	onClearRun: () => void;
}

/**
 * The sync conflicts of a connection, in its settings panel: fields changed both in the provider and here since they
 * last agreed. The provider's value was applied to the task and the task's is kept; each conflict is resolved by
 * keeping the provider's value or restoring the task's. Open ones by default, resolved ones on request.
 */
export function IntegrationConflictsRow({
	provider,
	providerName,
	integrationId,
	runId,
	onClearRun
}: Readonly<IntegrationConflictsRowProps>) {
	const t = useTranslations();
	const [status, setStatus] = useState<TIntegrationConflictStatus>('open');
	const list = useIntegrationConflicts({ provider, integrationId, status, runId });

	let body;
	if (list.readError) {
		body = (
			<Notice
				tone="error"
				title={t(`${KEYS}.LOAD_ERROR` as Key)}
				description={t(errorReasonKeyOf(list.readError) as Key)}
				actions={
					<Button type="button" variant="outline" size="sm" onClick={list.retry} disabled={list.isRetrying}>
						{t('notifications.RETRY')}
					</Button>
				}
			/>
		);
	} else if (list.isLoading) {
		body = <p className="text-[13px] text-muted-foreground">{t(`${KEYS}.LOADING` as Key)}</p>;
	} else if (!list.conflicts.length) {
		body = (
			<p className="text-[13px] text-muted-foreground">
				{t(`${KEYS}.${status === 'open' ? 'EMPTY_OPEN' : 'EMPTY_RESOLVED'}` as Key)}
			</p>
		);
	} else {
		body = (
			<>
				<ul className="flex flex-col divide-y divide-border">
					{list.conflicts.map((conflict) => (
						<ConflictLine key={conflict.id} conflict={conflict} providerName={providerName} list={list} />
					))}
				</ul>
				{list.canShowMore && (
					<div>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={list.showMore}
							disabled={list.isRetrying || list.resolvingId !== null}
						>
							{t(`${KEYS}.SHOW_MORE` as Key)}
						</Button>
					</div>
				)}
			</>
		);
	}

	return (
		<div className="hairline-t flex flex-col gap-2 px-4 py-3" data-testid={`${provider}-conflicts`}>
			<div className="flex flex-wrap items-center justify-between gap-2">
				<span className={SETTINGS_ROW_LABEL}>{t(`${KEYS}.TITLE` as Key)}</span>
				<div className="flex gap-1" role="group" aria-label={t(`${KEYS}.SHOW` as Key)}>
					{STATUSES.map((value) => (
						<Button
							key={value}
							type="button"
							size="sm"
							variant={status === value ? 'secondary' : 'ghost'}
							aria-pressed={status === value}
							onClick={() => {
								setStatus(value);
								list.clearFeedback();
							}}
						>
							{t(`${KEYS}.STATUS_${value}` as Key)}
						</Button>
					))}
				</div>
			</div>
			<p className={SETTINGS_ROW_DESCRIPTION}>{t(`${KEYS}.DESCRIPTION` as Key, { provider: providerName })}</p>
			{runId && (
				<div
					className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"
					data-testid="conflicts-run-filter"
				>
					<span>{t(`${KEYS}.RUN_FILTER` as Key)}</span>
					<Button type="button" variant="link" size="sm" className="h-auto px-0" onClick={onClearRun}>
						{t(`${KEYS}.SHOW_ALL` as Key)}
					</Button>
				</div>
			)}
			<ResolveFeedback list={list} providerName={providerName} />
			{body}
		</div>
	);
}
