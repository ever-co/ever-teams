'use client';

import { useState, type CSSProperties, type ReactNode } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Checkbox } from '@/core/components/common/checkbox';
import {
	ArrowUp,
	Calendar,
	ChevronRight,
	Folder,
	Analytics,
	UserCheck,
	Users,
	UsersGroup,
	Wallet,
	CircleCheck
} from '@/core/components/icons';
import { TaskPropertyIcon } from '@/core/components/tasks/task-property-icon';
import {
	PeopleCell,
	ProjectBudgetCell,
	ProjectDatesCell,
	ProjectProgressCell,
	ProjectStatusChip,
	ProjectTile,
	TeamsCell,
	formatProjectDay
} from '@/core/components/projects/project-cells';
import { ProjectActionsMenu } from '@/core/components/projects/project-actions-menu';
import { cn } from '@/core/lib/helpers';
import type { ProjectsListState } from '@/core/hooks/projects/use-projects-list-state';
import type { ProjectTaskStatsState } from '@/core/hooks/projects/use-project-task-stats';
import {
	clientNameOf,
	contributorsOf,
	managersOf,
	statusLabelOf,
	personFromProjectMember,
	realDateOf,
	PROJECT_COLUMNS,
	type ProjectColumn,
	type ProjectOrderField,
	type ProjectStatusGroup
} from '@/core/lib/utils/project-list';
import type { TOrganizationProject } from '@/core/types/schemas';
import type { TTaskStatus } from '@/core/types/schemas/task/task-status.schema';
import { COLUMN_LABEL_KEYS } from './projects-display-menu';

const COLUMN_WIDTHS_REM: Record<ProjectColumn, number> = {
	status: 8.5,
	progress: 7.5,
	managers: 5.5,
	members: 6.5,
	teams: 9,
	dates: 12,
	budget: 6.5
};

const COLUMN_ICONS: Record<ProjectColumn, ReactNode> = {
	status: <CircleCheck />,
	progress: <Analytics />,
	managers: <UserCheck />,
	members: <Users />,
	teams: <UsersGroup />,
	dates: <Calendar />,
	budget: <Wallet />
};

const COLUMN_ORDER_FIELD: Partial<Record<ProjectColumn, ProjectOrderField>> = {
	status: 'status',
	dates: 'startDate'
};

const SELECT_COLUMN_REM = 2;
const PROJECT_COLUMN_MIN_REM = 14;
const ACTIONS_COLUMN_REM = 2.25;

function remOf(value: number) {
	return `${value}rem`;
}

/** Below the sum of its columns the list scrolls sideways instead of squeezing the cells. */
function gridStyleOf(columns: ProjectColumn[]): CSSProperties {
	const projectTrack = `minmax(${remOf(PROJECT_COLUMN_MIN_REM)},1fr)`;
	const tracks = [remOf(SELECT_COLUMN_REM), projectTrack];
	let minWidth = SELECT_COLUMN_REM + PROJECT_COLUMN_MIN_REM + ACTIONS_COLUMN_REM;
	for (const column of columns) {
		const width = COLUMN_WIDTHS_REM[column];
		tracks.push(remOf(width));
		minWidth += width;
	}
	tracks.push(remOf(ACTIONS_COLUMN_REM));
	const template = tracks.join(' ');
	return { '--project-grid': template, '--project-min-width': remOf(minWidth) } as CSSProperties;
}

const ROW_GRID =
	'grid grid-cols-[2rem_minmax(0,1fr)_auto_2.25rem] items-center lg:[grid-template-columns:var(--project-grid)]';

const CELL = 'flex min-w-0 items-center px-2 max-lg:hidden';

export interface ProjectsListViewProps {
	list: ProjectsListState;
	groups: ProjectStatusGroup[];
	statuses: TTaskStatus[];
	taskStats: ProjectTaskStatsState;
	visibleProjectIds: string[];
}

