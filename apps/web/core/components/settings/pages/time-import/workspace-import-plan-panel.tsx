'use client';

import type { CSSProperties, PropsWithChildren, ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Badge } from '@/core/components/common/badge';
import { Notice } from '@/core/components/common/notice';
import { MetricStrip, type MetricItem } from '@/core/components/dashboards/kit/metric-strip';
import { Button } from '@/core/components/duplicated-components/_button';
import { Briefcase, Building, Tag, Users } from '@/core/components/icons';
import { SettingsReadOnlyNote, SettingsSection, SettingsSurface } from '@/core/components/settings/kit/settings-page';
import { cn } from '@/core/lib/helpers';
import {
	type ExistingRecord,
	hasAnythingToCreate,
	type PlannedProject,
	type WorkspaceImportPlan
} from '@/core/lib/utils/workspace-import-plan';
import { FILE_NAME_TEXT } from './time-import-copy';

/** A long list scrolls inside its block instead of pushing the entries preview out of sight. */
const LIST_BOX = 'max-h-48 overflow-y-auto';

const GLYPH = 'size-4 shrink-0 text-muted-foreground';

const CHIP = 'max-w-full whitespace-normal text-left';

function PlanBlock({ glyph, title, children }: Readonly<PropsWithChildren<{ glyph: ReactNode; title: string }>>) {
	return (
		<div className="flex flex-col gap-2.5 px-4 py-3">
			<p className="flex items-center gap-2 text-[13px] font-medium text-foreground">
				{glyph}
				{title}
			</p>
			{children}
		</div>
	);
}

function NameGroup({ label, children }: Readonly<PropsWithChildren<{ label: string }>>) {
	return (
		<div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:gap-3">
			<span className="shrink-0 pt-0.5 text-xs text-muted-foreground sm:w-36">{label}</span>
			<div className="min-w-0 flex-1">{children}</div>
		</div>
	);
}

function NewNames({ names }: Readonly<{ names: ReadonlyArray<string> }>) {
	return (
		<ul className={cn('flex flex-wrap gap-1.5', LIST_BOX)}>
			{names.map((name) => (
				<li key={name} className="max-w-full">
					<Badge variant="default" className={cn(CHIP, FILE_NAME_TEXT)}>
						{name}
					</Badge>
				</li>
			))}
		</ul>
	);
}

function ReusedNames({ records }: Readonly<{ records: ReadonlyArray<ExistingRecord> }>) {
	return (
		<ul className={cn('flex flex-wrap gap-1.5', LIST_BOX)}>
			{records.map((record) => (
				<li key={record.id} className="max-w-full">
					<Badge variant="secondary" className={cn(CHIP, FILE_NAME_TEXT)}>
						{record.name}
					</Badge>
				</li>
			))}
		</ul>
	);
}

function ProjectDot({ color }: Readonly<{ color: string | null }>) {
	if (!color) {
		return <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full bg-foreground/20" />;
	}
	const style: CSSProperties = { backgroundColor: color };
	return <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={style} />;
}

function NewProjects({ projects }: Readonly<{ projects: ReadonlyArray<PlannedProject> }>) {
	const t = useTranslations();

	const billableLabelOf = (billable: boolean | null) => {
		if (billable === null) {
			return null;
		}
		if (billable) {
			return t('timeImport.workspace.BILLABLE');
		}
		return t('timeImport.workspace.NOT_BILLABLE');
	};

	return (
		<ul className={cn('flex flex-col gap-1.5', LIST_BOX)}>
			{projects.map((project) => {
				const billableLabel = billableLabelOf(project.billable);
				const clientLabel = project.clientName ?? t('timeImport.workspace.NO_CLIENT');
				return (
					<li key={project.name} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]">
						<ProjectDot color={project.color} />
						<span className={cn('font-medium text-foreground', FILE_NAME_TEXT)}>{project.name}</span>
						<span className={cn('text-muted-foreground', FILE_NAME_TEXT)}>{clientLabel}</span>
						{billableLabel && <Badge variant="secondary">{billableLabel}</Badge>}
					</li>
				);
			})}
		</ul>
	);
}

interface WorkspaceImportPlanPanelProps {
	plan: WorkspaceImportPlan;
	canCreateLabels: boolean;
	/** The entries the time import found ready: when there are some, their preview below holds the import button. */
	readyEntryCount: number;
	onImportLists: () => void;
}

