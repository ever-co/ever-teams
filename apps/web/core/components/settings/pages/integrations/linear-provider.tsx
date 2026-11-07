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
import type { LinearIntegrationSettings } from '@/core/hooks/integrations/use-linear-integration';
import { cn } from '@/core/lib/helpers';
import { errorReasonKeyOf } from '@/core/lib/utils/error-feedback';
import { formatInstallDay } from '@/core/lib/utils/settings-integrations';
import {
	ILinearMapping,
	ILinearRun,
	LINEAR_DIRECTIONS,
	LINEAR_STATE_KINDS,
	TLinearDirection,
	TLinearStateKind
} from '@/core/types/interfaces/integrations/linear';
import { GithubProviderRowSkeleton, PROVIDER_ROW, PROVIDER_TILE } from './integrations-settings-skeleton';

type LinearProps = Readonly<{ linear: LinearIntegrationSettings }>;

const ROW_DIVIDER = 'hairline-t';

const HEADER_BUTTON = cn(
	PROVIDER_ROW,
	'cursor-pointer outline-none transition-colors hover:bg-foreground/[0.025] focus-visible:bg-foreground/[0.025] focus-visible:inset-ring-2 focus-visible:inset-ring-ring/40'
);

const SELECT_TRIGGER = 'h-8 w-full min-w-0 text-[13px] sm:w-48';
const SELECT_CONTENT = 'max-h-72 w-64 overflow-y-auto p-1';
const FIELD_INPUT =
	'h-8 w-full rounded-md border border-border bg-background px-2 text-[13px] text-foreground outline-none focus-visible:inset-ring-2 focus-visible:inset-ring-ring/40';

/** The task status each kind of Linear state becomes unless the mapping says otherwise (the platform's own defaults). */
const FALLBACK_STATE_MAP: Record<TLinearStateKind, string> = {
	triage: 'open',
	backlog: 'backlog',
	unstarted: 'open',
	started: 'in-progress',
	completed: 'completed',
	canceled: 'cancelled'
};

