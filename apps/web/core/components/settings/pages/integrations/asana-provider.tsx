'use client';

import { ReactNode, useCallback, useId, useMemo, useRef, useState } from 'react';
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
import { type AsanaIntegrationSettings, type AsanaLookup, useAsanaProjects, useAsanaSections } from '@/core/hooks/integrations/use-asana-integration';
import { type LinearStatusOptions, useLinearStatusOptions } from '@/core/hooks/integrations/use-linear-integration';
import { cn } from '@/core/lib/helpers';
import { errorReasonKeyOf } from '@/core/lib/utils/error-feedback';
import { invalidSectionFields, SECTION_BY_NAME, sectionFieldsOf, sectionMapOfFields } from '@/core/lib/utils/integration-asana-section-map';
import { matchStatusName } from '@/core/lib/utils/integration-linear-state-map';
import { ASANA_DIRECTIONS, IAsanaMapping, IAsanaRun, IAsanaSection, TAsanaDirection } from '@/core/types/interfaces/integrations/asana';
import { IntegrationConflictsRow } from './integration-conflicts-row';
import { GithubProviderRowSkeleton, PROVIDER_ROW, PROVIDER_TILE } from './integrations-settings-skeleton';

type AsanaProps = Readonly<{ asana: AsanaIntegrationSettings }>;

const ROW_DIVIDER = 'hairline-t';

const HEADER_BUTTON = cn(
	PROVIDER_ROW,
	'cursor-pointer outline-none transition-colors hover:bg-foreground/[0.025] focus-visible:bg-foreground/[0.025] focus-visible:inset-ring-2 focus-visible:inset-ring-ring/40'
);

const SELECT_TRIGGER = 'h-8 w-full min-w-0 text-[13px] sm:w-48';
const SELECT_CONTENT = 'max-h-72 w-64 overflow-y-auto p-1';
const STATUS_SELECT_TRIGGER = cn(SELECT_TRIGGER, 'sm:w-full');

