'use client';

import { memo, useCallback, useMemo, useState } from 'react';
import { type DottedLanguageObjectStringPaths, useTranslations } from 'next-intl';
import { Button } from '@/core/components/duplicated-components/_button';
import { ChevronRight } from '@/core/components/icons';
import {
	DashboardSection,
	GroupToggle,
	ReportGroup,
	ReportHeaderRow,
	ReportTotalsRow
} from '@/core/components/dashboards/kit/dashboard-layout';
import {
	BlockEmptyMessage,
	DashboardErrorNotice,
	RowsSkeleton
} from '@/core/components/dashboards/kit/dashboard-states';
import { MemberCell } from '@/core/components/dashboards/kit/member-cell';
import { cn } from '@/core/lib/helpers';
import { formatPeriod, type Period } from '@/core/lib/utils/dashboard-period';
import {
	AUTO_OPEN_LINE_LIMIT,
	type ReportGroup as ReportGroupData,
	type ReportLine,
	type ReportTotals,
	type TableGrouping,
	dateOfKey,
	lineCountOf,
	todayKeyOf
} from '@/core/lib/utils/dashboards/time-activity';
import { useWorkspaceLocale } from '@/core/hooks/common/use-workspace-locale';
import { dateFormatOf, type FormatLocale } from '@/core/lib/utils/workspace-formats';
import {
	ActivityText,
	DurationText,
	EarningsText,
	type FigureColumn,
	FIGURE_TEXT,
	ProjectGlyph,
	ProjectsCell,
	TABLE_GRID,
	type TableColumns,
	figureCellClassOf,
	mobileFigureOf,
	tableGridStyleOf
} from './time-activity-cells';

const TITLE_KEYS: Record<TableGrouping, DottedLanguageObjectStringPaths> = {
	date: 'dashboard.timeActivity.table.TITLE_DATE',
	member: 'dashboard.timeActivity.table.TITLE_MEMBER',
	project: 'dashboard.timeActivity.table.TITLE_PROJECT'
};

const OUTER_LABEL_KEYS: Record<TableGrouping, DottedLanguageObjectStringPaths> = {
	date: 'dashboard.timeActivity.grouping.DATE',
	member: 'dashboard.timeActivity.grouping.MEMBER',
	project: 'dashboard.timeActivity.grouping.PROJECT'
};

const INNER_LABEL_KEYS: Record<TableGrouping, DottedLanguageObjectStringPaths> = {
	date: 'dashboard.timeActivity.grouping.MEMBER',
	member: 'dashboard.timeActivity.grouping.DATE',
	project: 'dashboard.timeActivity.grouping.MEMBER'
};

interface TableText {
	locale: FormatLocale;
	todayKey: string;
	today: string;
	unnamed: string;
	noProject: string;
	noRate: string;
	noActivity: string;
	moreProjects: (count: number) => string;
	groupSummary: (group: ReportGroupData) => string;
	lineMeta: (line: ReportLine) => string | undefined;
	longDay: Intl.DateTimeFormat;
	shortDay: Intl.DateTimeFormat;
}

interface RowContext {
	columns: TableColumns;
	mobileFigure: FigureColumn | null;
	text: TableText;
}

interface OpenState {
	/** `null` until the reader expands or collapses everything: then the table's length decides. */
	allOpen: boolean | null;
	toggled: ReadonlySet<string>;
}

const INITIAL_OPEN_STATE: OpenState = { allOpen: null, toggled: new Set() };

function withToggledKey(keys: ReadonlySet<string>, key: string) {
	const next = new Set(keys);
	const isToggled = next.has(key);
	if (isToggled) {
		next.delete(key);
		return next;
	}
	next.add(key);
	return next;
}

function isOpenIn(state: OpenState, baseOpen: boolean, key: string) {
	const isToggled = state.toggled.has(key);
	return baseOpen !== isToggled;
}

function DayName({
	dateKey,
	format,
	text
}: Readonly<{ dateKey: string; format: Intl.DateTimeFormat; text: TableText }>) {
	const isToday = dateKey === text.todayKey;
	return (
		<span className="flex min-w-0 items-baseline gap-2">
			<span className="truncate">{format.format(dateOfKey(dateKey))}</span>
			{isToday && <span className="shrink-0 text-xs font-normal text-primary-ink">{text.today}</span>}
		</span>
	);
}

function SubjectName({
	line,
	format,
	text,
	meta
}: Readonly<{ line: ReportLine; format: Intl.DateTimeFormat; text: TableText; meta?: string }>) {
	const subject = line.subject;
	if (subject.kind === 'day') {
		return <DayName dateKey={subject.dateKey} format={format} text={text} />;
	}
	if (subject.kind === 'member') {
		const name = subject.name || text.unnamed;
		return <MemberCell name={name} imageUrl={subject.imageUrl} meta={meta} />;
	}
	const projectName = subject.project.name ?? text.noProject;
	return (
		<span className="flex min-w-0 items-center gap-2">
			<ProjectGlyph project={subject.project} />
			<span className="truncate">{projectName}</span>
		</span>
	);
}

