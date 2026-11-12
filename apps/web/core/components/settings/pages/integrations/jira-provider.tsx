'use client';

import { Fragment, ReactNode, RefObject, useId, useMemo, useRef, useState } from 'react';
import { type DottedLanguageObjectStringPaths, useLocale, useTranslations } from 'next-intl';
import { AnimatedHeight } from '@/core/components/common/animated-height';
import { badgeVariants } from '@/core/components/common/badge';
import { Checkbox } from '@/core/components/common/checkbox';
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
import { Alert, ChevronDown, StopCircle, Task } from '@/core/components/icons';
import { ConfirmDestructiveDialog, DangerRow, type DangerConsequence } from '@/core/components/settings/kit/danger';
import {
	SETTINGS_ROW_DESCRIPTION,
	SETTINGS_ROW_LABEL,
	SettingsSection,
	SettingsSurface
} from '@/core/components/settings/kit/settings-page';
import { SettingsSwitch } from '@/core/components/settings/kit/settings-switch';
import {
	type JiraIntegrationSettings,
	type JiraProjectDetailLookup,
	useJiraProjectDetail,
	useJiraProjects,
	useJiraSites
} from '@/core/hooks/integrations/use-jira-integration';
import { type LinearStatusOptions, useLinearStatusOptions } from '@/core/hooks/integrations/use-linear-integration';
import { type RunConflictFilter, useRunConflictFilter } from '@/core/hooks/integrations/use-run-conflict-filter';
import { cn } from '@/core/lib/helpers';
import { errorReasonKeyOf } from '@/core/lib/utils/error-feedback';
import {
	categoryOfStatus,
	effectiveCategoryMap,
	invalidCategories,
	invalidStatusFields,
	type JiraCategoryMap,
	STATUS_BY_CATEGORY,
	statusFieldsOf,
	statusMapOf,
	statusOverrideCount
} from '@/core/lib/utils/integration-jira-status-map';
import { matchStatusName } from '@/core/lib/utils/integration-linear-state-map';
import {
	IJiraMapping,
	IJiraRun,
	IJiraStatusDefinition,
	JIRA_DIRECTIONS,
	JIRA_STATUS_CATEGORIES,
	TJiraDirection
} from '@/core/types/interfaces/integrations/jira';
import { IntegrationConflictsRow } from './integration-conflicts-row';
import { GithubProviderRowSkeleton, PROVIDER_ROW, PROVIDER_TILE } from './integrations-settings-skeleton';

type JiraProps = Readonly<{ jira: JiraIntegrationSettings }>;
type Key = DottedLanguageObjectStringPaths;

const KEYS = 'settings.integrations.jira';
const ROW_DIVIDER = 'hairline-t';

const HEADER_BUTTON = cn(
	PROVIDER_ROW,
	'cursor-pointer outline-none transition-colors hover:bg-foreground/[0.025] focus-visible:bg-foreground/[0.025] focus-visible:inset-ring-2 focus-visible:inset-ring-ring/40'
);

const SELECT_TRIGGER = 'h-8 w-full min-w-0 text-[13px] sm:w-48';
const SELECT_CONTENT = 'max-h-72 w-64 overflow-y-auto p-1';
const STATUS_SELECT_TRIGGER = cn(SELECT_TRIGGER, 'sm:w-full');

/** How many issues a run's report names before "and N more". */
const REPORT_FAILURES_SHOWN = 5;

function JiraTile() {
	return (
		<span className={cn(PROVIDER_TILE, 'text-[13px] font-semibold')} aria-hidden="true">
			J
		</span>
	);
}

function MutedRow({ children }: Readonly<{ children: ReactNode }>) {
	return (
		<div className={cn(ROW_DIVIDER, 'px-4 py-3')}>
			<p className="text-[13px] text-pretty text-muted-foreground">{children}</p>
		</div>
	);
}

function formatDay(value: string, locale: string): string {
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date);
}

function ActionErrorRow({ jira }: JiraProps) {
	const t = useTranslations();
	if (!jira.actionError) return null;
	const reasonKey = errorReasonKeyOf(jira.actionError) as Key;
	return (
		<div className={ROW_DIVIDER}>
			<Notice
				tone="error"
				title={t(`${KEYS}.ACTION_FAILED` as Key)}
				description={t(reasonKey)}
				onDismiss={jira.clearActionError}
				dismissLabel={t('common.CLOSE')}
			/>
		</div>
	);
}

function DetailsErrorRow({ jira }: JiraProps) {
	const t = useTranslations();
	if (!jira.detailsError) return null;
	const reasonKey = errorReasonKeyOf(jira.detailsError) as Key;
	return (
		<div className={ROW_DIVIDER}>
			<Notice
				tone="error"
				title={t(`${KEYS}.DETAILS_ERROR_TITLE` as Key)}
				description={t(reasonKey)}
				actions={
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={jira.retryDetails}
						disabled={jira.isRetryingDetails}
					>
						{t('notifications.RETRY')}
					</Button>
				}
			/>
		</div>
	);
}

function JiraConnectRow({ jira, canConnect }: JiraProps & Readonly<{ canConnect: boolean }>) {
	const t = useTranslations();
	const noteId = useId();
	const isConnecting = jira.pending.kind === 'connect';
	const note = canConnect ? t(`${KEYS}.CONNECT_NOTE` as Key) : t(`${KEYS}.CONNECT_UNAVAILABLE` as Key);
	return (
		<div className={PROVIDER_ROW}>
			<JiraTile />
			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				<span className={SETTINGS_ROW_LABEL}>{t(`${KEYS}.TITLE` as Key)}</span>
				<span id={noteId} className={SETTINGS_ROW_DESCRIPTION}>
					{note}
				</span>
			</div>
			<Button
				type="button"
				onClick={jira.connect}
				disabled={!canConnect || isConnecting}
				aria-describedby={noteId}
				aria-busy={isConnecting || undefined}
				className="shrink-0"
			>
				{isConnecting ? t(`${KEYS}.CONNECTING` as Key) : t(`${KEYS}.CONNECT` as Key)}
			</Button>
		</div>
	);
}

