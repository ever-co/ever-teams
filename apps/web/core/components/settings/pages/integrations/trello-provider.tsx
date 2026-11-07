'use client';

import { ReactNode, useId, useMemo, useState } from 'react';
import { type DottedLanguageObjectStringPaths, useLocale, useTranslations } from 'next-intl';
import { AnimatedHeight } from '@/core/components/common/animated-height';
import { badgeVariants } from '@/core/components/common/badge';
import { Notice } from '@/core/components/common/notice';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/core/components/common/select';
import { Button } from '@/core/components/duplicated-components/_button';
import { Alert, ChevronDown, StopCircle, Task } from '@/core/components/icons';
import { ConfirmDestructiveDialog, DangerRow, type DangerConsequence } from '@/core/components/settings/kit/danger';
import { SETTINGS_ROW_DESCRIPTION, SETTINGS_ROW_LABEL, SettingsSection, SettingsSurface } from '@/core/components/settings/kit/settings-page';
import { SettingsSwitch } from '@/core/components/settings/kit/settings-switch';
import { type LinearStatusOptions, useLinearStatusOptions } from '@/core/hooks/integrations/use-linear-integration';
import { type TrelloIntegrationSettings, type TrelloLookup, useTrelloLists } from '@/core/hooks/integrations/use-trello-integration';
import { cn } from '@/core/lib/helpers';
import { errorReasonKeyOf } from '@/core/lib/utils/error-feedback';
import { matchStatusName } from '@/core/lib/utils/integration-linear-state-map';
import { invalidListFields, LIST_BY_NAME, listFieldsOf, listMapOfFields } from '@/core/lib/utils/integration-trello-list-map';
import { formatInstallDay } from '@/core/lib/utils/settings-integrations';
import { ITrelloList, ITrelloMapping, ITrelloRun, TRELLO_DIRECTIONS, TTrelloDirection } from '@/core/types/interfaces/integrations/trello';
import { GithubProviderRowSkeleton, PROVIDER_ROW, PROVIDER_TILE } from './integrations-settings-skeleton';

type TrelloProps = Readonly<{ trello: TrelloIntegrationSettings }>;

const ROW_DIVIDER = 'hairline-t';

const HEADER_BUTTON = cn(
	PROVIDER_ROW,
	'cursor-pointer outline-none transition-colors hover:bg-foreground/[0.025] focus-visible:bg-foreground/[0.025] focus-visible:inset-ring-2 focus-visible:inset-ring-ring/40'
);

const SELECT_TRIGGER = 'h-8 w-full min-w-0 text-[13px] sm:w-48';
const SELECT_CONTENT = 'max-h-72 w-64 overflow-y-auto p-1';
const STATUS_SELECT_TRIGGER = cn(SELECT_TRIGGER, 'sm:w-full');