function FigureCells({
	figures,
	context,
	className
}: Readonly<{
	figures: Pick<ReportLine, 'seconds' | 'activeSeconds' | 'earnings'>;
	context: RowContext;
	className?: string;
}>) {
	const { columns, mobileFigure, text } = context;
	return (
		<>
			{columns.tracked && (
				<span role="cell" className={cn(figureCellClassOf('tracked', mobileFigure), className)}>
					<DurationText seconds={figures.seconds} />
				</span>
			)}
			{columns.earnings && (
				<span role="cell" className={cn('min-w-0', figureCellClassOf('earnings', mobileFigure), className)}>
					<EarningsText amounts={figures.earnings} locale={text.locale} noRateLabel={text.noRate} />
				</span>
			)}
			{columns.activity && (
				<span role="cell" className={cn('flex justify-end', figureCellClassOf('activity', mobileFigure))}>
					<ActivityText
						seconds={figures.seconds}
						activeSeconds={figures.activeSeconds}
						noActivityLabel={text.noActivity}
					/>
				</span>
			)}
		</>
	);
}

const LineRow = memo(function LineRow({ line, context }: Readonly<{ line: ReportLine; context: RowContext }>) {
	const { columns, text } = context;
	return (
		<div role="row" className={cn(TABLE_GRID, 'min-h-10 py-1.5')}>
			<span role="rowheader" className="min-w-0 pl-6 text-[13px] text-foreground">
				<SubjectName line={line} format={text.shortDay} text={text} meta={text.lineMeta(line)} />
			</span>
			{columns.projects && (
				<span role="cell" className="min-w-0 max-sm:hidden">
					<ProjectsCell
						projects={line.projects}
						noProjectLabel={text.noProject}
						moreLabel={text.moreProjects}
					/>
				</span>
			)}
			<FigureCells figures={line} context={context} />
		</div>
	);
});

const GroupBlock = memo(function GroupBlock({
	group,
	isOpen,
	onToggle,
	context
}: Readonly<{ group: ReportGroupData; isOpen: boolean; onToggle: (key: string) => void; context: RowContext }>) {
	const { columns, text } = context;
	const handleToggle = useCallback(() => onToggle(group.key), [group.key, onToggle]);
	return (
		<div className="[contain-intrinsic-size:auto_2.75rem] [content-visibility:auto]">
			<ReportGroup
				isOpen={isOpen}
				headerClassName={TABLE_GRID}
				header={
					<>
						<span role="rowheader" className="flex min-w-0 items-center">
							<GroupToggle isOpen={isOpen} onToggle={handleToggle} className="max-w-full">
								<SubjectName line={group} format={text.longDay} text={text} />
								<span className="shrink-0 text-xs font-normal tabular-nums text-muted-foreground">
									{text.groupSummary(group)}
								</span>
							</GroupToggle>
						</span>
						{columns.projects && (
							<span role="cell" className="min-w-0 max-sm:hidden">
								<ProjectsCell
									projects={group.projects}
									noProjectLabel={text.noProject}
									moreLabel={text.moreProjects}
								/>
							</span>
						)}
						<FigureCells figures={group} context={context} className="font-medium" />
					</>
				}
			>
				<div className="hairline-divide-y divide-border">
					{group.lines.map((line) => (
						<LineRow key={line.key} line={line} context={context} />
					))}
				</div>
			</ReportGroup>
		</div>
	);
});

function HeaderCells({
	grouping,
	columns,
	mobileFigure
}: Readonly<{ grouping: TableGrouping; columns: TableColumns; mobileFigure: FigureColumn | null }>) {
	const t = useTranslations();
	return (
		<>
			<span role="columnheader" className="flex min-w-0 items-center gap-1">
				<span className="truncate">{t(OUTER_LABEL_KEYS[grouping])}</span>
				<ChevronRight aria-hidden="true" className="size-3 shrink-0 text-muted-foreground/70" />
				<span className="truncate">{t(INNER_LABEL_KEYS[grouping])}</span>
			</span>
			{columns.projects && (
				<span role="columnheader" className="max-sm:hidden">
					{t('dashboard.timeActivity.columns.PROJECTS')}
				</span>
			)}
			{columns.tracked && (
				<span role="columnheader" className={figureCellClassOf('tracked', mobileFigure)}>
					{t('dashboard.timeActivity.columns.TRACKED')}
				</span>
			)}
			{columns.earnings && (
				<span role="columnheader" className={figureCellClassOf('earnings', mobileFigure)}>
					{t('dashboard.timeActivity.columns.EARNINGS')}
				</span>
			)}
			{columns.activity && (
				<span role="columnheader" className={figureCellClassOf('activity', mobileFigure)}>
					{t('dashboard.timeActivity.columns.ACTIVITY')}
				</span>
			)}
		</>
	);
}