function JiraFacts({ jira }: JiraProps) {
	const t = useTranslations();
	const locale = useLocale();
	const connection = jira.connection;
	if (!connection) return null;
	const site = [connection.siteName, connection.siteUrl].filter(Boolean).join(' · ');
	// Label and value of each fact the connection has; one it lacks (no account name, no site yet) is left out.
	const facts: Array<[string, string]> = [
		[t(`${KEYS}.FACT_ACCOUNT` as Key), connection.accountName ?? ''],
		[t(`${KEYS}.FACT_SITE` as Key), site],
		[t(`${KEYS}.FACT_CONNECTED` as Key), connection.createdAt ? formatDay(connection.createdAt, locale) : ''],
		[t(`${KEYS}.FACT_MAPPINGS` as Key), t(`${KEYS}.FACT_MAPPINGS_VALUE` as Key, { count: jira.mappings.length })],
		[
			t(`${KEYS}.FACT_WEBHOOKS` as Key),
			jira.webhooks ? t(`${KEYS}.WEBHOOKS_ON` as Key) : t(`${KEYS}.WEBHOOKS_OFF` as Key)
		]
	];
	return (
		<div className={cn(ROW_DIVIDER, 'px-4 py-3')}>
			<dl className="grid min-w-0 grid-cols-[minmax(0,7.5rem)_minmax(0,1fr)] gap-x-4 gap-y-1.5">
				{facts
					.filter(([, value]) => value)
					.map(([label, value]) => (
						<Fragment key={label}>
							<dt className="text-xs leading-5 text-muted-foreground">{label}</dt>
							<dd className="min-w-0 truncate text-[13px] leading-5 text-foreground">{value}</dd>
						</Fragment>
					))}
			</dl>
		</div>
	);
}

function AttentionNote({ reason }: Readonly<{ reason: string }>) {
	const t = useTranslations();
	const key = reason === 'token_refused' ? `${KEYS}.ATTENTION_TOKEN_REFUSED` : `${KEYS}.ATTENTION_OTHER`;
	return (
		<div className={cn(ROW_DIVIDER, 'flex items-start gap-2.5 px-4 py-3')}>
			<Alert className="mt-0.5 size-4 shrink-0 text-warning-foreground" />
			<p className="min-w-0 flex-1 text-[13px] text-pretty text-foreground">{t(key as Key)}</p>
		</div>
	);
}