function LinearTile() {
	return (
		<span className={cn(PROVIDER_TILE, 'text-[13px] font-semibold')} aria-hidden="true">
			L
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

function ActionErrorRow({ linear }: LinearProps) {
	const t = useTranslations();
	if (!linear.actionError) return null;
	const reasonKey = errorReasonKeyOf(linear.actionError) as DottedLanguageObjectStringPaths;
	return (
		<div className={ROW_DIVIDER}>
			<Notice tone="error" title={t('settings.integrations.linear.ACTION_FAILED')} description={t(reasonKey)} onDismiss={linear.clearActionError} dismissLabel={t('common.CLOSE')} />
		</div>
	);
}

function DetailsErrorRow({ linear }: LinearProps) {
	const t = useTranslations();
	if (!linear.detailsError) return null;
	const reasonKey = errorReasonKeyOf(linear.detailsError) as DottedLanguageObjectStringPaths;
	return (
		<div className={ROW_DIVIDER}>
			<Notice
				tone="error"
				title={t('settings.integrations.linear.DETAILS_ERROR_TITLE')}
				description={t(reasonKey)}
				actions={
					<Button type="button" variant="outline" size="sm" onClick={linear.retryDetails} disabled={linear.isRetryingDetails}>
						{t('notifications.RETRY')}
					</Button>
				}
			/>
		</div>
	);
}

function LinearConnectRow({ linear, canConnect }: LinearProps & Readonly<{ canConnect: boolean }>) {
	const t = useTranslations();
	const noteId = useId();
	const isConnecting = linear.pending.kind === 'connect';
	const note = canConnect ? t('settings.integrations.linear.CONNECT_NOTE') : t('settings.integrations.linear.CONNECT_UNAVAILABLE');
	return (
		<div className={PROVIDER_ROW}>
			<LinearTile />
			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				<span className={SETTINGS_ROW_LABEL}>{t('settings.integrations.linear.TITLE')}</span>
				<span id={noteId} className={SETTINGS_ROW_DESCRIPTION}>
					{note}
				</span>
			</div>
			<Button type="button" onClick={linear.connect} disabled={!canConnect || isConnecting} aria-describedby={noteId} aria-busy={isConnecting || undefined} className="shrink-0">
				{isConnecting ? t('settings.integrations.linear.CONNECTING') : t('settings.integrations.linear.CONNECT')}
			</Button>
		</div>
	);
}

function LinearFacts({ linear }: LinearProps) {
	const t = useTranslations();
	const locale = useLocale();
	const connection = linear.connection;
	if (!connection) return null;
	const workspace = connection.linearOrganizationName || connection.linearOrganizationUrlKey || '';
	return (
		<div className={cn(ROW_DIVIDER, 'px-4 py-3')}>
			<dl className="grid min-w-0 grid-cols-[minmax(0,7.5rem)_minmax(0,1fr)] gap-x-4 gap-y-1.5">
				{workspace && <FactRow label={t('settings.integrations.linear.FACT_WORKSPACE')} value={workspace} />}
				{connection.createdAt && <FactRow label={t('settings.integrations.linear.FACT_CONNECTED')} value={formatInstallDay(new Date(connection.createdAt), locale)} />}
				<FactRow label={t('settings.integrations.linear.FACT_MAPPINGS')} value={t('settings.integrations.linear.FACT_MAPPINGS_VALUE', { count: linear.mappings.length })} />
			</dl>
		</div>
	);
}

function AttentionNote({ reason }: Readonly<{ reason: string }>) {
	const t = useTranslations();
	const key = reason === 'token_refused' ? 'settings.integrations.linear.ATTENTION_TOKEN_REFUSED' : 'settings.integrations.linear.ATTENTION_OTHER';
	return (
		<div className={cn(ROW_DIVIDER, 'flex items-start gap-2.5 px-4 py-3')}>
			<Alert className="mt-0.5 size-4 shrink-0 text-warning-foreground" />
			<p className="min-w-0 flex-1 text-[13px] text-pretty text-foreground">{t(key as DottedLanguageObjectStringPaths)}</p>
		</div>
	);
}

function DirectionSelect({ value, onChange, disabled, id }: Readonly<{ value: TLinearDirection; onChange: (next: TLinearDirection) => void; disabled: boolean; id?: string }>) {
	const t = useTranslations();
	return (
		<Select value={value} onValueChange={(next) => onChange(next as TLinearDirection)} disabled={disabled}>
			<SelectTrigger id={id} className={SELECT_TRIGGER}>
				<SelectValue />
			</SelectTrigger>
			<SelectContent align="end" className={SELECT_CONTENT}>
				<SelectGroup>
					{LINEAR_DIRECTIONS.map((direction) => (
						<SelectItem key={direction} value={direction} className="text-[13px]">
							{t(`settings.integrations.linear.DIRECTION_${direction}` as DottedLanguageObjectStringPaths)}
						</SelectItem>
					))}
				</SelectGroup>
			</SelectContent>
		</Select>
	);
}

function ProjectSelect({ value, onChange, disabled, projects, id }: Readonly<{ value: string; onChange: (next: string) => void; disabled: boolean; projects: LinearIntegrationSettings['projects']; id?: string }>) {
	const t = useTranslations();
	return (
		<Select value={value} onValueChange={onChange} disabled={disabled}>
			<SelectTrigger id={id} className={SELECT_TRIGGER}>
				<SelectValue placeholder={t('settings.integrations.linear.PROJECT_PLACEHOLDER')} />
			</SelectTrigger>
			<SelectContent align="end" className={SELECT_CONTENT}>
				<SelectGroup>
					{projects.map((project) => (
						<SelectItem key={project.id} value={project.id} textValue={project.name} className="text-[13px]">
							{project.name}
						</SelectItem>
					))}
				</SelectGroup>
			</SelectContent>
		</Select>
	);
}

function MappingRow({ linear, mapping }: LinearProps & Readonly<{ mapping: ILinearMapping }>) {
	const t = useTranslations();
	const locale = useLocale();
	const switchId = useId();
	const isPending = linear.pending.mappingId === mapping.id;
	const anyPending = linear.pending.kind !== null;
	const projectName = linear.projects.find((project) => project.id === mapping.projectId)?.name ?? '';
	const teamLabel = [mapping.linearTeamKey, mapping.linearTeamName].filter(Boolean).join(' · ') || mapping.linearTeamId;
	let lastImport = t('settings.integrations.linear.LAST_IMPORT_NEVER');
	if (mapping.lastImportedAt) lastImport = t('settings.integrations.linear.LAST_IMPORT', { date: formatInstallDay(new Date(mapping.lastImportedAt), locale) });

	return (
		<div className={cn(ROW_DIVIDER, 'flex flex-col gap-3 px-4 py-3')} data-testid={`linear-mapping-${mapping.id}`}>
			<div className="flex flex-wrap items-center gap-3">
				<div className="flex min-w-0 flex-1 flex-col gap-0.5">
					<span className={SETTINGS_ROW_LABEL}>{teamLabel}</span>
					<span className={SETTINGS_ROW_DESCRIPTION}>
						{t('settings.integrations.linear.MAPPED_TO', { project: projectName })} · {lastImport}
					</span>
					{mapping.lastError && <span className="text-xs text-destructive-ink">{mapping.lastError}</span>}
				</div>
				<DirectionSelect value={mapping.direction} onChange={(direction) => void linear.updateMapping(mapping.id, { direction }).catch(() => undefined)} disabled={anyPending} />
				<label className="flex items-center gap-2 text-[13px] text-foreground" htmlFor={switchId}>
					<SettingsSwitch
						id={switchId}
						checked={mapping.syncEnabled}
						pending={isPending && linear.pending.kind === 'update'}
						disabled={anyPending}
						ariaLabel={t('settings.integrations.linear.SYNC_LABEL')}
						onCheckedChange={(syncEnabled) => void linear.updateMapping(mapping.id, { syncEnabled }).catch(() => undefined)}
					/>
					{t('settings.integrations.linear.SYNC_LABEL')}
				</label>
			</div>
			<div className="flex flex-wrap gap-2">
				<Button type="button" size="sm" variant="outline" disabled={anyPending} aria-busy={(isPending && linear.pending.kind === 'import') || undefined} onClick={() => void linear.importNow(mapping.id, false).catch(() => undefined)}>
					{t('settings.integrations.linear.IMPORT_CHANGES')}
				</Button>
				<Button type="button" size="sm" variant="ghost" disabled={anyPending} onClick={() => void linear.importNow(mapping.id, true).catch(() => undefined)}>
					{t('settings.integrations.linear.IMPORT_ALL')}
				</Button>
				<Button type="button" size="sm" variant="ghost" className="text-destructive-ink" disabled={anyPending} onClick={() => void linear.removeMapping(mapping.id).catch(() => undefined)}>
					{t('settings.integrations.linear.REMOVE_MAPPING')}
				</Button>
			</div>
		</div>
	);
}

function AddMappingRow({ linear }: LinearProps) {
	const t = useTranslations();
	const teamId = useId();
	const projectId = useId();
	const directionId = useId();
	const [team, setTeam] = useState('');
	const [project, setProject] = useState('');
	const [direction, setDirection] = useState<TLinearDirection>('inbound');
	const [stateMap, setStateMap] = useState<Record<TLinearStateKind, string>>(() => ({ ...FALLBACK_STATE_MAP, ...(linear.defaultStateMap as Partial<Record<TLinearStateKind, string>>) }));
	const unmapped = useMemo(() => {
		const mapped = new Set(linear.mappings.map((mapping) => mapping.linearTeamId));
		return linear.teams.filter((candidate) => !mapped.has(candidate.id));
	}, [linear.mappings, linear.teams]);
	const isSaving = linear.pending.kind === 'create';
	const canSave = Boolean(team && project) && linear.pending.kind === null;

	const save = async () => {
		const chosen = linear.teams.find((candidate) => candidate.id === team);
		try {
			await linear.createMapping({ linearTeamId: team, linearTeamKey: chosen?.key ?? null, linearTeamName: chosen?.name ?? null, projectId: project, direction, stateMap, syncEnabled: true });
			setTeam('');
			setProject('');
		} catch {
			// The hook keeps the error for the page.
		}
	};

	if (!unmapped.length) {
		return <MutedRow>{linear.teams.length ? t('settings.integrations.linear.ALL_TEAMS_MAPPED') : t('settings.integrations.linear.NO_TEAMS')}</MutedRow>;
	}
	return (
		<div className={cn(ROW_DIVIDER, 'flex flex-col gap-3 px-4 py-3')} data-testid="linear-add-mapping">
			<span className={SETTINGS_ROW_LABEL}>{t('settings.integrations.linear.ADD_TITLE')}</span>
			<span className={SETTINGS_ROW_DESCRIPTION}>{t('settings.integrations.linear.ADD_DESCRIPTION')}</span>
			<div className="grid gap-3 sm:grid-cols-3">
				<label className="flex flex-col gap-1 text-xs text-muted-foreground" htmlFor={teamId}>
					{t('settings.integrations.linear.TEAM_LABEL')}
					<Select value={team} onValueChange={setTeam} disabled={isSaving}>
						<SelectTrigger id={teamId} className={SELECT_TRIGGER}>
							<SelectValue placeholder={t('settings.integrations.linear.TEAM_PLACEHOLDER')} />
						</SelectTrigger>
						<SelectContent align="start" className={SELECT_CONTENT}>
							<SelectGroup>
								{unmapped.map((candidate) => (
									<SelectItem key={candidate.id} value={candidate.id} textValue={candidate.name} className="text-[13px]">
										{candidate.key} · {candidate.name}
									</SelectItem>
								))}
							</SelectGroup>
						</SelectContent>
					</Select>
				</label>
				<label className="flex flex-col gap-1 text-xs text-muted-foreground" htmlFor={projectId}>
					{t('settings.integrations.linear.PROJECT_LABEL')}
					<ProjectSelect id={projectId} value={project} onChange={setProject} disabled={isSaving} projects={linear.projects} />
				</label>
				<label className="flex flex-col gap-1 text-xs text-muted-foreground" htmlFor={directionId}>
					{t('settings.integrations.linear.DIRECTION_LABEL')}
					<DirectionSelect id={directionId} value={direction} onChange={setDirection} disabled={isSaving} />
				</label>
			</div>
			<fieldset className="flex flex-col gap-2">
				<legend className="text-xs text-muted-foreground">{t('settings.integrations.linear.STATE_MAP_LABEL')}</legend>
				<div className="grid gap-2 sm:grid-cols-3">
					{LINEAR_STATE_KINDS.map((kind) => (
						<label key={kind} className="flex flex-col gap-1 text-xs text-muted-foreground">
							{t(`settings.integrations.linear.STATE_${kind}` as DottedLanguageObjectStringPaths)}
							<input
								className={FIELD_INPUT}
								value={stateMap[kind]}
								disabled={isSaving}
								onChange={(event) => setStateMap((current) => ({ ...current, [kind]: event.target.value }))}
							/>
						</label>
					))}
				</div>
			</fieldset>
			<div>
				<Button type="button" size="sm" onClick={() => void save()} disabled={!canSave} aria-busy={isSaving || undefined} data-testid="linear-add-mapping-save">
					{isSaving ? t('settings.integrations.linear.SAVING') : t('settings.integrations.linear.ADD_MAPPING')}
				</Button>
			</div>
		</div>
	);
}

function RunLine({ run }: Readonly<{ run: ILinearRun }>) {
	const t = useTranslations();
	const locale = useLocale();
	const when = run.startedAt ? formatInstallDay(new Date(run.startedAt), locale) : '';
	const counts = t('settings.integrations.linear.RUN_COUNTS', { created: run.createdCount, updated: run.updatedCount, skipped: run.skippedCount, failed: run.failedCount });
	return (
		<li className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[13px]">
			<span className="text-foreground">{t(`settings.integrations.linear.RUN_${run.kind}` as DottedLanguageObjectStringPaths)}</span>
			<span className={badgeVariants({ variant: run.status === 'failed' ? 'warning' : run.status === 'running' ? 'info' : 'success' })}>
				{t(`settings.integrations.linear.RUN_STATUS_${run.status}` as DottedLanguageObjectStringPaths)}
			</span>
			<span className="text-muted-foreground">{when}</span>
			<span className="text-muted-foreground">{counts}</span>
			{run.lastError && <span className="min-w-0 basis-full truncate text-xs text-destructive-ink">{run.lastError}</span>}
		</li>
	);
}

function RunsRow({ linear }: LinearProps) {
	const t = useTranslations();
	if (!linear.runs.length) return <MutedRow>{t('settings.integrations.linear.NO_RUNS')}</MutedRow>;
	return (
		<div className={cn(ROW_DIVIDER, 'flex flex-col gap-2 px-4 py-3')}>
			<span className={SETTINGS_ROW_LABEL}>{t('settings.integrations.linear.RUNS_TITLE')}</span>
			<ul className="flex flex-col gap-1.5">
				{linear.runs.slice(0, 8).map((run) => (
					<RunLine key={run.id} run={run} />
				))}
			</ul>
		</div>
	);
}

function LinearConnected({ linear, onDisconnect }: LinearProps & Readonly<{ onDisconnect: () => void }>) {
	const t = useTranslations();
	const panelId = useId();
	const [isOpen, setIsOpen] = useState(true);
	const connection = linear.connection;
	const needsAttention = Boolean(connection?.attentionReason);
	const workspace = connection?.linearOrganizationName || connection?.linearOrganizationUrlKey || '';
	const summary = workspace ? t('settings.integrations.linear.SUMMARY_CONNECTED', { workspace }) : t('settings.integrations.linear.SUMMARY_CONNECTED_NO_WORKSPACE');

	return (
		<SettingsSurface>
			<div>
				<button type="button" className={HEADER_BUTTON} aria-expanded={isOpen} aria-controls={panelId} onClick={() => setIsOpen((open) => !open)}>
					<LinearTile />
					<span className="flex min-w-0 flex-1 flex-col gap-0.5">
						<span className={SETTINGS_ROW_LABEL}>{t('settings.integrations.linear.TITLE')}</span>
						<span className={cn(SETTINGS_ROW_DESCRIPTION, 'truncate')}>{summary}</span>
					</span>
					<span className={badgeVariants({ variant: needsAttention ? 'warning' : 'success' })}>
						{needsAttention ? t('settings.integrations.linear.STATE_ATTENTION') : t('settings.integrations.linear.STATE_CONNECTED')}
					</span>
					<ChevronDown aria-hidden="true" className={cn('size-4 shrink-0 text-muted-foreground transition-transform duration-200', isOpen && 'rotate-180')} />
				</button>
				<div id={panelId}>
					<AnimatedHeight>
						{isOpen && (
							<div>
								{connection?.attentionReason && <AttentionNote reason={connection.attentionReason} />}
								<LinearFacts linear={linear} />
								<ActionErrorRow linear={linear} />
								<DetailsErrorRow linear={linear} />
								{linear.isLoadingDetails ? (
									<MutedRow>{t('settings.integrations.linear.LOADING_DETAILS')}</MutedRow>
								) : (
									<>
										{linear.mappings.map((mapping) => (
											<MappingRow key={mapping.id} linear={linear} mapping={mapping} />
										))}
										<AddMappingRow linear={linear} />
										<RunsRow linear={linear} />
									</>
								)}
								<div className={ROW_DIVIDER}>
									<DangerRow
										label={t('settings.integrations.linear.DISCONNECT_LABEL')}
										consequence={t('settings.integrations.linear.DISCONNECT_CONSEQUENCE')}
										actionLabel={t('settings.integrations.linear.DISCONNECT')}
										onAction={onDisconnect}
										disabled={linear.pending.kind !== null}
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

function LinearLoadError({ linear }: LinearProps) {
	const t = useTranslations();
	const reasonKey = errorReasonKeyOf(linear.readError) as DottedLanguageObjectStringPaths;
	return (
		<Notice
			tone="error"
			title={t('settings.integrations.linear.LOAD_ERROR_TITLE')}
			description={t(reasonKey)}
			actions={
				<Button type="button" variant="outline" onClick={linear.retry} disabled={linear.isRetrying}>
					{t('notifications.RETRY')}
				</Button>
			}
		/>
	);
}

function LinearProviderBody({ linear, onDisconnect }: LinearProps & Readonly<{ onDisconnect: () => void }>) {
	if (linear.status === 'loading') {
		return (
			<SettingsSurface>
				<GithubProviderRowSkeleton />
			</SettingsSurface>
		);
	}
	if (linear.status === 'loadError') return <LinearLoadError linear={linear} />;
	if (linear.status === 'connected') return <LinearConnected linear={linear} onDisconnect={onDisconnect} />;
	return (
		<SettingsSurface>
			<LinearConnectRow linear={linear} canConnect={linear.status === 'notConnected'} />
			{linear.actionError && <ActionErrorRow linear={linear} />}
		</SettingsSurface>
	);
}

/**
 * Settings → Integrations → Linear: connect the organization's workspace (the platform's OAuth flow), map Linear
 * teams to projects, import their issues, watch the runs, disconnect. Hidden where the deployment flag is off or
 * the platform does not serve the integration.
 */
export function LinearProviderSection({ linear }: LinearProps) {
	const t = useTranslations();
	const [confirming, setConfirming] = useState(false);
	if (linear.status === 'hidden') return null;
	const consequences: DangerConsequence[] = [
		{ key: 'sync', icon: <StopCircle />, text: t('settings.integrations.linear.DISCONNECT_STOPS_SYNC') },
		{ key: 'tasks', icon: <Task />, text: t('settings.integrations.linear.DISCONNECT_KEEPS_TASKS') }
	];

	const confirmDisconnect = async () => {
		try {
			await linear.disconnect();
			setConfirming(false);
		} catch {
			// The dialog shows the hook's error.
		}
	};

	return (
		<SettingsSection id="linear" title={t('settings.integrations.linear.SECTION_TITLE')} description={t('settings.integrations.linear.SECTION_DESCRIPTION')}>
			{linear.callbackError && (
				<Notice tone="error" title={t('settings.integrations.linear.CALLBACK_ERROR_TITLE')} description={t(`settings.integrations.linear.CALLBACK_${linear.callbackError}` as DottedLanguageObjectStringPaths)} />
			)}
			<LinearProviderBody linear={linear} onDisconnect={() => setConfirming(true)} />
			<ConfirmDestructiveDialog
				open={confirming}
				onClose={() => setConfirming(false)}
				title={t('settings.integrations.linear.DISCONNECT_TITLE')}
				description={t('settings.integrations.linear.DISCONNECT_DESCRIPTION')}
				consequences={consequences}
				confirmLabel={t('settings.integrations.linear.DISCONNECT')}
				isPending={linear.pending.kind === 'disconnect'}
				error={linear.actionError ? t(errorReasonKeyOf(linear.actionError) as DottedLanguageObjectStringPaths) : undefined}
				onConfirm={() => void confirmDisconnect()}
			/>
		</SettingsSection>
	);
}