function groupCountLabelOf(grouping: TableGrouping, count: number, t: ReturnType<typeof useTranslations>) {
	if (grouping === 'date') {
		return t('dashboard.timeActivity.table.DAYS', { count });
	}
	if (grouping === 'member') {
		return t('dashboard.timeActivity.table.MEMBERS', { count });
	}
	return t('dashboard.timeActivity.table.PROJECTS', { count });
}

function cellCountOf(columns: TableColumns) {
	const flags = [columns.projects, columns.tracked, columns.earnings, columns.activity];
	return 1 + flags.filter(Boolean).length;
}

function useTableText(grouping: TableGrouping): TableText {
	const t = useTranslations();
	const locale = useWorkspaceLocale();
	return useMemo(() => {
		const groupSummary = (group: ReportGroupData) => {
			if (grouping === 'member') {
				return t('dashboard.timeActivity.table.DAYS', { count: group.dayCount });
			}
			return t('dashboard.timeActivity.table.MEMBERS', { count: group.memberCount });
		};
		const lineMeta = (line: ReportLine) => {
			if (grouping !== 'project') {
				return undefined;
			}
			return t('dashboard.timeActivity.table.DAYS', { count: line.dayCount });
		};
		return {
			locale,
			todayKey: todayKeyOf(),
			today: t('common.TODAY'),
			unnamed: t('timeActivity.UNNAMED_EMPLOYEE'),
			noProject: t('common.NO_PROJECT'),
			noRate: t('dashboard.timeActivity.table.NO_RATE'),
			noActivity: t('dashboard.timeActivity.table.NO_ACTIVITY'),
			moreProjects: (count: number) => t('dashboard.timeActivity.table.MORE_PROJECTS', { count }),
			groupSummary,
			lineMeta,
			longDay: dateFormatOf(locale, { weekday: 'long', month: 'short', day: 'numeric' }),
			shortDay: dateFormatOf(locale, { weekday: 'short', month: 'short', day: 'numeric' })
		};
	}, [grouping, locale, t]);
}

function TableEmpty({
	period,
	hasFilters,
	onClearFilters,
	onPreviousPeriod
}: Readonly<{ period: Period; hasFilters: boolean; onClearFilters: () => void; onPreviousPeriod: () => void }>) {
	const t = useTranslations();
	const locale = useWorkspaceLocale();
	const periodText = formatPeriod(period, locale);
	if (hasFilters) {
		return (
			<BlockEmptyMessage
				title={t('dashboard.timeActivity.empty.FILTERED_TITLE', { period: periodText })}
				message={t('dashboard.timeActivity.empty.FILTERED_MESSAGE')}
				action={
					<Button type="button" variant="outline" size="default" onClick={onClearFilters}>
						{t('common.CLEAR_FILTERS')}
					</Button>
				}
			/>
		);
	}
	return (
		<BlockEmptyMessage
			title={t('dashboard.timeActivity.empty.TITLE', { period: periodText })}
			message={t('dashboard.timeActivity.empty.MESSAGE')}
			action={
				<Button type="button" variant="outline" size="default" onClick={onPreviousPeriod}>
					{t('dashboard.period.PREVIOUS')}
				</Button>
			}
		/>
	);
}

interface TimeActivityTableProps {
	grouping: TableGrouping;
	groups: ReadonlyArray<ReportGroupData>;
	totals: ReportTotals;
	columns: TableColumns;
	period: Period;
	isLoading: boolean;
	isError: boolean;
	hasFilters: boolean;
	onRetry: () => void;
	onClearFilters: () => void;
	onPreviousPeriod: () => void;
}

function TableRowsSkeleton({ columns }: Readonly<{ columns: TableColumns }>) {
	return (
		<>
			<div className="sm:hidden">
				<RowsSkeleton gridClassName={TABLE_GRID} cellCount={2} />
			</div>
			<div className="max-sm:hidden">
				<RowsSkeleton gridClassName={TABLE_GRID} cellCount={cellCountOf(columns)} />
			</div>
		</>
	);
}