function AsanaTile() {
	return (
		<span className={cn(PROVIDER_TILE, 'text-[13px] font-semibold')} aria-hidden="true">
			A
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

function ActionErrorRow({ asana }: AsanaProps) {
	const t = useTranslations();
	if (!asana.actionError) return null;
	const reasonKey = errorReasonKeyOf(asana.actionError) as DottedLanguageObjectStringPaths;
	return (
		<div className={ROW_DIVIDER}>
			<Notice tone="error" title={t('settings.integrations.asana.ACTION_FAILED')} description={t(reasonKey)} onDismiss={asana.clearActionError} dismissLabel={t('common.CLOSE')} />
		</div>
	);
}

function DetailsErrorRow({ asana }: AsanaProps) {
	const t = useTranslations();
	if (!asana.detailsError) return null;
	const reasonKey = errorReasonKeyOf(asana.detailsError) as DottedLanguageObjectStringPaths;
	return (
		<div className={ROW_DIVIDER}>
			<Notice
				tone="error"
				title={t('settings.integrations.asana.DETAILS_ERROR_TITLE')}
				description={t(reasonKey)}
				actions={
					<Button type="button" variant="outline" size="sm" onClick={asana.retryDetails} disabled={asana.isRetryingDetails}>
						{t('notifications.RETRY')}
					</Button>
				}
			/>
		</div>
	);
}

function AsanaConnectRow({ asana, canConnect }: AsanaProps & Readonly<{ canConnect: boolean }>) {
	const t = useTranslations();
	const noteId = useId();
	const isConnecting = asana.pending.kind === 'connect';
	const note = canConnect ? t('settings.integrations.asana.CONNECT_NOTE') : t('settings.integrations.asana.CONNECT_UNAVAILABLE');
	return (
		<div className={PROVIDER_ROW}>
			<AsanaTile />
			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				<span className={SETTINGS_ROW_LABEL}>{t('settings.integrations.asana.TITLE')}</span>
				<span id={noteId} className={SETTINGS_ROW_DESCRIPTION}>
					{note}
				</span>
			</div>
			<Button type="button" onClick={asana.connect} disabled={!canConnect || isConnecting} aria-describedby={noteId} aria-busy={isConnecting || undefined} className="shrink-0">
				{isConnecting ? t('settings.integrations.asana.CONNECTING') : t('settings.integrations.asana.CONNECT')}
			</Button>
		</div>
	);
}

function AsanaFacts({ asana }: AsanaProps) {
	const t = useTranslations();
	const locale = useLocale();
	const connection = asana.connection;
	if (!connection) return null;
	const account = connection.asanaUserName || connection.asanaUserEmail || '';
	return (
		<div className={cn(ROW_DIVIDER, 'px-4 py-3')}>
			<dl className="grid min-w-0 grid-cols-[minmax(0,7.5rem)_minmax(0,1fr)] gap-x-4 gap-y-1.5">
				{account && <FactRow label={t('settings.integrations.asana.FACT_ACCOUNT')} value={account} />}
				{connection.createdAt && <FactRow label={t('settings.integrations.asana.FACT_CONNECTED')} value={formatDay(connection.createdAt, locale)} />}
				<FactRow label={t('settings.integrations.asana.FACT_MAPPINGS')} value={t('settings.integrations.asana.FACT_MAPPINGS_VALUE', { count: asana.mappings.length })} />
				<FactRow label={t('settings.integrations.asana.FACT_WEBHOOKS')} value={asana.webhooks ? t('settings.integrations.asana.WEBHOOKS_ON') : t('settings.integrations.asana.WEBHOOKS_OFF')} />
			</dl>
		</div>
	);
}

function formatDay(value: string, locale: string): string {
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date);
}

function AttentionNote({ reason }: Readonly<{ reason: string }>) {
	const t = useTranslations();
	const key = reason === 'token_refused' ? 'settings.integrations.asana.ATTENTION_TOKEN_REFUSED' : 'settings.integrations.asana.ATTENTION_OTHER';
	return (
		<div className={cn(ROW_DIVIDER, 'flex items-start gap-2.5 px-4 py-3')}>
			<Alert className="mt-0.5 size-4 shrink-0 text-warning-foreground" />
			<p className="min-w-0 flex-1 text-[13px] text-pretty text-foreground">{t(key as DottedLanguageObjectStringPaths)}</p>
		</div>
	);
}

function DirectionSelect({ value, onChange, disabled, id }: Readonly<{ value: TAsanaDirection; onChange: (next: TAsanaDirection) => void; disabled: boolean; id?: string }>) {
	const t = useTranslations();
	return (
		<Select value={value} onValueChange={(next) => onChange(next as TAsanaDirection)} disabled={disabled}>
			<SelectTrigger id={id} className={SELECT_TRIGGER}>
				<SelectValue />
			</SelectTrigger>
			<SelectContent align="end" className={SELECT_CONTENT}>
				<SelectGroup>
					{ASANA_DIRECTIONS.map((direction) => (
						<SelectItem key={direction} value={direction} className="text-[13px]">
							{t(`settings.integrations.asana.DIRECTION_${direction}` as DottedLanguageObjectStringPaths)}
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

function LookupNote<T>({ lookup, empty, loading }: Readonly<{ lookup: AsanaLookup<T>; empty: string; loading: string }>) {
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

function SectionStatusSelect({ section, value, options, disabled, onChange }: Readonly<{ section: IAsanaSection; value: string; options: readonly { name: string }[]; disabled: boolean; onChange: (next: string) => void }>) {
	const t = useTranslations();
	const id = useId();
	const byName = value === SECTION_BY_NAME;
	const match = byName ? null : matchStatusName(value, options);
	const invalid = !byName && !match;
	return (
		<label className="flex flex-col gap-1 text-xs text-muted-foreground" htmlFor={id} data-testid={`asana-section-${section.gid}`}>
			{section.name}
			<Select value={byName ? SECTION_BY_NAME : (match?.name ?? value)} onValueChange={onChange} disabled={disabled}>
				<SelectTrigger id={id} className={cn(STATUS_SELECT_TRIGGER, invalid && 'border-destructive-ink')} aria-invalid={invalid || undefined}>
					<SelectValue />
				</SelectTrigger>
				<SelectContent align="start" className={SELECT_CONTENT}>
					<SelectGroup>
						<SelectItem value={SECTION_BY_NAME} textValue={t('settings.integrations.asana.SECTION_BY_NAME')} className="text-[13px]">
							{t('settings.integrations.asana.SECTION_BY_NAME')}
						</SelectItem>
						{invalid && value && (
							<SelectItem value={value} textValue={value} className="text-[13px] text-destructive-ink">
								{t('settings.integrations.asana.SECTION_MAP_UNKNOWN', { value })}
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

/** The section → status fields of one Asana project, validated against the statuses the project and the organization have. */
function SectionMapFields({ sections, fields, onChange, disabled, statuses }: Readonly<{ sections: AsanaLookup<IAsanaSection>; fields: Record<string, string>; onChange: (next: Record<string, string>) => void; disabled: boolean; statuses: LinearStatusOptions }>) {
	const t = useTranslations();
	const invalid = statuses.isLoading || statuses.error ? [] : invalidSectionFields(fields, statuses.options);
	return (
		<fieldset className="flex flex-col gap-2" data-testid="asana-section-map">
			<legend className="text-xs text-muted-foreground">{t('settings.integrations.asana.SECTION_MAP_LABEL')}</legend>
			<span className="text-xs text-muted-foreground">{t('settings.integrations.asana.SECTION_MAP_HINT')}</span>
			<LookupNote lookup={sections} empty={t('settings.integrations.asana.NO_SECTIONS')} loading={t('settings.integrations.asana.SECTIONS_LOADING')} />
			{statuses.error ? (
				<Notice
					tone="error"
					title={t('settings.integrations.asana.STATUSES_ERROR')}
					description={t(errorReasonKeyOf(statuses.error) as DottedLanguageObjectStringPaths)}
					actions={
						<Button type="button" variant="outline" size="sm" onClick={statuses.retry} disabled={statuses.isLoading}>
							{t('notifications.RETRY')}
						</Button>
					}
				/>
			) : (
				sections.items.length > 0 && (
					<div className="grid gap-2 sm:grid-cols-3">
						{sections.items.map((section) => (
							<SectionStatusSelect
								key={section.gid}
								section={section}
								value={fields[section.gid] ?? SECTION_BY_NAME}
								options={statuses.options}
								disabled={disabled || statuses.isLoading}
								onChange={(next) => onChange({ ...fields, [section.gid]: next })}
							/>
						))}
					</div>
				)
			)}
			{statuses.isLoading && sections.items.length > 0 && <span className="text-xs text-muted-foreground">{t('settings.integrations.asana.STATUSES_LOADING')}</span>}
			{invalid.length > 0 && (
				<span className="text-xs text-destructive-ink" role="alert">
					{t('settings.integrations.asana.SECTION_MAP_INVALID', { values: invalid.map((gid) => fields[gid]).join(', ') })}
				</span>
			)}
		</fieldset>
	);
}

/** Whether a section map may be saved: every chosen status is one (nothing while the statuses or the sections are unknown). */
function canSaveSectionMap(fields: Record<string, string>, sections: AsanaLookup<IAsanaSection>, statuses: LinearStatusOptions): boolean {
	return !sections.isLoading && !sections.error && !statuses.isLoading && !statuses.error && invalidSectionFields(fields, statuses.options).length === 0;
}

function MappingRow({ asana, mapping }: AsanaProps & Readonly<{ mapping: IAsanaMapping }>) {
	const t = useTranslations();
	const locale = useLocale();
	const switchId = useId();
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState<Record<string, string> | null>(null);
	const sections = useAsanaSections(editing ? asana.integrationId : null, editing ? mapping.asanaProjectGid : null);
	const statuses = useLinearStatusOptions(editing ? mapping.projectId : null);
	const isPending = asana.pending.mappingId === mapping.id;
	const anyPending = asana.pending.kind !== null;
	const projectName = asana.projects.find((project) => project.id === mapping.projectId)?.name ?? '';
	const asanaProjectLabel = mapping.asanaProjectName || mapping.asanaProjectGid;
	const mappedSections = Object.keys(mapping.sectionMap ?? {}).length;
	let lastImport = t('settings.integrations.asana.LAST_IMPORT_NEVER');
	if (mapping.lastImportedAt) lastImport = t('settings.integrations.asana.LAST_IMPORT', { date: formatDay(mapping.lastImportedAt, locale) });
	// The fields follow the sections once they are read; a kept choice of the person wins over the stored map.
	const fields = useMemo(() => ({ ...sectionFieldsOf(sections.items, mapping.sectionMap ?? {}), ...(draft ?? {}) }), [draft, mapping.sectionMap, sections.items]);

	const startEditing = () => {
		setDraft({});
		setEditing(true);
	};
	const stopEditing = () => {
		setEditing(false);
		setDraft(null);
	};
	const saveSectionMap = async () => {
		try {
			await asana.updateMapping(mapping.id, { sectionMap: sectionMapOfFields(fields) });
			stopEditing();
		} catch {
			// The hook keeps the error for the page.
		}
	};

	return (
		<div className={cn(ROW_DIVIDER, 'flex flex-col gap-3 px-4 py-3')} data-testid={`asana-mapping-${mapping.id}`}>
			<div className="flex flex-wrap items-center gap-3">
				<div className="flex min-w-0 flex-1 flex-col gap-0.5">
					<span className={SETTINGS_ROW_LABEL}>{asanaProjectLabel}</span>
					<span className={SETTINGS_ROW_DESCRIPTION}>
						{t('settings.integrations.asana.MAPPED_TO', { project: projectName })} · {lastImport}
						{mappedSections > 0 && <> · {t('settings.integrations.asana.SECTIONS_MAPPED', { count: mappedSections })}</>}
					</span>
					{mapping.lastError && <span className="text-xs text-destructive-ink">{mapping.lastError}</span>}
				</div>
				{asana.webhooks && (
					mapping.hasWebhook ? (
						<span className={badgeVariants({ variant: 'success' })} data-testid={`asana-webhook-on-${mapping.id}`}>
							{t('settings.integrations.asana.WEBHOOK_ON')}
						</span>
					) : (
						<Button type="button" size="sm" variant="outline" disabled={anyPending} aria-busy={(isPending && asana.pending.kind === 'webhook') || undefined} onClick={() => void asana.registerWebhook(mapping.id).catch(() => undefined)}>
							{t('settings.integrations.asana.WEBHOOK_REGISTER')}
						</Button>
					)
				)}
				<DirectionSelect value={mapping.direction} onChange={(direction) => void asana.updateMapping(mapping.id, { direction }).catch(() => undefined)} disabled={anyPending} />
				<label className="flex items-center gap-2 text-[13px] text-foreground" htmlFor={switchId}>
					<SettingsSwitch
						id={switchId}
						checked={mapping.syncEnabled}
						pending={isPending && asana.pending.kind === 'update'}
						disabled={anyPending}
						ariaLabel={t('settings.integrations.asana.SYNC_LABEL')}
						onCheckedChange={(syncEnabled) => void asana.updateMapping(mapping.id, { syncEnabled }).catch(() => undefined)}
					/>
					{t('settings.integrations.asana.SYNC_LABEL')}
				</label>
			</div>
			{editing && (
				<>
					<SectionMapFields sections={sections} fields={fields} onChange={setDraft} disabled={anyPending} statuses={statuses} />
					<div className="flex flex-wrap gap-2">
						<Button type="button" size="sm" onClick={() => void saveSectionMap()} disabled={anyPending || !canSaveSectionMap(fields, sections, statuses)} aria-busy={(isPending && asana.pending.kind === 'update') || undefined} data-testid={`asana-section-map-save-${mapping.id}`}>
							{t('settings.integrations.asana.SECTION_MAP_SAVE')}
						</Button>
						<Button type="button" size="sm" variant="ghost" onClick={stopEditing} disabled={anyPending}>
							{t('common.CANCEL')}
						</Button>
					</div>
				</>
			)}
			<div className="flex flex-wrap gap-2">
				<Button type="button" size="sm" variant="outline" disabled={anyPending} aria-busy={(isPending && asana.pending.kind === 'import') || undefined} onClick={() => void asana.importNow(mapping.id, false).catch(() => undefined)}>
					{t('settings.integrations.asana.IMPORT_CHANGES')}
				</Button>
				<Button type="button" size="sm" variant="ghost" disabled={anyPending} onClick={() => void asana.importNow(mapping.id, true).catch(() => undefined)}>
					{t('settings.integrations.asana.IMPORT_ALL')}
				</Button>
				{!editing && (
					<Button type="button" size="sm" variant="ghost" disabled={anyPending} onClick={startEditing}>
						{t('settings.integrations.asana.SECTION_MAP_EDIT')}
					</Button>
				)}
				<Button type="button" size="sm" variant="ghost" className="text-destructive-ink" disabled={anyPending} onClick={() => void asana.removeMapping(mapping.id).catch(() => undefined)}>
					{t('settings.integrations.asana.REMOVE_MAPPING')}
				</Button>
			</div>
		</div>
	);
}

function AddMappingRow({ asana }: AsanaProps) {
	const t = useTranslations();
	const workspaceId = useId();
	const asanaProjectId = useId();
	const projectId = useId();
	const directionId = useId();
	const [workspace, setWorkspace] = useState(() => (asana.workspaces.length === 1 ? asana.workspaces[0].gid : ''));
	const [asanaProject, setAsanaProject] = useState('');
	const [project, setProject] = useState('');
	const [direction, setDirection] = useState<TAsanaDirection>('inbound');
	const [fields, setFields] = useState<Record<string, string>>({});
	const asanaProjects = useAsanaProjects(asana.integrationId, workspace || null);
	const sections = useAsanaSections(asana.integrationId, asanaProject || null);
	const statuses = useLinearStatusOptions(project || null);
	const unmapped = useMemo(() => {
		const mapped = new Set(asana.mappings.map((mapping) => mapping.asanaProjectGid));
		return asanaProjects.items.filter((candidate) => !mapped.has(candidate.gid));
	}, [asana.mappings, asanaProjects.items]);
	const isSaving = asana.pending.kind === 'create';
	const canSave = Boolean(workspace && asanaProject && project) && asana.pending.kind === null && canSaveSectionMap(fields, sections, statuses);

	const chooseWorkspace = (next: string) => {
		setWorkspace(next);
		setAsanaProject('');
		setFields({});
	};
	const chooseAsanaProject = (next: string) => {
		setAsanaProject(next);
		setFields({});
	};

	const save = async () => {
		const chosen = asanaProjects.items.find((candidate) => candidate.gid === asanaProject);
		try {
			await asana.createMapping({ asanaWorkspaceGid: workspace, asanaProjectGid: asanaProject, asanaProjectName: chosen?.name ?? null, projectId: project, direction, sectionMap: sectionMapOfFields(fields), syncEnabled: true });
			setAsanaProject('');
			setProject('');
			setFields({});
		} catch {
			// The hook keeps the error for the page.
		}
	};

	if (!asana.workspaces.length) {
		return <MutedRow>{t('settings.integrations.asana.NO_WORKSPACES')}</MutedRow>;
	}
	return (
		<div className={cn(ROW_DIVIDER, 'flex flex-col gap-3 px-4 py-3')} data-testid="asana-add-mapping">
			<span className={SETTINGS_ROW_LABEL}>{t('settings.integrations.asana.ADD_TITLE')}</span>
			<span className={SETTINGS_ROW_DESCRIPTION}>{t('settings.integrations.asana.ADD_DESCRIPTION')}</span>
			<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
				<label className="flex flex-col gap-1 text-xs text-muted-foreground" htmlFor={workspaceId}>
					{t('settings.integrations.asana.WORKSPACE_LABEL')}
					<ChoiceSelect id={workspaceId} value={workspace} onChange={chooseWorkspace} disabled={isSaving} options={asana.workspaces.map((item) => ({ value: item.gid, label: item.name }))} placeholder={t('settings.integrations.asana.WORKSPACE_PLACEHOLDER')} testId="asana-workspace" />
				</label>
				<label className="flex flex-col gap-1 text-xs text-muted-foreground" htmlFor={asanaProjectId}>
					{t('settings.integrations.asana.ASANA_PROJECT_LABEL')}
					<ChoiceSelect id={asanaProjectId} value={asanaProject} onChange={chooseAsanaProject} disabled={isSaving || !workspace || asanaProjects.isLoading} options={unmapped.map((item) => ({ value: item.gid, label: item.name }))} placeholder={t('settings.integrations.asana.ASANA_PROJECT_PLACEHOLDER')} testId="asana-asana-project" />
					{workspace && <LookupNote lookup={{ ...asanaProjects, items: unmapped }} empty={t('settings.integrations.asana.NO_PROJECTS')} loading={t('settings.integrations.asana.PROJECTS_LOADING')} />}
				</label>
				<label className="flex flex-col gap-1 text-xs text-muted-foreground" htmlFor={projectId}>
					{t('settings.integrations.asana.PROJECT_LABEL')}
					<ChoiceSelect id={projectId} value={project} onChange={setProject} disabled={isSaving} options={asana.projects.map((item) => ({ value: item.id, label: item.name }))} placeholder={t('settings.integrations.asana.PROJECT_PLACEHOLDER')} testId="asana-project" />
				</label>
				<label className="flex flex-col gap-1 text-xs text-muted-foreground" htmlFor={directionId}>
					{t('settings.integrations.asana.DIRECTION_LABEL')}
					<DirectionSelect id={directionId} value={direction} onChange={setDirection} disabled={isSaving} />
				</label>
			</div>
			{asanaProject && <SectionMapFields sections={sections} fields={{ ...sectionFieldsOf(sections.items, {}), ...fields }} onChange={setFields} disabled={isSaving} statuses={statuses} />}
			<div>
				<Button type="button" size="sm" onClick={() => void save()} disabled={!canSave} aria-busy={isSaving || undefined} data-testid="asana-add-mapping-save">
					{isSaving ? t('settings.integrations.asana.SAVING') : t('settings.integrations.asana.ADD_MAPPING')}
				</Button>
			</div>
		</div>
	);
}

function RunLine({ run, onShowConflicts }: Readonly<{ run: IAsanaRun; onShowConflicts: (runId: string) => void }>) {
	const t = useTranslations();
	const locale = useLocale();
	const when = run.startedAt ? formatDay(run.startedAt, locale) : '';
	const counts = t('settings.integrations.asana.RUN_COUNTS', { created: run.createdCount, updated: run.updatedCount, skipped: run.skippedCount, failed: run.failedCount });
	return (
		<li className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[13px]">
			<span className="text-foreground">{t(`settings.integrations.asana.RUN_${run.kind}` as DottedLanguageObjectStringPaths)}</span>
			<span className={badgeVariants({ variant: run.status === 'failed' ? 'warning' : run.status === 'running' ? 'info' : 'success' })}>
				{t(`settings.integrations.asana.RUN_STATUS_${run.status}` as DottedLanguageObjectStringPaths)}
			</span>
			<span className="text-muted-foreground">{when}</span>
			<span className="text-muted-foreground">{counts}</span>
			{run.conflictCount ? (
				<button
					type="button"
					className={cn(badgeVariants({ variant: 'warning' }), 'cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring/40')}
					title={t('settings.integrations.conflicts.SHOW_RUN_CONFLICTS')}
					onClick={() => onShowConflicts(run.id)}
				>
					{t('settings.integrations.conflicts.RUN_COUNT', { count: run.conflictCount })}
				</button>
			) : null}
			{run.lastError && <span className="min-w-0 basis-full truncate text-xs text-destructive-ink">{run.lastError}</span>}
		</li>
	);
}

function RunsRow({ asana, onShowConflicts }: AsanaProps & Readonly<{ onShowConflicts: (runId: string) => void }>) {
	const t = useTranslations();
	if (!asana.runs.length) return <MutedRow>{t('settings.integrations.asana.NO_RUNS')}</MutedRow>;
	return (
		<div className={cn(ROW_DIVIDER, 'flex flex-col gap-2 px-4 py-3')}>
			<span className={SETTINGS_ROW_LABEL}>{t('settings.integrations.asana.RUNS_TITLE')}</span>
			<ul className="flex flex-col gap-1.5">
				{asana.runs.slice(0, 8).map((run) => (
					<RunLine key={run.id} run={run} onShowConflicts={onShowConflicts} />
				))}
			</ul>
		</div>
	);
}

function AsanaConnected({ asana, onDisconnect }: AsanaProps & Readonly<{ onDisconnect: () => void }>) {
	const t = useTranslations();
	const panelId = useId();
	const [isOpen, setIsOpen] = useState(true);
	// The runs list's count of a run narrows the conflicts to that run, and brings them into view.
	const [conflictRunId, setConflictRunId] = useState<string | null>(null);
	const conflictsRef = useRef<HTMLDivElement>(null);
	const showRunConflicts = useCallback((runId: string) => {
		setConflictRunId(runId);
		conflictsRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
	}, []);
	const connection = asana.connection;
	const needsAttention = Boolean(connection?.attentionReason);
	const account = connection?.asanaUserName || connection?.asanaUserEmail || '';
	const summary = account ? t('settings.integrations.asana.SUMMARY_CONNECTED', { account }) : t('settings.integrations.asana.SUMMARY_CONNECTED_NO_ACCOUNT');

	return (
		<SettingsSurface>
			<div>
				<button type="button" className={HEADER_BUTTON} aria-expanded={isOpen} aria-controls={panelId} onClick={() => setIsOpen((open) => !open)}>
					<AsanaTile />
					<span className="flex min-w-0 flex-1 flex-col gap-0.5">
						<span className={SETTINGS_ROW_LABEL}>{t('settings.integrations.asana.TITLE')}</span>
						<span className={cn(SETTINGS_ROW_DESCRIPTION, 'truncate')}>{summary}</span>
					</span>
					<span className={badgeVariants({ variant: needsAttention ? 'warning' : 'success' })}>
						{needsAttention ? t('settings.integrations.asana.STATE_ATTENTION') : t('settings.integrations.asana.STATE_CONNECTED')}
					</span>
					<ChevronDown aria-hidden="true" className={cn('size-4 shrink-0 text-muted-foreground transition-transform duration-200', isOpen && 'rotate-180')} />
				</button>
				<div id={panelId}>
					<AnimatedHeight>
						{isOpen && (
							<div>
								{connection?.attentionReason && <AttentionNote reason={connection.attentionReason} />}
								<AsanaFacts asana={asana} />
								<ActionErrorRow asana={asana} />
								<DetailsErrorRow asana={asana} />
								{asana.isLoadingDetails ? (
									<MutedRow>{t('settings.integrations.asana.LOADING_DETAILS')}</MutedRow>
								) : (
									<>
										{asana.mappings.map((mapping) => (
											<MappingRow key={mapping.id} asana={asana} mapping={mapping} />
										))}
										{asana.canManageMappings && <AddMappingRow asana={asana} />}
										{connection && (
											<div ref={conflictsRef}>
												<IntegrationConflictsRow
													provider="asana"
													providerName={t('settings.integrations.asana.TITLE')}
													integrationId={connection.id}
													runId={conflictRunId}
													onClearRun={() => setConflictRunId(null)}
												/>
											</div>
										)}
										<RunsRow asana={asana} onShowConflicts={showRunConflicts} />
									</>
								)}
								<div className={ROW_DIVIDER}>
									<DangerRow
										label={t('settings.integrations.asana.DISCONNECT_LABEL')}
										consequence={t('settings.integrations.asana.DISCONNECT_CONSEQUENCE')}
										actionLabel={t('settings.integrations.asana.DISCONNECT')}
										onAction={onDisconnect}
										disabled={asana.pending.kind !== null}
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

function AsanaLoadError({ asana }: AsanaProps) {
	const t = useTranslations();
	const reasonKey = errorReasonKeyOf(asana.readError) as DottedLanguageObjectStringPaths;
	return (
		<Notice
			tone="error"
			title={t('settings.integrations.asana.LOAD_ERROR_TITLE')}
			description={t(reasonKey)}
			actions={
				<Button type="button" variant="outline" onClick={asana.retry} disabled={asana.isRetrying}>
					{t('notifications.RETRY')}
				</Button>
			}
		/>
	);
}

function AsanaProviderBody({ asana, onDisconnect }: AsanaProps & Readonly<{ onDisconnect: () => void }>) {
	if (asana.status === 'loading') {
		return (
			<SettingsSurface>
				<GithubProviderRowSkeleton />
			</SettingsSurface>
		);
	}
	if (asana.status === 'loadError') return <AsanaLoadError asana={asana} />;
	if (asana.status === 'connected') return <AsanaConnected asana={asana} onDisconnect={onDisconnect} />;
	return (
		<SettingsSurface>
			<AsanaConnectRow asana={asana} canConnect={asana.status === 'notConnected'} />
			{asana.actionError ? <ActionErrorRow asana={asana} /> : null}
		</SettingsSurface>
	);
}

/**
 * Settings → Integrations → Asana: connect the organization's Asana account (the platform's OAuth flow), map
 * Asana projects to projects with a task status per section, register webhooks, import their tasks, watch the
 * runs, disconnect. Hidden where the deployment flag is off or the platform does not serve the integration.
 */
export function AsanaProviderSection({ asana }: AsanaProps) {
	const t = useTranslations();
	const [confirming, setConfirming] = useState(false);
	if (asana.status === 'hidden') return null;
	const consequences: DangerConsequence[] = [
		{ key: 'sync', icon: <StopCircle />, text: t('settings.integrations.asana.DISCONNECT_STOPS_SYNC') },
		{ key: 'tasks', icon: <Task />, text: t('settings.integrations.asana.DISCONNECT_KEEPS_TASKS') }
	];

	const confirmDisconnect = async () => {
		try {
			await asana.disconnect();
			setConfirming(false);
		} catch {
			// The dialog shows the hook's error.
		}
	};

	return (
		<SettingsSection id="asana" title={t('settings.integrations.asana.SECTION_TITLE')} description={t('settings.integrations.asana.SECTION_DESCRIPTION')}>
			{asana.callbackError && (
				<Notice
					tone="error"
					title={t('settings.integrations.asana.CALLBACK_ERROR_TITLE')}
					description={t(`settings.integrations.asana.CALLBACK_${asana.callbackError}` as DottedLanguageObjectStringPaths)}
					onDismiss={asana.dismissCallbackError}
					dismissLabel={t('common.CLOSE')}
				/>
			)}
			<AsanaProviderBody asana={asana} onDisconnect={() => setConfirming(true)} />
			<ConfirmDestructiveDialog
				open={confirming}
				onClose={() => {
					setConfirming(false);
					asana.clearDisconnectError();
				}}
				title={t('settings.integrations.asana.DISCONNECT_TITLE')}
				description={t('settings.integrations.asana.DISCONNECT_DESCRIPTION')}
				consequences={consequences}
				confirmLabel={t('settings.integrations.asana.DISCONNECT')}
				isPending={asana.pending.kind === 'disconnect'}
				error={asana.disconnectError ? t(errorReasonKeyOf(asana.disconnectError) as DottedLanguageObjectStringPaths) : undefined}
				onConfirm={() => void confirmDisconnect()}
			/>
		</SettingsSection>
	);
}