/** What the import creates and what it reuses, before anything is saved. */
export function WorkspaceImportPlanPanel({
	plan,
	canCreateLabels,
	readyEntryCount,
	onImportLists
}: Readonly<WorkspaceImportPlanPanelProps>) {
	const t = useTranslations();
	const { clients, projects, labels, entriesByMember, unknownEmails, taggedEntryCount } = plan;

	const figureOf = (key: string, label: string, created: number, reused: number): MetricItem<string> => ({
		key,
		label,
		value: created + reused,
		hint: t('timeImport.workspace.NEW_AND_REUSED', { created, reused })
	});
	const figures = [
		figureOf('clients', t('timeImport.workspace.figures.CLIENTS'), clients.create.length, clients.reuse.length),
		figureOf('projects', t('timeImport.workspace.figures.PROJECTS'), projects.create.length, projects.reuse.length),
		figureOf('labels', t('timeImport.workspace.figures.LABELS'), labels.create.length, labels.reuse.length)
	];

	const hasClients = clients.create.length + clients.reuse.length > 0;
	const hasProjects = projects.create.length + projects.reuse.length > 0;
	const hasLabels = labels.create.length + labels.reuse.length > 0;
	const hasMembers = entriesByMember.length > 0;
	const hasUnknownEmails = unknownEmails.length > 0;
	const createsSomething = hasAnythingToCreate(plan);
	const hasReadyEntries = readyEntryCount > 0;
	const offersListsImport = createsSomething && !hasReadyEntries;
	const hasNothingToDo = !createsSomething && !hasReadyEntries;
	const showsTaggedNote = taggedEntryCount > 0 && hasLabels;
	const skipsLabels = !canCreateLabels && labels.create.length > 0;

	return (
		<SettingsSection
			id="workspace-import-plan"
			title={t('timeImport.workspace.PLAN_TITLE')}
			description={t('timeImport.workspace.PLAN_DESCRIPTION')}
		>
			<SettingsSurface>
				<MetricStrip items={figures} ariaLabel={t('timeImport.workspace.figures.LABEL')} />
				{hasClients && (
					<PlanBlock glyph={<Building aria-hidden="true" className={GLYPH} />} title={figures[0].label}>
						{clients.create.length > 0 && (
							<NameGroup label={t('timeImport.workspace.TO_CREATE')}>
								<NewNames names={clients.create} />
							</NameGroup>
						)}
						{clients.reuse.length > 0 && (
							<NameGroup label={t('timeImport.workspace.TO_REUSE')}>
								<ReusedNames records={clients.reuse} />
							</NameGroup>
						)}
					</PlanBlock>
				)}
				{hasProjects && (
					<PlanBlock glyph={<Briefcase aria-hidden="true" className={GLYPH} />} title={figures[1].label}>
						{projects.create.length > 0 && (
							<NameGroup label={t('timeImport.workspace.TO_CREATE')}>
								<NewProjects projects={projects.create} />
							</NameGroup>
						)}
						{projects.reuse.length > 0 && (
							<NameGroup label={t('timeImport.workspace.TO_REUSE')}>
								<ReusedNames records={projects.reuse} />
							</NameGroup>
						)}
					</PlanBlock>
				)}
				{hasLabels && (
					<PlanBlock glyph={<Tag aria-hidden="true" className={GLYPH} />} title={figures[2].label}>
						{labels.create.length > 0 && (
							<NameGroup label={t('timeImport.workspace.TO_CREATE')}>
								<NewNames names={labels.create} />
							</NameGroup>
						)}
						{labels.reuse.length > 0 && (
							<NameGroup label={t('timeImport.workspace.TO_REUSE')}>
								<ReusedNames records={labels.reuse} />
							</NameGroup>
						)}
					</PlanBlock>
				)}
				{hasMembers && (
					<PlanBlock
						glyph={<Users aria-hidden="true" className={GLYPH} />}
						title={t('timeImport.workspace.MEMBERS_TITLE')}
					>
						<ul className={cn('flex flex-col gap-1', LIST_BOX)}>
							{entriesByMember.map((member) => (
								<li
									key={member.employeeId}
									className="flex items-baseline justify-between gap-3 text-[13px]"
								>
									<span className="min-w-0 truncate text-foreground">{member.name}</span>
									<span className="shrink-0 text-xs tabular-nums text-muted-foreground">
										{t('timeImport.workspace.MEMBER_ENTRIES', { count: member.count })}
									</span>
								</li>
							))}
						</ul>
					</PlanBlock>
				)}
				{offersListsImport && (
					<div className="flex justify-end px-4 py-3">
						<Button type="button" onClick={onImportLists}>
							{t('timeImport.workspace.IMPORT_LISTS_ACTION')}
						</Button>
					</div>
				)}
				{hasNothingToDo && (
					<output className="px-4 py-3 text-xs text-pretty text-muted-foreground">
						{t('timeImport.workspace.NOTHING_TO_DO')}
					</output>
				)}
			</SettingsSurface>
			{hasUnknownEmails && (
				<Notice
					tone="warning"
					title={t('timeImport.workspace.UNKNOWN_EMAILS_TITLE', { count: unknownEmails.length })}
					description={
						<>
							<p>{t('timeImport.workspace.UNKNOWN_EMAILS_DESCRIPTION')}</p>
							<ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
								{unknownEmails.map((unknown) => (
									<li key={unknown.email} className={cn('font-medium text-foreground', FILE_NAME_TEXT)}>
										{unknown.email}
									</li>
								))}
							</ul>
						</>
					}
				/>
			)}
			{showsTaggedNote && (
				<SettingsReadOnlyNote>
					{t('timeImport.workspace.TAGGED_ENTRIES_NOTE', { count: taggedEntryCount })}
				</SettingsReadOnlyNote>
			)}
			{skipsLabels && <SettingsReadOnlyNote>{t('timeImport.workspace.LABELS_SKIPPED_NOTE')}</SettingsReadOnlyNote>}
		</SettingsSection>
	);
}