/** Drawn by the route skeleton and by the page while the report loads: one picture from the route to the rows. */
export function TimeActivityTableSkeleton({
	grouping,
	columns
}: Readonly<{ grouping: TableGrouping; columns: TableColumns }>) {
	const t = useTranslations();
	const mobileFigure = mobileFigureOf(columns);
	const gridStyle = useMemo(() => tableGridStyleOf(columns), [columns]);
	const title = t(TITLE_KEYS[grouping]);
	return (
		<DashboardSection title={title} ariaLabel={title}>
			<div role="table" aria-label={title} aria-busy="true" style={gridStyle}>
				<ReportHeaderRow gridClassName={TABLE_GRID}>
					<HeaderCells grouping={grouping} columns={columns} mobileFigure={mobileFigure} />
				</ReportHeaderRow>
				<TableRowsSkeleton columns={columns} />
			</div>
		</DashboardSection>
	);
}

export function TimeActivityTable({
	grouping,
	groups,
	totals,
	columns,
	period,
	isLoading,
	isError,
	hasFilters,
	onRetry,
	onClearFilters,
	onPreviousPeriod
}: Readonly<TimeActivityTableProps>) {
	const t = useTranslations();
	const text = useTableText(grouping);
	const mobileFigure = mobileFigureOf(columns);
	const context = useMemo<RowContext>(() => ({ columns, mobileFigure, text }), [columns, mobileFigure, text]);
	const gridStyle = useMemo(() => tableGridStyleOf(columns), [columns]);
	const [openState, setOpenState] = useState<OpenState>(INITIAL_OPEN_STATE);

	const lineCount = lineCountOf(groups);
	const isShortTable = lineCount <= AUTO_OPEN_LINE_LIMIT;
	const baseOpen = openState.allOpen ?? isShortTable;
	const hasRows = groups.length > 0;
	const showsRows = hasRows && !isLoading;
	const showsEmpty = !hasRows && !isLoading && !isError;
	const showsError = isError && !isLoading;
	const showsHeader = !showsEmpty && !showsError;
	const isAnyGroupOpen = groups.some((group) => isOpenIn(openState, baseOpen, group.key));

	const toggleGroup = useCallback(
		(key: string) => {
			setOpenState((current) => ({
				allOpen: current.allOpen ?? baseOpen,
				toggled: withToggledKey(current.toggled, key)
			}));
		},
		[baseOpen]
	);

	const toggleAll = () => {
		setOpenState({ allOpen: !isAnyGroupOpen, toggled: new Set() });
	};

	const toggleAllLabel = toggleAllLabelOf(isAnyGroupOpen, t);

	if (isLoading) {
		return <TimeActivityTableSkeleton grouping={grouping} columns={columns} />;
	}

	return (
		<DashboardSection
			title={t(TITLE_KEYS[grouping])}
			ariaLabel={t(TITLE_KEYS[grouping])}
			actions={
				showsRows && (
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={toggleAll}
						className="text-muted-foreground"
					>
						{toggleAllLabel}
					</Button>
				)
			}
		>
			<div role="table" aria-label={t(TITLE_KEYS[grouping])} style={gridStyle}>
				{showsHeader && (
					<ReportHeaderRow gridClassName={TABLE_GRID}>
						<HeaderCells grouping={grouping} columns={columns} mobileFigure={mobileFigure} />
					</ReportHeaderRow>
				)}
				{showsError && <DashboardErrorNotice onRetry={onRetry} className="m-3" />}
				{showsEmpty && (
					<TableEmpty
						period={period}
						hasFilters={hasFilters}
						onClearFilters={onClearFilters}
						onPreviousPeriod={onPreviousPeriod}
					/>
				)}
				{showsRows && (
					<>
						<div className="hairline-divide-y divide-border">
							{groups.map((group) => (
								<GroupBlock
									key={group.key}
									group={group}
									isOpen={isOpenIn(openState, baseOpen, group.key)}
									onToggle={toggleGroup}
									context={context}
								/>
							))}
						</div>
						<ReportTotalsRow gridClassName={TABLE_GRID}>
							<span role="rowheader" className="flex min-w-0 items-baseline gap-2">
								<span>{t('common.TOTAL')}</span>
								<span className="truncate text-xs font-normal tabular-nums text-muted-foreground">
									{groupCountLabelOf(grouping, groups.length, t)}
								</span>
							</span>
							{columns.projects && (
								<span
									role="cell"
									className={cn(FIGURE_TEXT, 'font-normal text-muted-foreground max-sm:hidden')}
								>
									{t('dashboard.timeActivity.table.PROJECTS', { count: totals.projectCount })}
								</span>
							)}
							<FigureCells figures={totals} context={context} />
						</ReportTotalsRow>
					</>
				)}
			</div>
		</DashboardSection>
	);
}

function toggleAllLabelOf(isAnyGroupOpen: boolean, t: ReturnType<typeof useTranslations>) {
	if (isAnyGroupOpen) {
		return t('dashboard.timeActivity.table.COLLAPSE_ALL');
	}
	return t('dashboard.timeActivity.table.EXPAND_ALL');
}