function TrelloTile() {
	return (
		<span className={cn(PROVIDER_TILE, 'text-[13px] font-semibold')} aria-hidden="true">
			T
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

function MutedRow({ children }: Readonly<{ children: ReactNode }>) {
	return (
		<div className={cn(ROW_DIVIDER, 'px-4 py-3')}>
			<p className="text-[13px] text-pretty text-muted-foreground">{children}</p>
		</div>
	);
}

function formatDay(value: string, locale: string): string {
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? value : formatInstallDay(date, locale);
}

function ActionErrorRow({ trello }: TrelloProps) {
	const t = useTranslations();
	if (!trello.actionError) return null;
	const reasonKey = errorReasonKeyOf(trello.actionError) as DottedLanguageObjectStringPaths;
	return (
		<div className={ROW_DIVIDER}>
			<Notice tone="error" title={t('settings.integrations.trello.ACTION_FAILED')} description={t(reasonKey)} onDismiss={trello.clearActionError} dismissLabel={t('common.CLOSE')} />
		</div>
	);
}

function DetailsErrorRow({ trello }: TrelloProps) {
	const t = useTranslations();
	if (!trello.detailsError) return null;
	const reasonKey = errorReasonKeyOf(trello.detailsError) as DottedLanguageObjectStringPaths;
	return (
		<div className={ROW_DIVIDER}>
			<Notice
				tone="error"
				title={t('settings.integrations.trello.DETAILS_ERROR_TITLE')}
				description={t(reasonKey)}
				actions={
					<Button type="button" variant="outline" size="sm" onClick={trello.retryDetails} disabled={trello.isRetryingDetails}>
						{t('notifications.RETRY')}
					</Button>
				}
			/>
		</div>
	);
}

function TrelloConnectRow({ trello, canConnect }: TrelloProps & Readonly<{ canConnect: boolean }>) {
	const t = useTranslations();
	const noteId = useId();
	const isConnecting = trello.pending.kind === 'connect';
	const isFinishing = trello.pending.kind === 'finish';
	let note = canConnect ? t('settings.integrations.trello.CONNECT_NOTE') : t('settings.integrations.trello.CONNECT_UNAVAILABLE');
	if (isFinishing) note = t('settings.integrations.trello.FINISHING');
	return (
		<div className={PROVIDER_ROW}>
			<TrelloTile />
			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				<span className={SETTINGS_ROW_LABEL}>{t('settings.integrations.trello.TITLE')}</span>
				<span id={noteId} className={SETTINGS_ROW_DESCRIPTION}>
					{note}
				</span>
			</div>
			<Button type="button" onClick={trello.connect} disabled={!canConnect || isConnecting || isFinishing} aria-describedby={noteId} aria-busy={isConnecting || isFinishing || undefined} className="shrink-0">
				{isConnecting ? t('settings.integrations.trello.CONNECTING') : t('settings.integrations.trello.CONNECT')}
			</Button>
		</div>
	);
}

function TrelloFacts({ trello }: TrelloProps) {
	const t = useTranslations();
	const locale = useLocale();
	const connection = trello.connection;
	if (!connection) return null;
	const member = connection.trelloMemberName || connection.trelloMemberUsername || '';
	return (
		<div className={cn(ROW_DIVIDER, 'px-4 py-3')}>
			<dl className="grid min-w-0 grid-cols-[minmax(0,7.5rem)_minmax(0,1fr)] gap-x-4 gap-y-1.5">
				{member && <FactRow label={t('settings.integrations.trello.FACT_MEMBER')} value={member} />}
				{connection.createdAt && <FactRow label={t('settings.integrations.trello.FACT_CONNECTED')} value={formatDay(connection.createdAt, locale)} />}
				<FactRow label={t('settings.integrations.trello.FACT_MAPPINGS')} value={t('settings.integrations.trello.FACT_MAPPINGS_VALUE', { count: trello.mappings.length })} />
				<FactRow label={t('settings.integrations.trello.FACT_WEBHOOKS')} value={trello.webhooks ? t('settings.integrations.trello.WEBHOOKS_ON') : t('settings.integrations.trello.WEBHOOKS_OFF')} />
			</dl>
		</div>
	);
}

function AttentionNote({ reason }: Readonly<{ reason: string }>) {
	const t = useTranslations();
	const key = reason === 'token_refused' ? 'settings.integrations.trello.ATTENTION_TOKEN_REFUSED' : 'settings.integrations.trello.ATTENTION_OTHER';
	return (
		<div className={cn(ROW_DIVIDER, 'flex items-start gap-2.5 px-4 py-3')}>
			<Alert className="mt-0.5 size-4 shrink-0 text-warning-foreground" />
			<p className="min-w-0 flex-1 text-[13px] text-pretty text-foreground">{t(key as DottedLanguageObjectStringPaths)}</p>
		</div>
	);
}

function DirectionSelect({ value, onChange, disabled, id }: Readonly<{ value: TTrelloDirection; onChange: (next: TTrelloDirection) => void; disabled: boolean; id?: string }>) {
	const t = useTranslations();
	return (
		<Select value={value} onValueChange={(next) => onChange(next as TTrelloDirection)} disabled={disabled}>
			<SelectTrigger id={id} className={SELECT_TRIGGER}>
				<SelectValue />
			</SelectTrigger>
			<SelectContent align="end" className={SELECT_CONTENT}>
				<SelectGroup>
					{TRELLO_DIRECTIONS.map((direction) => (
						<SelectItem key={direction} value={direction} className="text-[13px]">
							{t(`settings.integrations.trello.DIRECTION_${direction}` as DottedLanguageObjectStringPaths)}
						</SelectItem>
					))}
				</SelectGroup>
			</SelectContent>
		</Select>
	);
}

function ChoiceSelect({ value, onChange, disabled, options, placeholder, id, testId }: Readonly<{ value: string; onChange: (next: string) => void; disabled: boolean; options: ReadonlyArray<{ value: string; label: string }>; placeholder: string; id?: string; testId?: string }>) {
	return (
		<Select value={value} onValueChange={onChange} disabled={disabled}>
			<SelectTrigger id={id} className={SELECT_TRIGGER} data-testid={testId}>
				<SelectValue placeholder={placeholder} />
			</SelectTrigger>
			<SelectContent align="start" className={SELECT_CONTENT}>
				<SelectGroup>
					{options.map((option) => (
						<SelectItem key={option.value} value={option.value} textValue={option.label} className="text-[13px]">
							{option.label}
						</SelectItem>
					))}
				</SelectGroup>
			</SelectContent>
		</Select>
	);
}

function LookupNote<T>({ lookup, empty, loading }: Readonly<{ lookup: TrelloLookup<T>; empty: string; loading: string }>) {
	const t = useTranslations();
	if (lookup.isLoading) return <span className="text-xs text-muted-foreground">{loading}</span>;
	if (lookup.error) {
		return (
			<span className="text-xs text-destructive-ink">
				{t(errorReasonKeyOf(lookup.error) as DottedLanguageObjectStringPaths)}{' '}
				<button type="button" className="underline" onClick={lookup.retry}>
					{t('notifications.RETRY')}
				</button>
			</span>
		);
	}
	if (!lookup.items.length) return <span className="text-xs text-muted-foreground">{empty}</span>;
	return null;
}

function ListStatusSelect({ list, value, options, disabled, onChange }: Readonly<{ list: ITrelloList; value: string; options: readonly { name: string }[]; disabled: boolean; onChange: (next: string) => void }>) {
	const t = useTranslations();
	const id = useId();
	const byName = value === LIST_BY_NAME;
	const match = byName ? null : matchStatusName(value, options);
	const invalid = !byName && !match;
	return (
		<label className="flex flex-col gap-1 text-xs text-muted-foreground" htmlFor={id} data-testid={`trello-list-${list.id}`}>
			{list.name}
			<Select value={byName ? LIST_BY_NAME : (match?.name ?? value)} onValueChange={onChange} disabled={disabled}>
				<SelectTrigger id={id} className={cn(STATUS_SELECT_TRIGGER, invalid && 'border-destructive-ink')} aria-invalid={invalid || undefined}>
					<SelectValue />
				</SelectTrigger>
				<SelectContent align="start" className={SELECT_CONTENT}>
					<SelectGroup>
						<SelectItem value={LIST_BY_NAME} textValue={t('settings.integrations.trello.LIST_BY_NAME')} className="text-[13px]">
							{t('settings.integrations.trello.LIST_BY_NAME')}
						</SelectItem>
						{invalid && value && (
							<SelectItem value={value} textValue={value} className="text-[13px] text-destructive-ink">
								{t('settings.integrations.trello.LIST_MAP_UNKNOWN', { value })}
							</SelectItem>
						)}
						{options.map((option) => (
							<SelectItem key={option.name} value={option.name} textValue={option.name} className="text-[13px]">
								{option.name}
							</SelectItem>
						))}
					</SelectGroup>
				</SelectContent>
			</Select>
		</label>
	);
}

/** The list → status fields of one board, validated against the statuses the project and the organization have. */
function ListMapFields({ lists, fields, onChange, disabled, statuses }: Readonly<{ lists: TrelloLookup<ITrelloList>; fields: Record<string, string>; onChange: (next: Record<string, string>) => void; disabled: boolean; statuses: LinearStatusOptions }>) {
	const t = useTranslations();
	const invalid = statuses.isLoading || statuses.error ? [] : invalidListFields(fields, statuses.options);
	return (
		<fieldset className="flex flex-col gap-2" data-testid="trello-list-map">
			<legend className="text-xs text-muted-foreground">{t('settings.integrations.trello.LIST_MAP_LABEL')}</legend>
			<span className="text-xs text-muted-foreground">{t('settings.integrations.trello.LIST_MAP_HINT')}</span>
			<LookupNote lookup={lists} empty={t('settings.integrations.trello.NO_LISTS')} loading={t('settings.integrations.trello.LISTS_LOADING')} />
			{statuses.error ? (
				<Notice
					tone="error"
					title={t('settings.integrations.trello.STATUSES_ERROR')}
					description={t(errorReasonKeyOf(statuses.error) as DottedLanguageObjectStringPaths)}
					actions={
						<Button type="button" variant="outline" size="sm" onClick={statuses.retry} disabled={statuses.isLoading}>
							{t('notifications.RETRY')}
						</Button>
					}
				/>
			) : (
				lists.items.length > 0 && (
					<div className="grid gap-2 sm:grid-cols-3">
						{lists.items.map((list) => (
							<ListStatusSelect
								key={list.id}
								list={list}
								value={fields[list.id] ?? LIST_BY_NAME}
								options={statuses.options}
								disabled={disabled || statuses.isLoading}
								onChange={(next) => onChange({ ...fields, [list.id]: next })}
							/>
						))}
					</div>
				)
			)}
			{statuses.isLoading && lists.items.length > 0 && <span className="text-xs text-muted-foreground">{t('settings.integrations.trello.STATUSES_LOADING')}</span>}
			{invalid.length > 0 && (
				<span className="text-xs text-destructive-ink" role="alert">
					{t('settings.integrations.trello.LIST_MAP_INVALID', { values: invalid.map((id) => fields[id]).join(', ') })}
				</span>
			)}
		</fieldset>
	);
}

/** Whether a list map may be saved: every chosen status is one (nothing while the statuses or the lists are unknown). */
function canSaveListMap(fields: Record<string, string>, lists: TrelloLookup<ITrelloList>, statuses: LinearStatusOptions): boolean {
	return !lists.isLoading && !lists.error && !statuses.isLoading && !statuses.error && invalidListFields(fields, statuses.options).length === 0;
}

function MappingRow({ trello, mapping }: TrelloProps & Readonly<{ mapping: ITrelloMapping }>) {
	const t = useTranslations();
	const locale = useLocale();
	const switchId = useId();
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState<Record<string, string> | null>(null);
	const lists = useTrelloLists(editing ? trello.integrationId : null, editing ? mapping.trelloBoardId : null);
	const statuses = useLinearStatusOptions(editing ? mapping.projectId : null);
	const isPending = trello.pending.mappingId === mapping.id;
	const anyPending = trello.pending.kind !== null;
	const projectName = trello.projects.find((project) => project.id === mapping.projectId)?.name ?? '';
	const boardLabel = mapping.trelloBoardName || mapping.trelloBoardId;
	const mappedLists = Object.keys(mapping.listMap ?? {}).length;
	let lastImport = t('settings.integrations.trello.LAST_IMPORT_NEVER');
	if (mapping.lastImportedAt) lastImport = t('settings.integrations.trello.LAST_IMPORT', { date: formatDay(mapping.lastImportedAt, locale) });
	// The fields follow the lists once they are read; a kept choice of the person wins over the stored map.
	const fields = useMemo(() => ({ ...listFieldsOf(lists.items, mapping.listMap ?? {}), ...(draft ?? {}) }), [draft, mapping.listMap, lists.items]);

	const startEditing = () => {
		setDraft({});
		setEditing(true);
	};
	const stopEditing = () => {
		setEditing(false);
		setDraft(null);
	};
	const saveListMap = async () => {
		try {
			await trello.updateMapping(mapping.id, { listMap: listMapOfFields(fields) });
			stopEditing();
		} catch {
			// The hook keeps the error for the page.
		}
	};

	return (
		<div className={cn(ROW_DIVIDER, 'flex flex-col gap-3 px-4 py-3')} data-testid={`trello-mapping-${mapping.id}`}>
			<div className="flex flex-wrap items-center gap-3">
				<div className="flex min-w-0 flex-1 flex-col gap-0.5">
					<span className={SETTINGS_ROW_LABEL}>{boardLabel}</span>
					<span className={SETTINGS_ROW_DESCRIPTION}>
						{t('settings.integrations.trello.MAPPED_TO', { project: projectName })} · {lastImport}
						{mappedLists > 0 && <> · {t('settings.integrations.trello.LISTS_MAPPED', { count: mappedLists })}</>}
					</span>
					{mapping.lastError && <span className="text-xs text-destructive-ink">{mapping.lastError}</span>}
				</div>
				{trello.webhooks && (
					mapping.hasWebhook ? (
						<span className={badgeVariants({ variant: 'success' })} data-testid={`trello-webhook-on-${mapping.id}`}>
							{t('settings.integrations.trello.WEBHOOK_ON')}
						</span>
					) : (
						<Button type="button" size="sm" variant="outline" disabled={anyPending} aria-busy={(isPending && trello.pending.kind === 'webhook') || undefined} onClick={() => void trello.registerWebhook(mapping.id).catch(() => undefined)}>
							{t('settings.integrations.trello.WEBHOOK_REGISTER')}
						</Button>
					)
				)}
				<DirectionSelect value={mapping.direction} onChange={(direction) => void trello.updateMapping(mapping.id, { direction }).catch(() => undefined)} disabled={anyPending} />
				<label className="flex items-center gap-2 text-[13px] text-foreground" htmlFor={switchId}>
					<SettingsSwitch
						id={switchId}
						checked={mapping.syncEnabled}
						pending={isPending && trello.pending.kind === 'update'}
						disabled={anyPending}
						ariaLabel={t('settings.integrations.trello.SYNC_LABEL')}
						onCheckedChange={(syncEnabled) => void trello.updateMapping(mapping.id, { syncEnabled }).catch(() => undefined)}
					/>
					{t('settings.integrations.trello.SYNC_LABEL')}
				</label>
			</div>
			{editing && (
				<>
					<ListMapFields lists={lists} fields={fields} onChange={setDraft} disabled={anyPending} statuses={statuses} />
					<div className="flex flex-wrap gap-2">
						<Button type="button" size="sm" onClick={() => void saveListMap()} disabled={anyPending || !canSaveListMap(fields, lists, statuses)} aria-busy={(isPending && trello.pending.kind === 'update') || undefined} data-testid={`trello-list-map-save-${mapping.id}`}>
							{t('settings.integrations.trello.LIST_MAP_SAVE')}
						</Button>
						<Button type="button" size="sm" variant="ghost" onClick={stopEditing} disabled={anyPending}>
							{t('common.CANCEL')}
						</Button>
					</div>
				</>
			)}
			<div className="flex flex-wrap gap-2">
				<Button type="button" size="sm" variant="outline" disabled={anyPending} aria-busy={(isPending && trello.pending.kind === 'import') || undefined} onClick={() => void trello.importNow(mapping.id, false).catch(() => undefined)}>
					{t('settings.integrations.trello.IMPORT_CHANGES')}
				</Button>
				<Button type="button" size="sm" variant="ghost" disabled={anyPending} onClick={() => void trello.importNow(mapping.id, true).catch(() => undefined)}>
					{t('settings.integrations.trello.IMPORT_ALL')}
				</Button>
				{!editing && (
					<Button type="button" size="sm" variant="ghost" disabled={anyPending} onClick={startEditing}>
						{t('settings.integrations.trello.LIST_MAP_EDIT')}
					</Button>
				)}
				<Button type="button" size="sm" variant="ghost" className="text-destructive-ink" disabled={anyPending} onClick={() => void trello.removeMapping(mapping.id).catch(() => undefined)}>
					{t('settings.integrations.trello.REMOVE_MAPPING')}
				</Button>
			</div>
		</div>
	);
}

function AddMappingRow({ trello }: TrelloProps) {
	const t = useTranslations();
	const boardId = useId();
	const projectId = useId();
	const directionId = useId();
	const [board, setBoard] = useState('');
	const [project, setProject] = useState('');
	const [direction, setDirection] = useState<TTrelloDirection>('inbound');
	const [fields, setFields] = useState<Record<string, string>>({});
	const lists = useTrelloLists(trello.integrationId, board || null);
	const statuses = useLinearStatusOptions(project || null);
	const unmapped = useMemo(() => {
		const mapped = new Set(trello.mappings.map((mapping) => mapping.trelloBoardId));
		return trello.boards.filter((candidate) => !mapped.has(candidate.id));
	}, [trello.boards, trello.mappings]);
	const isSaving = trello.pending.kind === 'create';
	const canSave = Boolean(board && project) && trello.pending.kind === null && canSaveListMap(fields, lists, statuses);

	const chooseBoard = (next: string) => {
		setBoard(next);
		setFields({});
	};

	const save = async () => {
		const chosen = trello.boards.find((candidate) => candidate.id === board);
		try {
			await trello.createMapping({ trelloBoardId: board, trelloBoardName: chosen?.name ?? null, projectId: project, direction, listMap: listMapOfFields(fields), syncEnabled: true });
			setBoard('');
			setProject('');
			setFields({});
		} catch {
			// The hook keeps the error for the page.
		}
	};

	if (!unmapped.length) {
		return <MutedRow>{trello.boards.length ? t('settings.integrations.trello.ALL_BOARDS_MAPPED') : t('settings.integrations.trello.NO_BOARDS')}</MutedRow>;
	}
	return (
		<div className={cn(ROW_DIVIDER, 'flex flex-col gap-3 px-4 py-3')} data-testid="trello-add-mapping">
			<span className={SETTINGS_ROW_LABEL}>{t('settings.integrations.trello.ADD_TITLE')}</span>
			<span className={SETTINGS_ROW_DESCRIPTION}>{t('settings.integrations.trello.ADD_DESCRIPTION')}</span>
			<div className="grid gap-3 sm:grid-cols-3">
				<label className="flex flex-col gap-1 text-xs text-muted-foreground" htmlFor={boardId}>
					{t('settings.integrations.trello.BOARD_LABEL')}
					<ChoiceSelect id={boardId} value={board} onChange={chooseBoard} disabled={isSaving} options={unmapped.map((item) => ({ value: item.id, label: item.name }))} placeholder={t('settings.integrations.trello.BOARD_PLACEHOLDER')} testId="trello-board" />
				</label>
				<label className="flex flex-col gap-1 text-xs text-muted-foreground" htmlFor={projectId}>
					{t('settings.integrations.trello.PROJECT_LABEL')}
					<ChoiceSelect id={projectId} value={project} onChange={setProject} disabled={isSaving} options={trello.projects.map((item) => ({ value: item.id, label: item.name }))} placeholder={t('settings.integrations.trello.PROJECT_PLACEHOLDER')} testId="trello-project" />
				</label>
				<label className="flex flex-col gap-1 text-xs text-muted-foreground" htmlFor={directionId}>
					{t('settings.integrations.trello.DIRECTION_LABEL')}
					<DirectionSelect id={directionId} value={direction} onChange={setDirection} disabled={isSaving} />
				</label>
			</div>
			{board && <ListMapFields lists={lists} fields={{ ...listFieldsOf(lists.items, {}), ...fields }} onChange={setFields} disabled={isSaving} statuses={statuses} />}
			<div>
				<Button type="button" size="sm" onClick={() => void save()} disabled={!canSave} aria-busy={isSaving || undefined} data-testid="trello-add-mapping-save">
					{isSaving ? t('settings.integrations.trello.SAVING') : t('settings.integrations.trello.ADD_MAPPING')}
				</Button>
			</div>
		</div>
	);
}

function RunLine({ run }: Readonly<{ run: ITrelloRun }>) {
	const t = useTranslations();
	const locale = useLocale();
	const when = run.startedAt ? formatDay(run.startedAt, locale) : '';
	const counts = t('settings.integrations.trello.RUN_COUNTS', { created: run.createdCount, updated: run.updatedCount, skipped: run.skippedCount, failed: run.failedCount });
	return (
		<li className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[13px]">
			<span className="text-foreground">{t(`settings.integrations.trello.RUN_${run.kind}` as DottedLanguageObjectStringPaths)}</span>
			<span className={badgeVariants({ variant: run.status === 'failed' ? 'warning' : run.status === 'running' ? 'info' : 'success' })}>
				{t(`settings.integrations.trello.RUN_STATUS_${run.status}` as DottedLanguageObjectStringPaths)}
			</span>
			<span className="text-muted-foreground">{when}</span>
			<span className="text-muted-foreground">{counts}</span>
			{run.lastError && <span className="min-w-0 basis-full truncate text-xs text-destructive-ink">{run.lastError}</span>}
		</li>
	);
}

function RunsRow({ trello }: TrelloProps) {
	const t = useTranslations();
	if (!trello.runs.length) return <MutedRow>{t('settings.integrations.trello.NO_RUNS')}</MutedRow>;
	return (
		<div className={cn(ROW_DIVIDER, 'flex flex-col gap-2 px-4 py-3')}>
			<span className={SETTINGS_ROW_LABEL}>{t('settings.integrations.trello.RUNS_TITLE')}</span>
			<ul className="flex flex-col gap-1.5">
				{trello.runs.slice(0, 8).map((run) => (
					<RunLine key={run.id} run={run} />
				))}
			</ul>
		</div>
	);
}

function TrelloConnected({ trello, onDisconnect }: TrelloProps & Readonly<{ onDisconnect: () => void }>) {
	const t = useTranslations();
	const panelId = useId();
	const [isOpen, setIsOpen] = useState(true);
	const connection = trello.connection;
	const needsAttention = Boolean(connection?.attentionReason);
	const member = connection?.trelloMemberName || connection?.trelloMemberUsername || '';
	const summary = member ? t('settings.integrations.trello.SUMMARY_CONNECTED', { member }) : t('settings.integrations.trello.SUMMARY_CONNECTED_NO_MEMBER');

	return (
		<SettingsSurface>
			<div>
				<button type="button" className={HEADER_BUTTON} aria-expanded={isOpen} aria-controls={panelId} onClick={() => setIsOpen((open) => !open)}>
					<TrelloTile />
					<span className="flex min-w-0 flex-1 flex-col gap-0.5">
						<span className={SETTINGS_ROW_LABEL}>{t('settings.integrations.trello.TITLE')}</span>
						<span className={cn(SETTINGS_ROW_DESCRIPTION, 'truncate')}>{summary}</span>
					</span>
					<span className={badgeVariants({ variant: needsAttention ? 'warning' : 'success' })}>
						{needsAttention ? t('settings.integrations.trello.STATE_ATTENTION') : t('settings.integrations.trello.STATE_CONNECTED')}
					</span>
					<ChevronDown aria-hidden="true" className={cn('size-4 shrink-0 text-muted-foreground transition-transform duration-200', isOpen && 'rotate-180')} />
				</button>
				<div id={panelId}>
					<AnimatedHeight>
						{isOpen && (
							<div>
								{connection?.attentionReason && <AttentionNote reason={connection.attentionReason} />}
								<TrelloFacts trello={trello} />
								<ActionErrorRow trello={trello} />
								<DetailsErrorRow trello={trello} />
								{trello.isLoadingDetails ? (
									<MutedRow>{t('settings.integrations.trello.LOADING_DETAILS')}</MutedRow>
								) : (
									<>
										{trello.mappings.map((mapping) => (
											<MappingRow key={mapping.id} trello={trello} mapping={mapping} />
										))}
										{trello.canManageMappings && <AddMappingRow trello={trello} />}
										<RunsRow trello={trello} />
									</>
								)}
								<div className={ROW_DIVIDER}>
									<DangerRow
										label={t('settings.integrations.trello.DISCONNECT_LABEL')}
										consequence={t('settings.integrations.trello.DISCONNECT_CONSEQUENCE')}
										actionLabel={t('settings.integrations.trello.DISCONNECT')}
										onAction={onDisconnect}
										disabled={trello.pending.kind !== null}
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

function TrelloLoadError({ trello }: TrelloProps) {
	const t = useTranslations();
	const reasonKey = errorReasonKeyOf(trello.readError) as DottedLanguageObjectStringPaths;
	return (
		<Notice
			tone="error"
			title={t('settings.integrations.trello.LOAD_ERROR_TITLE')}
			description={t(reasonKey)}
			actions={
				<Button type="button" variant="outline" onClick={trello.retry} disabled={trello.isRetrying}>
					{t('notifications.RETRY')}
				</Button>
			}
		/>
	);
}

function TrelloProviderBody({ trello, onDisconnect }: TrelloProps & Readonly<{ onDisconnect: () => void }>) {
	if (trello.status === 'loading') {
		return (
			<SettingsSurface>
				<GithubProviderRowSkeleton />
			</SettingsSurface>
		);
	}
	if (trello.status === 'loadError') return <TrelloLoadError trello={trello} />;
	if (trello.status === 'connected') return <TrelloConnected trello={trello} onDisconnect={onDisconnect} />;
	return (
		<SettingsSurface>
			<TrelloConnectRow trello={trello} canConnect={trello.status === 'notConnected'} />
			{trello.actionError && <ActionErrorRow trello={trello} />}
		</SettingsSurface>
	);
}

/**
 * Settings → Integrations → Trello: connect the organization's Trello member (Trello's authorize page, the token
 * brought back in the address and handed to the platform), map boards to projects with a task status per list,
 * register webhooks, import their cards, watch the runs, disconnect. Hidden where the deployment flag is off or
 * the platform does not serve the integration.
 */
export function TrelloProviderSection({ trello }: TrelloProps) {
	const t = useTranslations();
	const [confirming, setConfirming] = useState(false);
	if (trello.status === 'hidden') return null;
	const consequences: DangerConsequence[] = [
		{ key: 'sync', icon: <StopCircle />, text: t('settings.integrations.trello.DISCONNECT_STOPS_SYNC') },
		{ key: 'tasks', icon: <Task />, text: t('settings.integrations.trello.DISCONNECT_KEEPS_TASKS') }
	];

	const confirmDisconnect = async () => {
		try {
			await trello.disconnect();
			setConfirming(false);
		} catch {
			// The dialog shows the hook's error.
		}
	};

	return (
		<SettingsSection id="trello" title={t('settings.integrations.trello.SECTION_TITLE')} description={t('settings.integrations.trello.SECTION_DESCRIPTION')}>
			{trello.finishError && (
				<Notice
					tone="error"
					title={t('settings.integrations.trello.FINISH_ERROR_TITLE')}
					description={t(errorReasonKeyOf(trello.finishError) as DottedLanguageObjectStringPaths)}
					onDismiss={trello.clearFinishError}
					dismissLabel={t('common.CLOSE')}
				/>
			)}
			<TrelloProviderBody trello={trello} onDisconnect={() => setConfirming(true)} />
			<ConfirmDestructiveDialog
				open={confirming}
				onClose={() => {
					setConfirming(false);
					trello.clearDisconnectError();
				}}
				title={t('settings.integrations.trello.DISCONNECT_TITLE')}
				description={t('settings.integrations.trello.DISCONNECT_DESCRIPTION')}
				consequences={consequences}
				confirmLabel={t('settings.integrations.trello.DISCONNECT')}
				isPending={trello.pending.kind === 'disconnect'}
				error={trello.disconnectError ? t(errorReasonKeyOf(trello.disconnectError) as DottedLanguageObjectStringPaths) : undefined}
				onConfirm={() => void confirmDisconnect()}
			/>
		</SettingsSection>
	);
}