export function ProjectsListView({
	list,
	groups,
	statuses,
	taskStats,
	visibleProjectIds
}: Readonly<ProjectsListViewProps>) {
	const columns = list.isColumnVisible;
	const visibleColumns = PROJECT_COLUMNS.filter((column) => columns(column));
	const gridStyle = gridStyleOf(visibleColumns);
	const isGrouped = list.grouping === 'status';
	const [collapsedGroups, setCollapsedGroups] = useState<string[]>([]);

	const toggleGroup = (key: string) => {
		setCollapsedGroups((current) => {
			if (current.includes(key)) {
				return current.filter((value) => value !== key);
			}
			return [...current, key];
		});
	};

	return (
		<div className="-mx-2 overflow-x-auto px-2 pb-2">
			<div
				style={gridStyle}
				className="min-w-full rounded-xl bg-card hairline-ring ring-border shadow-sm shadow-black/6.5 lg:min-w-(--project-min-width)"
			>
				<ColumnLabels list={list} columns={visibleColumns} visibleProjectIds={visibleProjectIds} />
				{groups.map((group) => {
					const isCollapsed = collapsedGroups.includes(group.key);
					return (
						<div key={group.key} className="hairline-t border-border">
							{isGrouped && (
								<GroupHeader
									group={group}
									list={list}
									isCollapsed={isCollapsed}
									onToggle={() => toggleGroup(group.key)}
								/>
							)}
							{!isCollapsed && (
								<div className="hairline-divide-y divide-border">
									{group.items.map((project) => (
										<ProjectRow
											key={project.id}
											project={project}
											list={list}
											columns={visibleColumns}
											statuses={statuses}
											taskStats={taskStats}
										/>
									))}
								</div>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
}

function selectionStateOf(selectedIds: string[], ids: string[]) {
	const selectedCount = ids.filter((id) => selectedIds.includes(id)).length;
	const hasIds = ids.length > 0;
	const isAll = hasIds && selectedCount === ids.length;
	if (isAll) {
		return true;
	}
	if (selectedCount > 0) {
		return 'indeterminate' as const;
	}
	return false;
}

function withIds(selectedIds: string[], ids: string[], isChecked: boolean) {
	const others = selectedIds.filter((id) => !ids.includes(id));
	if (isChecked) {
		return [...others, ...ids];
	}
	return others;
}

function ColumnLabels({
	list,
	columns,
	visibleProjectIds
}: Readonly<{ list: ProjectsListState; columns: ProjectColumn[]; visibleProjectIds: string[] }>) {
	const t = useTranslations();
	const checked = selectionStateOf(list.selectedIds, visibleProjectIds);
	const handleCheckedChange = (value: boolean) => {
		list.setSelection(withIds(list.selectedIds, visibleProjectIds, value));
	};
	return (
		<div className={cn(ROW_GRID, 'h-9 text-xs font-medium text-muted-foreground')}>
			<span className="flex justify-center">
				<Checkbox
					checked={checked}
					onCheckedChange={handleCheckedChange}
					aria-label={t('pages.projects.list.SELECT_ALL')}
				/>
			</span>
			<SortableLabel
				list={list}
				field="name"
				icon={<Folder />}
				label={t('pages.projects.projectTitle.SINGULAR')}
			/>
			{columns.map((column) => (
				<ColumnLabel key={column} list={list} column={column} />
			))}
			<span />
		</div>
	);
}

function ColumnLabel({ list, column }: Readonly<{ list: ProjectsListState; column: ProjectColumn }>) {
	const t = useTranslations();
	const field = COLUMN_ORDER_FIELD[column];
	const label = t(COLUMN_LABEL_KEYS[column]);
	if (field) {
		return (
			<span className="max-lg:hidden">
				<SortableLabel list={list} field={field} icon={COLUMN_ICONS[column]} label={label} />
			</span>
		);
	}
	return (
		<span className={cn(CELL, 'gap-1.5 [&_svg]:size-3.5')}>
			{COLUMN_ICONS[column]}
			<span className="truncate">{label}</span>
		</span>
	);
}

function SortableLabel({
	list,
	field,
	icon,
	label
}: Readonly<{ list: ProjectsListState; field: ProjectOrderField; icon: ReactNode; label: string }>) {
	const isActive = list.ordering.id === field;
	const isDescending = isActive && list.ordering.desc;
	const handleClick = () => {
		if (isActive) {
			list.setOrdering({ id: field, desc: !list.ordering.desc });
			return;
		}
		list.setOrdering({ id: field, desc: false });
	};
	return (
		<button
			type="button"
			onClick={handleClick}
			className={cn(
				'flex h-full min-w-0 items-center gap-1.5 px-2 text-left outline-none transition-colors hover:text-foreground focus-visible:text-foreground [&_svg]:size-3.5',
				isActive && 'text-foreground'
			)}
		>
			{icon}
			<span className="truncate">{label}</span>
			{isActive && <ArrowUp className={cn('text-muted-foreground', isDescending && 'rotate-180')} />}
		</button>
	);
}

function GroupHeader({
	group,
	list,
	isCollapsed,
	onToggle
}: Readonly<{ group: ProjectStatusGroup; list: ProjectsListState; isCollapsed: boolean; onToggle: () => void }>) {
	const t = useTranslations();
	const ids = group.items.map((project) => project.id);
	const checked = selectionStateOf(list.selectedIds, ids);
	const noStatusLabel = t('pages.projects.list.NO_STATUS');
	const label = statusLabelOf(group.name, noStatusLabel);
	const count = group.items.length;
	const handleCheckedChange = (value: boolean) => {
		list.setSelection(withIds(list.selectedIds, ids, value));
	};
	return (
		<div className="flex h-10 items-center gap-1 bg-foreground/[0.025] pr-3 dark:bg-foreground/[0.04]">
			<span className="flex w-8 shrink-0 justify-center">
				<Checkbox
					checked={checked}
					onCheckedChange={handleCheckedChange}
					aria-label={t('pages.projects.list.SELECT_GROUP', {
						group: label
					})}
				/>
			</span>
			<button
				type="button"
				onClick={onToggle}
				aria-expanded={!isCollapsed}
				className="flex h-8 min-w-0 items-center gap-2 rounded-md pr-2 pl-1 text-[13px] font-semibold text-foreground outline-none transition-colors hover:bg-foreground/5 focus-visible:ring-[3px] focus-visible:ring-ring/25"
			>
				<ChevronRight
					className={cn(
						'size-3.5 text-muted-foreground transition-transform duration-200',
						!isCollapsed && 'rotate-90'
					)}
				/>
				<TaskPropertyIcon kind="status" name={group.name} color={group.status?.color} />
				<span className="truncate capitalize">{label}</span>
				<span className="inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-[5px] bg-foreground/[0.06] px-1 text-[11px] font-medium tabular-nums text-muted-foreground">
					{count}
				</span>
			</button>
		</div>
	);
}

function ProjectSubline({ project }: Readonly<{ project: TOrganizationProject }>) {
	const t = useTranslations();
	const locale = useLocale();
	const client = clientNameOf(project);
	const archivedAt = realDateOf(project.archivedAt);
	const parts: string[] = [];
	if (project.code) {
		parts.push(project.code);
	}
	if (client) {
		parts.push(client);
	}
	if (project.isArchived && archivedAt) {
		parts.push(t('pages.projects.list.ARCHIVED_ON', { date: formatProjectDay(archivedAt, locale) }));
	}
	const hasParts = parts.length > 0;
	if (!hasParts) {
		return null;
	}
	return <span className="truncate text-xs text-muted-foreground">{parts.join(' · ')}</span>;
}

function ProjectRow({
	project,
	list,
	columns,
	statuses,
	taskStats
}: Readonly<{
	project: TOrganizationProject;
	list: ProjectsListState;
	columns: ProjectColumn[];
	statuses: TTaskStatus[];
	taskStats: ProjectTaskStatsState;
}>) {
	const t = useTranslations();
	const isSelected = list.selectedIds.includes(project.id);
	const managers = managersOf(project).map(personFromProjectMember);
	const members = contributorsOf(project).map(personFromProjectMember);

	const cells: Record<ProjectColumn, ReactNode> = {
		status: <ProjectStatusChip statusName={project.status} statuses={statuses} />,
		progress: <ProjectProgressCell projectId={project.id} taskStats={taskStats} />,
		managers: <PeopleCell people={managers} max={3} />,
		members: <PeopleCell people={members} max={3} />,
		teams: <TeamsCell teams={project.teams ?? []} max={1} />,
		dates: <ProjectDatesCell startDate={project.startDate} endDate={project.endDate} />,
		budget: <ProjectBudgetCell project={project} />
	};

	return (
		<div
			className={cn(
				ROW_GRID,
				'group/row min-h-13 transition-colors [contain-intrinsic-size:auto_52px] [content-visibility:auto] hover:bg-foreground/[0.02]',
				isSelected && 'bg-primary/[0.04] hover:bg-primary/[0.06]'
			)}
		>
			<span className="flex justify-center">
				<Checkbox
					checked={isSelected}
					onCheckedChange={() => list.toggleSelected(project.id)}
					aria-label={t('pages.projects.list.SELECT_PROJECT', { name: project.name })}
				/>
			</span>
			<Link
				href={`/projects/${project.id}`}
				className="group/link flex min-w-0 items-center gap-2.5 rounded-md px-2 py-2 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
			>
				<ProjectTile project={project} size="lg" />
				<span className="flex min-w-0 flex-col">
					<span className="truncate text-[13px] font-medium text-foreground transition-colors group-hover/link:text-primary-ink">
						{project.name}
					</span>
					<ProjectSubline project={project} />
				</span>
			</Link>
			<span className="px-2 lg:hidden">{cells.status}</span>
			{columns.map((column) => (
				<span key={column} className={CELL}>
					{cells[column]}
				</span>
			))}
			<span className="flex justify-center">
				<ProjectActionsMenu project={project} showsViewInfo restoreForEveryone />
			</span>
		</div>
	);
}