function ChoiceSelect({
	value,
	onChange,
	disabled,
	options,
	placeholder,
	id,
	testId
}: Readonly<{
	value: string;
	onChange: (next: string) => void;
	disabled: boolean;
	options: ReadonlyArray<{ value: string; label: string }>;
	placeholder: string;
	id?: string;
	testId?: string;
}>) {
	return (
		<Select value={value} onValueChange={onChange} disabled={disabled}>
			<SelectTrigger id={id} className={SELECT_TRIGGER} data-testid={testId}>
				<SelectValue placeholder={placeholder} />
			</SelectTrigger>
			<SelectContent align="start" className={SELECT_CONTENT}>
				<SelectGroup>
					{options.map((option) => (
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
	);
}

function DirectionSelect({
	value,
	onChange,
	disabled,
	id
}: Readonly<{ value: TJiraDirection; onChange: (next: TJiraDirection) => void; disabled: boolean; id?: string }>) {
	const t = useTranslations();
	return (
		<Select value={value} onValueChange={(next) => onChange(next as TJiraDirection)} disabled={disabled}>
			<SelectTrigger id={id} className={SELECT_TRIGGER}>
				<SelectValue />
			</SelectTrigger>
			<SelectContent align="end" className={SELECT_CONTENT}>
				<SelectGroup>
					{JIRA_DIRECTIONS.map((direction) => (
						<SelectItem key={direction} value={direction} className="text-[13px]">
							{t(`${KEYS}.DIRECTION_${direction}` as Key)}
						</SelectItem>
					))}
				</SelectGroup>
			</SelectContent>
		</Select>
	);
}

function LookupNote({
	isLoading,
	error,
	retry,
	isEmpty,
	empty,
	loading
}: Readonly<{
	isLoading: boolean;
	error: unknown;
	retry: () => void;
	isEmpty: boolean;
	empty: string;
	loading: string;
}>) {
	const t = useTranslations();
	if (isLoading) return <span className="text-xs text-muted-foreground">{loading}</span>;
	if (error) {
		return (
			<span className="text-xs text-destructive-ink">
				{t(errorReasonKeyOf(error) as Key)}{' '}
				<button type="button" className="underline" onClick={retry}>
					{t('notifications.RETRY')}
				</button>
			</span>
		);
	}
	if (isEmpty) return <span className="text-xs text-muted-foreground">{empty}</span>;
	return null;
}

/**
 * The site choice of a connection: required while its token reaches several sites and none is chosen (nothing syncs
 * until then), or a change of site asked for by a person.
 */
/**
 * Whether the connection's site must stay as it is: a mapping names a Jira project by its id on this site, and another
 * site may hold another project of that id. Locked while any mapping exists, and while the mappings are unknown (their
 * read failed).
 */
function siteLockedOf(jira: JiraIntegrationSettings): boolean {
	return !jira.canManageMappings || jira.mappings.length > 0;
}

function SiteChoiceRow({ jira, required, onDone }: JiraProps & Readonly<{ required: boolean; onDone?: () => void }>) {
	const t = useTranslations();
	const selectId = useId();
	const sites = useJiraSites(jira.integrationId);
	const [choice, setChoice] = useState(() => jira.connection?.cloudId ?? '');
	const isSaving = jira.pending.kind === 'site';
	// A change (not the first choice) waits until the connection is known to map nothing: see siteLockedOf.
	const locked = !required && siteLockedOf(jira);
	const canSave =
		Boolean(choice) &&
		choice !== jira.connection?.cloudId &&
		jira.pending.kind === null &&
		!locked &&
		!sites.isLoading &&
		!sites.error;

	const save = async () => {
		try {
			await jira.selectSite(choice);
			onDone?.();
		} catch {
			// The hook keeps the error for the page.
		}
	};

	return (
		<div className={cn(ROW_DIVIDER, 'flex flex-col gap-3 px-4 py-3')} data-testid="jira-site-choice">
			<span className={SETTINGS_ROW_LABEL}>{t(`${KEYS}.SITE_TITLE` as Key)}</span>
			<span className={SETTINGS_ROW_DESCRIPTION}>
				{required ? t(`${KEYS}.SITE_REQUIRED` as Key) : t(`${KEYS}.SITE_CHANGE_HINT` as Key)}
			</span>
			<label className="flex flex-col gap-1 text-xs text-muted-foreground" htmlFor={selectId}>
				{t(`${KEYS}.SITE_LABEL` as Key)}
				<ChoiceSelect
					id={selectId}
					value={choice}
					onChange={setChoice}
					disabled={isSaving || sites.isLoading}
					options={sites.items.map((site) => ({
						value: site.id,
						label: site.url ? `${site.name} · ${site.url}` : site.name
					}))}
					placeholder={t(`${KEYS}.SITE_PLACEHOLDER` as Key)}
					testId="jira-site"
				/>
				<LookupNote
					isLoading={sites.isLoading}
					error={sites.error}
					retry={sites.retry}
					isEmpty={!sites.items.length}
					empty={t(`${KEYS}.NO_SITES` as Key)}
					loading={t(`${KEYS}.SITES_LOADING` as Key)}
				/>
			</label>
			<div className="flex flex-wrap gap-2">
				<Button
					type="button"
					size="sm"
					onClick={() => void save()}
					disabled={!canSave}
					aria-busy={isSaving || undefined}
					data-testid="jira-site-save"
				>
					{isSaving ? t(`${KEYS}.SAVING` as Key) : t(`${KEYS}.SITE_SAVE` as Key)}
				</Button>
				{!required && onDone && (
					<Button type="button" size="sm" variant="ghost" onClick={onDone} disabled={isSaving}>
						{t('common.CANCEL')}
					</Button>
				)}
			</div>
		</div>
	);
}

/** The connection's webhook: when it expires (renewed before), why its last registration failed, and a way to register it again. */
function WebhookRow({ jira }: JiraProps) {
	const t = useTranslations();
	const locale = useLocale();
	const connection = jira.connection;
	if (!jira.webhooks || !connection) return null;
	const needsOne = jira.mappings.some((mapping) => mapping.syncEnabled && mapping.direction !== 'outbound');
	const isRegistering = jira.pending.kind === 'webhook';
	let text: string;
	let tone: 'muted' | 'error' = 'muted';
	if (connection.webhookError) {
		text = t(`${KEYS}.WEBHOOK_FAILED` as Key, { reason: connection.webhookError });
		tone = 'error';
	} else if (connection.webhookExpiresAt) {
		text = t(`${KEYS}.WEBHOOK_ACTIVE` as Key, { date: formatDay(connection.webhookExpiresAt, locale) });
	} else if (needsOne) {
		text = t(`${KEYS}.WEBHOOK_MISSING` as Key);
	} else {
		return null;
	}
	const offerRegister = Boolean(connection.webhookError) || (!connection.webhookExpiresAt && needsOne);
	return (
		<div className={cn(ROW_DIVIDER, 'flex flex-wrap items-center gap-3 px-4 py-3')} data-testid="jira-webhook">
			<p
				className={cn(
					'min-w-0 flex-1 text-[13px] text-pretty',
					tone === 'error' ? 'text-destructive-ink' : 'text-muted-foreground'
				)}
			>
				{text}
			</p>
			{offerRegister && (
				<Button
					type="button"
					size="sm"
					variant="outline"
					disabled={jira.pending.kind !== null}
					aria-busy={isRegistering || undefined}
					onClick={() => void jira.registerWebhook().catch(() => undefined)}
				>
					{t(`${KEYS}.WEBHOOK_REGISTER` as Key)}
				</Button>
			)}
		</div>
	);
}

/**
 * One field of a status map: the task status a status category, or one Jira status, becomes. A Jira status can also
 * be left to its category (`fallbackLabel` names that choice). A value that is no status of the project or the
 * organization stays visible and is marked.
 */
function StatusChoice({
	label,
	testId,
	value,
	options,
	disabled,
	onChange,
	fallbackLabel
}: Readonly<{
	label: string;
	testId: string;
	value: string;
	options: readonly { name: string }[];
	disabled: boolean;
	onChange: (next: string) => void;
	fallbackLabel?: string;
}>) {
	const t = useTranslations();
	const id = useId();
	const byCategory = fallbackLabel !== undefined && value === STATUS_BY_CATEGORY;
	const match = byCategory ? null : matchStatusName(value, options);
	const invalid = !byCategory && !match;
	return (
		<label className="flex flex-col gap-1 text-xs text-muted-foreground" htmlFor={id} data-testid={testId}>
			{label}
			<Select
				value={byCategory ? STATUS_BY_CATEGORY : (match?.name ?? value)}
				onValueChange={onChange}
				disabled={disabled}
			>
				<SelectTrigger
					id={id}
					className={cn(STATUS_SELECT_TRIGGER, invalid && 'border-destructive-ink')}
					aria-invalid={invalid || undefined}
				>
					<SelectValue placeholder={t(`${KEYS}.STATUS_MAP_PLACEHOLDER` as Key)} />
				</SelectTrigger>
				<SelectContent align="start" className={SELECT_CONTENT}>
					<SelectGroup>
						{fallbackLabel !== undefined && (
							<SelectItem value={STATUS_BY_CATEGORY} textValue={fallbackLabel} className="text-[13px]">
								{fallbackLabel}
							</SelectItem>
						)}
						{invalid && value && (
							<SelectItem value={value} textValue={value} className="text-[13px] text-destructive-ink">
								{t(`${KEYS}.STATUS_MAP_UNKNOWN` as Key, { value })}
							</SelectItem>
						)}
						{options.map((option) => (
							<SelectItem
								key={option.name}
								value={option.name}
								textValue={option.name}
								className="text-[13px]"
							>
								{option.name}
							</SelectItem>
						))}
					</SelectGroup>
				</SelectContent>
			</Select>
		</label>
	);
}

/** What a mapping's editor holds: the category entries, one field per Jira status, and the issue types brought in. */
export interface JiraMapDraft {
	categories: JiraCategoryMap;
	fields: Record<string, string>;
	issueTypeIds: string[];
}

/**
 * The status map of one Jira project (each status category, then any of the project's statuses on its own) and the
 * issue types it brings in, validated against the statuses the platform project and the organization have.
 */
function MapEditor({
	detail,
	draft,
	onChange,
	disabled,
	statuses
}: Readonly<{
	detail: JiraProjectDetailLookup;
	draft: JiraMapDraft;
	onChange: (next: JiraMapDraft) => void;
	disabled: boolean;
	statuses: LinearStatusOptions;
}>) {
	const t = useTranslations();
	// A status left to its category says which one it falls back to.
	const fallbackLabelOf = (status: IJiraStatusDefinition) => {
		const category = categoryOfStatus(status);
		return category
			? t(`${KEYS}.STATUS_BY_CATEGORY_NAMED` as Key, { category: t(`${KEYS}.CATEGORY_${category}` as Key) })
			: t(`${KEYS}.STATUS_BY_CATEGORY` as Key);
	};
	const projectStatuses = detail.detail?.statuses ?? [];
	const issueTypes = detail.detail?.issueTypes ?? [];
	const checking = statuses.isLoading || !!statuses.error;
	const invalidKinds = checking ? [] : invalidCategories(draft.categories, statuses.options);
	const invalidStatuses = checking ? [] : invalidStatusFields(draft.fields, statuses.options);
	const invalidValues = [
		...invalidKinds.map((category) => draft.categories[category] || '—'),
		...invalidStatuses.map((statusId) => draft.fields[statusId])
	];
	const toggleIssueType = (issueTypeId: string, checked: boolean) => {
		const rest = draft.issueTypeIds.filter((id) => id !== issueTypeId);
		onChange({ ...draft, issueTypeIds: checked ? [...rest, issueTypeId] : rest });
	};
	return (
		<div className="flex flex-col gap-3">
			<fieldset className="flex flex-col gap-2" data-testid="jira-status-map">
				<legend className="text-xs text-muted-foreground">{t(`${KEYS}.STATUS_MAP_LABEL` as Key)}</legend>
				<span className="text-xs text-muted-foreground">{t(`${KEYS}.STATUS_MAP_HINT` as Key)}</span>
				{statuses.error ? (
					<Notice
						tone="error"
						title={t(`${KEYS}.STATUSES_ERROR` as Key)}
						description={t(errorReasonKeyOf(statuses.error) as Key)}
						actions={
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={statuses.retry}
								disabled={statuses.isLoading}
							>
								{t('notifications.RETRY')}
							</Button>
						}
					/>
				) : (
					<>
						<div className="grid gap-2 sm:grid-cols-3">
							{JIRA_STATUS_CATEGORIES.map((category) => (
								<StatusChoice
									key={category}
									label={t(`${KEYS}.CATEGORY_${category}` as Key)}
									testId={`jira-category-${category}`}
									value={draft.categories[category]}
									options={statuses.options}
									disabled={disabled || statuses.isLoading}
									onChange={(next) =>
										onChange({ ...draft, categories: { ...draft.categories, [category]: next } })
									}
								/>
							))}
						</div>
						<LookupNote
							isLoading={detail.isLoading}
							error={detail.error}
							retry={detail.retry}
							isEmpty={!projectStatuses.length}
							empty={t(`${KEYS}.NO_STATUSES` as Key)}
							loading={t(`${KEYS}.PROJECT_LOADING` as Key)}
						/>
						{projectStatuses.length > 0 && (
							<>
								<span className="text-xs text-muted-foreground">
									{t(`${KEYS}.STATUS_OVERRIDES_HINT` as Key)}
								</span>
								<div className="grid gap-2 sm:grid-cols-3">
									{projectStatuses.map((status) => (
										<StatusChoice
											key={status.id}
											label={status.name}
											testId={`jira-status-${status.id}`}
											value={draft.fields[status.id] ?? STATUS_BY_CATEGORY}
											options={statuses.options}
											disabled={disabled || statuses.isLoading}
											onChange={(next) =>
												onChange({ ...draft, fields: { ...draft.fields, [status.id]: next } })
											}
											fallbackLabel={fallbackLabelOf(status)}
										/>
									))}
								</div>
							</>
						)}
					</>
				)}
				{statuses.isLoading && (
					<span className="text-xs text-muted-foreground">{t(`${KEYS}.STATUSES_LOADING` as Key)}</span>
				)}
				{invalidValues.length > 0 && (
					<span className="text-xs text-destructive-ink" role="alert">
						{t(`${KEYS}.STATUS_MAP_INVALID` as Key, { values: invalidValues.join(', ') })}
					</span>
				)}
			</fieldset>
			{issueTypes.length > 0 && (
				<fieldset className="flex flex-col gap-2" data-testid="jira-issue-types">
					<legend className="text-xs text-muted-foreground">{t(`${KEYS}.ISSUE_TYPES_LABEL` as Key)}</legend>
					<span className="text-xs text-muted-foreground">{t(`${KEYS}.ISSUE_TYPES_HINT` as Key)}</span>
					<div className="flex flex-wrap gap-x-4 gap-y-2">
						{issueTypes.map((issueType) => (
							<label
								key={issueType.id}
								className="flex items-center gap-2 text-[13px] text-foreground"
								data-testid={`jira-issue-type-${issueType.id}`}
							>
								<Checkbox
									checked={draft.issueTypeIds.includes(issueType.id)}
									disabled={disabled}
									onCheckedChange={(checked) => toggleIssueType(issueType.id, checked === true)}
									aria-label={issueType.name}
								/>
								{issueType.name}
							</label>
						))}
					</div>
				</fieldset>
			)}
			{lostIssueTypeFilter(draft, detail) && (
				<div className="flex flex-wrap items-center gap-2" data-testid="jira-issue-types-gone">
					<span className="text-xs text-destructive-ink" role="alert">
						{t(`${KEYS}.ISSUE_TYPES_GONE` as Key)}
					</span>
					<Button
						type="button"
						size="sm"
						variant="outline"
						disabled={disabled}
						onClick={() => onChange({ ...draft, issueTypeIds: [] })}
					>
						{t(`${KEYS}.ISSUE_TYPES_ALL` as Key)}
					</Button>
				</div>
			)}
		</div>
	);
}

/**
 * Whether an editor may be saved: the project's statuses are read, every chosen status is one (nothing while they are
 * unknown), and an issue-type filter still names a type of the project (saved empty, it would bring every type in).
 */
function canSaveDraft(draft: JiraMapDraft, detail: JiraProjectDetailLookup, statuses: LinearStatusOptions): boolean {
	return (
		!detail.isLoading &&
		!detail.error &&
		!statuses.isLoading &&
		!statuses.error &&
		invalidCategories(draft.categories, statuses.options).length === 0 &&
		invalidStatusFields(draft.fields, statuses.options).length === 0 &&
		!lostIssueTypeFilter(draft, detail)
	);
}

/** Whether the draft filters on issue types the project no longer has, and on none it has. */
function lostIssueTypeFilter(draft: JiraMapDraft, detail: JiraProjectDetailLookup): boolean {
	return !!detail.detail && draft.issueTypeIds.length > 0 && keptIssueTypeIds(draft, detail).length === 0;
}

/** The issue types a draft keeps: those the project still has (an empty list brings every type in). */
function keptIssueTypeIds(draft: JiraMapDraft, detail: JiraProjectDetailLookup): string[] {
	const known = new Set((detail.detail?.issueTypes ?? []).map((issueType) => issueType.id));
	return draft.issueTypeIds.filter((id) => known.has(id));
}

function jiraProjectLabel(mapping: Pick<IJiraMapping, 'jiraProjectName' | 'jiraProjectKey' | 'jiraProjectId'>): string {
	if (mapping.jiraProjectName && mapping.jiraProjectKey)
		return `${mapping.jiraProjectName} (${mapping.jiraProjectKey})`;
	return mapping.jiraProjectName || mapping.jiraProjectKey || mapping.jiraProjectId;
}

function MappingRow({ jira, mapping }: JiraProps & Readonly<{ mapping: IJiraMapping }>) {
	const t = useTranslations();
	const locale = useLocale();
	const switchId = useId();
	const statuses = useLinearStatusOptions(mapping.projectId);
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState<JiraMapDraft | null>(null);
	const detail = useJiraProjectDetail(
		editing ? jira.integrationId : null,
		jira.connection?.cloudId ?? null,
		editing ? mapping.jiraProjectId : null
	);
	const isPending = jira.pending.mappingId === mapping.id;
	const anyPending = jira.pending.kind !== null;
	const projectName = jira.projects.find((project) => project.id === mapping.projectId)?.name ?? '';
	const storedCategories = useMemo(
		() => effectiveCategoryMap(jira.defaultStatusMap, mapping.statusMap),
		[jira.defaultStatusMap, mapping.statusMap]
	);
	const storedInvalid =
		statuses.isLoading || statuses.error ? [] : invalidCategories(storedCategories, statuses.options);
	const overrides = statusOverrideCount(mapping.statusMap);
	let lastImport = t(`${KEYS}.LAST_IMPORT_NEVER` as Key);
	if (mapping.lastImportedAt)
		lastImport = t(`${KEYS}.LAST_IMPORT` as Key, { date: formatDay(mapping.lastImportedAt, locale) });
	// The status fields follow the project's statuses once they are read; the person's choices win over the stored map.
	const current = useMemo<JiraMapDraft>(
		() => ({
			categories: draft?.categories ?? storedCategories,
			fields: { ...statusFieldsOf(detail.detail?.statuses ?? [], mapping.statusMap), ...(draft?.fields ?? {}) },
			issueTypeIds: draft?.issueTypeIds ?? mapping.issueTypeIds ?? []
		}),
		[detail.detail?.statuses, draft, mapping.issueTypeIds, mapping.statusMap, storedCategories]
	);

	const startEditing = () => {
		setDraft(null);
		setEditing(true);
	};
	const stopEditing = () => {
		setEditing(false);
		setDraft(null);
	};
	const saveMap = async () => {
		try {
			await jira.updateMapping(mapping.id, {
				statusMap: statusMapOf(current.categories, current.fields),
				issueTypeIds: keptIssueTypeIds(current, detail)
			});
			stopEditing();
		} catch {
			// The hook keeps the error for the page.
		}
	};

	return (
		<div className={cn(ROW_DIVIDER, 'flex flex-col gap-3 px-4 py-3')} data-testid={`jira-mapping-${mapping.id}`}>
			<div className="flex flex-wrap items-center gap-3">
				<div className="flex min-w-0 flex-1 flex-col gap-0.5">
					<span className={SETTINGS_ROW_LABEL}>{jiraProjectLabel(mapping)}</span>
					<span className={SETTINGS_ROW_DESCRIPTION}>
						{t(`${KEYS}.MAPPED_TO` as Key, { project: projectName })} · {lastImport}
						{overrides > 0 && <> · {t(`${KEYS}.STATUSES_MAPPED` as Key, { count: overrides })}</>}
						{mapping.issueTypeIds?.length > 0 && (
							<> · {t(`${KEYS}.ISSUE_TYPES_COUNT` as Key, { count: mapping.issueTypeIds.length })}</>
						)}
					</span>
					{mapping.lastError && <span className="text-xs text-destructive-ink">{mapping.lastError}</span>}
					{!editing && storedInvalid.length > 0 && (
						<span className="text-xs text-destructive-ink" role="alert">
							{t(`${KEYS}.STATUS_MAP_INVALID` as Key, {
								values: storedInvalid.map((category) => storedCategories[category] || '—').join(', ')
							})}
						</span>
					)}
				</div>
				<DirectionSelect
					value={mapping.direction}
					onChange={(direction) => void jira.updateMapping(mapping.id, { direction }).catch(() => undefined)}
					disabled={anyPending}
				/>
				<label className="flex items-center gap-2 text-[13px] text-foreground" htmlFor={switchId}>
					<SettingsSwitch
						id={switchId}
						checked={mapping.syncEnabled}
						pending={isPending && jira.pending.kind === 'update'}
						disabled={anyPending}
						ariaLabel={t(`${KEYS}.SYNC_LABEL` as Key)}
						onCheckedChange={(syncEnabled) =>
							void jira.updateMapping(mapping.id, { syncEnabled }).catch(() => undefined)
						}
					/>
					{t(`${KEYS}.SYNC_LABEL` as Key)}
				</label>
			</div>
			{editing && (
				<>
					<MapEditor
						detail={detail}
						draft={current}
						onChange={setDraft}
						disabled={anyPending}
						statuses={statuses}
					/>
					<div className="flex flex-wrap gap-2">
						<Button
							type="button"
							size="sm"
							onClick={() => void saveMap()}
							disabled={anyPending || !canSaveDraft(current, detail, statuses)}
							aria-busy={(isPending && jira.pending.kind === 'update') || undefined}
							data-testid={`jira-status-map-save-${mapping.id}`}
						>
							{t(`${KEYS}.STATUS_MAP_SAVE` as Key)}
						</Button>
						<Button type="button" size="sm" variant="ghost" onClick={stopEditing} disabled={anyPending}>
							{t('common.CANCEL')}
						</Button>
					</div>
				</>
			)}
			<div className="flex flex-wrap gap-2">
				<Button
					type="button"
					size="sm"
					variant="outline"
					disabled={anyPending}
					aria-busy={(isPending && jira.pending.kind === 'import') || undefined}
					onClick={() => void jira.importNow(mapping.id, false).catch(() => undefined)}
				>
					{t(`${KEYS}.IMPORT_CHANGES` as Key)}
				</Button>
				<Button
					type="button"
					size="sm"
					variant="ghost"
					disabled={anyPending}
					onClick={() => void jira.importNow(mapping.id, true).catch(() => undefined)}
				>
					{t(`${KEYS}.IMPORT_ALL` as Key)}
				</Button>
				{!editing && (
					<Button type="button" size="sm" variant="ghost" disabled={anyPending} onClick={startEditing}>
						{t(`${KEYS}.STATUS_MAP_EDIT` as Key)}
					</Button>
				)}
				<Button
					type="button"
					size="sm"
					variant="ghost"
					className="text-destructive-ink"
					disabled={anyPending}
					onClick={() => void jira.removeMapping(mapping.id).catch(() => undefined)}
				>
					{t(`${KEYS}.REMOVE_MAPPING` as Key)}
				</Button>
			</div>
		</div>
	);
}

function AddMappingRow({ jira }: JiraProps) {
	const t = useTranslations();
	const jiraProjectSelectId = useId();
	const projectSelectId = useId();
	const directionId = useId();
	const [jiraProject, setJiraProject] = useState('');
	const [project, setProject] = useState('');
	const [direction, setDirection] = useState<TJiraDirection>('inbound');
	const [draft, setDraft] = useState<JiraMapDraft | null>(null);
	const jiraProjects = useJiraProjects(jira.integrationId, jira.connection?.cloudId ?? null);
	const detail = useJiraProjectDetail(jira.integrationId, jira.connection?.cloudId ?? null, jiraProject || null);
	const statuses = useLinearStatusOptions(project || null);
	const unmapped = useMemo(() => {
		const mapped = new Set(jira.mappings.map((mapping) => mapping.jiraProjectId));
		return jiraProjects.items.filter((candidate) => !mapped.has(candidate.id));
	}, [jira.mappings, jiraProjects.items]);
	const current = useMemo<JiraMapDraft>(
		() => ({
			categories: draft?.categories ?? effectiveCategoryMap(jira.defaultStatusMap, null),
			fields: { ...statusFieldsOf(detail.detail?.statuses ?? [], null), ...(draft?.fields ?? {}) },
			issueTypeIds: draft?.issueTypeIds ?? []
		}),
		[detail.detail?.statuses, draft, jira.defaultStatusMap]
	);
	const isSaving = jira.pending.kind === 'create';
	const canSave =
		Boolean(jiraProject && project) && jira.pending.kind === null && canSaveDraft(current, detail, statuses);

	const chooseJiraProject = (next: string) => {
		setJiraProject(next);
		setDraft(null);
	};

	const save = async () => {
		const chosen = jiraProjects.items.find((candidate) => candidate.id === jiraProject);
		try {
			await jira.createMapping({
				jiraProjectId: jiraProject,
				jiraProjectKey: chosen?.key ?? null,
				jiraProjectName: chosen?.name ?? null,
				projectId: project,
				direction,
				statusMap: statusMapOf(current.categories, current.fields),
				issueTypeIds: keptIssueTypeIds(current, detail),
				syncEnabled: true
			});
			setJiraProject('');
			setProject('');
			setDraft(null);
		} catch {
			// The hook keeps the error for the page.
		}
	};

	return (
		<div className={cn(ROW_DIVIDER, 'flex flex-col gap-3 px-4 py-3')} data-testid="jira-add-mapping">
			<span className={SETTINGS_ROW_LABEL}>{t(`${KEYS}.ADD_TITLE` as Key)}</span>
			<span className={SETTINGS_ROW_DESCRIPTION}>{t(`${KEYS}.ADD_DESCRIPTION` as Key)}</span>
			<div className="grid gap-3 sm:grid-cols-3">
				<label className="flex flex-col gap-1 text-xs text-muted-foreground" htmlFor={jiraProjectSelectId}>
					{t(`${KEYS}.JIRA_PROJECT_LABEL` as Key)}
					<ChoiceSelect
						id={jiraProjectSelectId}
						value={jiraProject}
						onChange={chooseJiraProject}
						disabled={isSaving || jiraProjects.isLoading}
						options={unmapped.map((item) => ({
							value: item.id,
							label: item.key ? `${item.name} (${item.key})` : item.name
						}))}
						placeholder={t(`${KEYS}.JIRA_PROJECT_PLACEHOLDER` as Key)}
						testId="jira-jira-project"
					/>
					<LookupNote
						isLoading={jiraProjects.isLoading}
						error={jiraProjects.error}
						retry={jiraProjects.retry}
						isEmpty={!unmapped.length}
						empty={t(`${KEYS}.NO_PROJECTS` as Key)}
						loading={t(`${KEYS}.PROJECTS_LOADING` as Key)}
					/>
				</label>
				<label className="flex flex-col gap-1 text-xs text-muted-foreground" htmlFor={projectSelectId}>
					{t(`${KEYS}.PROJECT_LABEL` as Key)}
					<ChoiceSelect
						id={projectSelectId}
						value={project}
						onChange={setProject}
						disabled={isSaving}
						options={jira.projects.map((item) => ({ value: item.id, label: item.name }))}
						placeholder={t(`${KEYS}.PROJECT_PLACEHOLDER` as Key)}
						testId="jira-project"
					/>
				</label>
				<label className="flex flex-col gap-1 text-xs text-muted-foreground" htmlFor={directionId}>
					{t(`${KEYS}.DIRECTION_LABEL` as Key)}
					<DirectionSelect id={directionId} value={direction} onChange={setDirection} disabled={isSaving} />
				</label>
			</div>
			{jiraProject && (
				<MapEditor
					detail={detail}
					draft={current}
					onChange={setDraft}
					disabled={isSaving}
					statuses={statuses}
				/>
			)}
			<div>
				<Button
					type="button"
					size="sm"
					onClick={() => void save()}
					disabled={!canSave}
					aria-busy={isSaving || undefined}
					data-testid="jira-add-mapping-save"
				>
					{isSaving ? t(`${KEYS}.SAVING` as Key) : t(`${KEYS}.ADD_MAPPING` as Key)}
				</Button>
			</div>
		</div>
	);
}

/** What a run's report says beside its counts: what it read, and the issues it could not apply, by key. */
function RunReport({ run }: Readonly<{ run: IJiraRun }>) {
	const t = useTranslations();
	const report = run.report;
	if (!report) return null;
	const failures = report.failures ?? [];
	const named = failures.slice(0, REPORT_FAILURES_SHOWN).map((failure) => failure.key);
	const more = failures.length - named.length + (report.moreFailures ?? 0);
	return (
		<span className="min-w-0 basis-full text-xs text-muted-foreground" data-testid={`jira-run-report-${run.id}`}>
			{t(`${KEYS}.RUN_REPORT` as Key, {
				issues: report.issuesRead,
				comments: report.comments,
				links: report.links
			})}
			{!report.complete && run.status !== 'running' && <> · {t(`${KEYS}.RUN_INCOMPLETE` as Key)}</>}
			{named.length > 0 && (
				<span className="text-destructive-ink">
					{' '}
					· {t(`${KEYS}.RUN_FAILURES` as Key, { keys: named.join(', ') })}
					{more > 0 && <> {t(`${KEYS}.RUN_FAILURES_MORE` as Key, { count: more })}</>}
				</span>
			)}
		</span>
	);
}

function RunLine({ run, onShowConflicts }: Readonly<{ run: IJiraRun; onShowConflicts: (runId: string) => void }>) {
	const t = useTranslations();
	const locale = useLocale();
	const when = run.startedAt ? formatDay(run.startedAt, locale) : '';
	const counts = t(`${KEYS}.RUN_COUNTS` as Key, {
		created: run.createdCount,
		updated: run.updatedCount,
		skipped: run.skippedCount,
		failed: run.failedCount
	});
	let badge: 'warning' | 'info' | 'success' = 'success';
	if (run.status === 'failed') badge = 'warning';
	else if (run.status === 'running') badge = 'info';
	return (
		<li className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[13px]">
			<span className="text-foreground">{t(`${KEYS}.RUN_${run.kind}` as Key)}</span>
			<span className={badgeVariants({ variant: badge })}>{t(`${KEYS}.RUN_STATUS_${run.status}` as Key)}</span>
			<span className="text-muted-foreground">{when}</span>
			<span className="text-muted-foreground">{counts}</span>
			{run.conflictCount ? (
				<button
					type="button"
					className={cn(
						badgeVariants({ variant: 'warning' }),
						'cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring/40'
					)}
					title={t('settings.integrations.conflicts.SHOW_RUN_CONFLICTS')}
					onClick={() => onShowConflicts(run.id)}
				>
					{t('settings.integrations.conflicts.RUN_COUNT', { count: run.conflictCount })}
				</button>
			) : null}
			<RunReport run={run} />
			{run.lastError && (
				<span className="min-w-0 basis-full truncate text-xs text-destructive-ink">{run.lastError}</span>
			)}
		</li>
	);
}

function RunsRow({ jira, onShowConflicts }: JiraProps & Readonly<{ onShowConflicts: (runId: string) => void }>) {
	const t = useTranslations();
	if (!jira.runs.length) return <MutedRow>{t(`${KEYS}.NO_RUNS` as Key)}</MutedRow>;
	return (
		<div className={cn(ROW_DIVIDER, 'flex flex-col gap-2 px-4 py-3')}>
			<span className={SETTINGS_ROW_LABEL}>{t(`${KEYS}.RUNS_TITLE` as Key)}</span>
			<ul className="flex flex-col gap-1.5">
				{jira.runs.slice(0, 8).map((run) => (
					<RunLine key={run.id} run={run} onShowConflicts={onShowConflicts} />
				))}
			</ul>
		</div>
	);
}

/** What a connected panel shows once its site is chosen: the site, the webhook, the mappings, the conflicts and the runs. */
function JiraDetails({
	jira,
	conflictsRef,
	conflictFilter
}: JiraProps & Readonly<{ conflictsRef: RefObject<HTMLDivElement | null>; conflictFilter: RunConflictFilter }>) {
	const t = useTranslations();
	const [changingSite, setChangingSite] = useState(false);
	const connection = jira.connection;
	// The forms belong to the site they were filled for: another site starts them afresh (its projects and statuses differ).
	const siteKey = connection?.cloudId ?? 'no-site';
	// The site changes only while the connection is known to map nothing (see siteLockedOf): a site form left open
	// closes once a mapping appears.
	const siteLocked = siteLockedOf(jira);
	if (jira.isLoadingDetails) return <MutedRow>{t(`${KEYS}.LOADING_DETAILS` as Key)}</MutedRow>;
	return (
		<>
			{changingSite && !siteLocked ? (
				<SiteChoiceRow jira={jira} required={false} onDone={() => setChangingSite(false)} />
			) : (
				<div className={cn(ROW_DIVIDER, 'flex flex-wrap items-center justify-end gap-3 px-4 py-2')}>
					{/* A mapping names a project by its id on this site: another site may hold another project of that id. */}
					{siteLocked && (
						<span className="min-w-0 flex-1 text-xs text-muted-foreground">
							{t(`${KEYS}.SITE_CHANGE_BLOCKED` as Key)}
						</span>
					)}
					<Button
						type="button"
						size="sm"
						variant="ghost"
						disabled={jira.pending.kind !== null || siteLocked}
						onClick={() => setChangingSite(true)}
						data-testid="jira-site-change"
					>
						{t(`${KEYS}.SITE_CHANGE` as Key)}
					</Button>
				</div>
			)}
			<WebhookRow jira={jira} />
			{jira.mappings.map((mapping) => (
				<MappingRow key={`${mapping.id}:${siteKey}`} jira={jira} mapping={mapping} />
			))}
			{jira.canManageMappings && <AddMappingRow key={siteKey} jira={jira} />}
			{connection && (
				<div
					ref={conflictsRef}
					tabIndex={-1}
					className="outline-none"
					aria-label={t('settings.integrations.conflicts.TITLE')}
				>
					<IntegrationConflictsRow
						provider="jira"
						providerName={t(`${KEYS}.TITLE` as Key)}
						integrationId={connection.id}
						runId={conflictFilter.runId}
						onClearRun={conflictFilter.clearRun}
					/>
				</div>
			)}
			<RunsRow jira={jira} onShowConflicts={conflictFilter.showRun} />
		</>
	);
}

function JiraConnected({ jira, onDisconnect }: JiraProps & Readonly<{ onDisconnect: () => void }>) {
	const t = useTranslations();
	const panelId = useId();
	const [isOpen, setIsOpen] = useState(true);
	const connection = jira.connection;
	// The runs list's count of a run narrows the conflicts to that run, and brings them into view.
	const conflictsRef = useRef<HTMLDivElement>(null);
	const conflictFilter = useRunConflictFilter(connection?.id ?? null, conflictsRef);
	const siteRequired = Boolean(connection?.siteRequired);
	const needsAttention = Boolean(connection?.attentionReason);
	const account = connection?.accountName || '';
	const site = connection?.siteName || connection?.siteUrl || '';
	let summary = t(`${KEYS}.SUMMARY_CONNECTED_NO_ACCOUNT` as Key);
	if (account && site) summary = t(`${KEYS}.SUMMARY_CONNECTED_SITE` as Key, { account, site });
	else if (account) summary = t(`${KEYS}.SUMMARY_CONNECTED` as Key, { account });
	let stateLabel = t(`${KEYS}.STATE_CONNECTED` as Key);
	if (needsAttention) stateLabel = t(`${KEYS}.STATE_ATTENTION` as Key);
	else if (siteRequired) stateLabel = t(`${KEYS}.STATE_SITE_REQUIRED` as Key);

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
					<JiraTile />
					<span className="flex min-w-0 flex-1 flex-col gap-0.5">
						<span className={SETTINGS_ROW_LABEL}>{t(`${KEYS}.TITLE` as Key)}</span>
						<span className={cn(SETTINGS_ROW_DESCRIPTION, 'truncate')}>{summary}</span>
					</span>
					<span
						className={badgeVariants({ variant: needsAttention || siteRequired ? 'warning' : 'success' })}
					>
						{stateLabel}
					</span>
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
								{connection?.attentionReason && <AttentionNote reason={connection.attentionReason} />}
								<JiraFacts jira={jira} />
								<ActionErrorRow jira={jira} />
								<DetailsErrorRow jira={jira} />
								{siteRequired ? (
									<SiteChoiceRow jira={jira} required />
								) : (
									<JiraDetails
										jira={jira}
										conflictsRef={conflictsRef}
										conflictFilter={conflictFilter}
									/>
								)}
								<div className={ROW_DIVIDER}>
									<DangerRow
										label={t(`${KEYS}.DISCONNECT_LABEL` as Key)}
										consequence={t(`${KEYS}.DISCONNECT_CONSEQUENCE` as Key)}
										actionLabel={t(`${KEYS}.DISCONNECT` as Key)}
										onAction={onDisconnect}
										disabled={jira.pending.kind !== null}
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

function JiraLoadError({ jira }: JiraProps) {
	const t = useTranslations();
	const reasonKey = errorReasonKeyOf(jira.readError) as Key;
	return (
		<Notice
			tone="error"
			title={t(`${KEYS}.LOAD_ERROR_TITLE` as Key)}
			description={t(reasonKey)}
			actions={
				<Button type="button" variant="outline" onClick={jira.retry} disabled={jira.isRetrying}>
					{t('notifications.RETRY')}
				</Button>
			}
		/>
	);
}

function JiraProviderBody({ jira, onDisconnect }: JiraProps & Readonly<{ onDisconnect: () => void }>) {
	if (jira.status === 'loading') {
		return (
			<SettingsSurface>
				<GithubProviderRowSkeleton />
			</SettingsSurface>
		);
	}
	if (jira.status === 'loadError') return <JiraLoadError jira={jira} />;
	if (jira.status === 'connected') return <JiraConnected jira={jira} onDisconnect={onDisconnect} />;
	return (
		<SettingsSurface>
			<JiraConnectRow jira={jira} canConnect={jira.status === 'notConnected'} />
			{jira.actionError ? <ActionErrorRow jira={jira} /> : null}
		</SettingsSurface>
	);
}

/**
 * Settings → Integrations → Jira: connect a Jira Cloud site (the platform's OAuth flow, then the site when the account
 * reaches several), map Jira projects to projects with a task status per status category or per status and the issue
 * types brought in, import their issues, watch the runs and their reports, resolve conflicts, disconnect. Hidden where
 * the deployment flag is off or the platform does not serve the integration (its Jira Cloud sync is off: 404).
 */
export function JiraProviderSection({ jira }: JiraProps) {
	const t = useTranslations();
	const [confirming, setConfirming] = useState(false);
	if (jira.status === 'hidden') return null;
	const consequences: DangerConsequence[] = [
		{ key: 'sync', icon: <StopCircle />, text: t(`${KEYS}.DISCONNECT_STOPS_SYNC` as Key) },
		{ key: 'tasks', icon: <Task />, text: t(`${KEYS}.DISCONNECT_KEEPS_TASKS` as Key) }
	];

	const confirmDisconnect = async () => {
		try {
			await jira.disconnect();
			setConfirming(false);
		} catch {
			// The dialog shows the hook's error.
		}
	};

	return (
		<SettingsSection
			id="jira"
			title={t(`${KEYS}.SECTION_TITLE` as Key)}
			description={t(`${KEYS}.SECTION_DESCRIPTION` as Key)}
		>
			{jira.callbackError && (
				<Notice
					tone="error"
					title={t(`${KEYS}.CALLBACK_ERROR_TITLE` as Key)}
					description={t(`${KEYS}.CALLBACK_${jira.callbackError}` as Key)}
					onDismiss={jira.dismissCallbackError}
					dismissLabel={t('common.CLOSE')}
				/>
			)}
			<JiraProviderBody jira={jira} onDisconnect={() => setConfirming(true)} />
			<ConfirmDestructiveDialog
				open={confirming}
				onClose={() => {
					setConfirming(false);
					jira.clearDisconnectError();
				}}
				title={t(`${KEYS}.DISCONNECT_TITLE` as Key)}
				description={t(`${KEYS}.DISCONNECT_DESCRIPTION` as Key)}
				consequences={consequences}
				confirmLabel={t(`${KEYS}.DISCONNECT` as Key)}
				isPending={jira.pending.kind === 'disconnect'}
				error={jira.disconnectError ? t(errorReasonKeyOf(jira.disconnectError) as Key) : undefined}
				onConfirm={() => void confirmDisconnect()}
			/>
		</SettingsSection>
	);
}
