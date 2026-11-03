'use client';

import { type CSSProperties, memo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/core/components/common/avatar';
import { EntityTile } from '@/core/components/common/entity-tile';
import { ActivityFigure } from '@/core/components/dashboards/kit/meters';
import { cn } from '@/core/lib/helpers';
import { formatDurationShort } from '@/core/lib/utils/dashboard-figures';
import { activityPercentOf, type CurrencyAmount, formatAmounts } from '@/core/lib/utils/daily-report-figures';
import type { ReportProjectRef, TableGrouping, TimeActivityColumn } from '@/core/lib/utils/dashboards/time-activity';

export type FigureColumn = Exclude<TimeActivityColumn, 'project'>;

export interface TableColumns {
	/** The projects of a row; By project has no such column, the project is the group. */
	projects: boolean;
	tracked: boolean;
	earnings: boolean;
	activity: boolean;
}

const FIGURE_COLUMNS: ReadonlyArray<FigureColumn> = ['tracked', 'activity', 'earnings'];

export function tableColumnsOf(
	grouping: TableGrouping,
	hiddenColumns: ReadonlyArray<TimeActivityColumn>,
	isManager: boolean
): TableColumns {
	const hasProjectColumn = grouping !== 'project';
	const showsProjects = hasProjectColumn && !hiddenColumns.includes('project');
	const showsEarnings = isManager && !hiddenColumns.includes('earnings');
	return {
		projects: showsProjects,
		tracked: !hiddenColumns.includes('tracked'),
		earnings: showsEarnings,
		activity: !hiddenColumns.includes('activity')
	};
}

/** On a phone a row keeps its name and one figure: the tracked time, or the first figure still shown. */
export function mobileFigureOf(columns: TableColumns): FigureColumn | null {
	const shown = FIGURE_COLUMNS.find((column) => columns[column]);
	return shown ?? null;
}

const COLUMN_TRACKS = {
	name: 'minmax(8rem,1.6fr)',
	projects: 'minmax(6rem,1fr)',
	tracked: '6rem',
	earnings: 'minmax(6.5rem,9rem)',
	activity: '6.75rem'
};

function desktopTemplateOf(columns: TableColumns) {
	const tracks = [COLUMN_TRACKS.name];
	if (columns.projects) {
		tracks.push(COLUMN_TRACKS.projects);
	}
	for (const column of ['tracked', 'earnings', 'activity'] as const) {
		if (columns[column]) {
			tracks.push(COLUMN_TRACKS[column]);
		}
	}
	return tracks.join(' ');
}

function mobileTemplateOf(mobileFigure: FigureColumn | null) {
	if (!mobileFigure) {
		return 'minmax(0,1fr)';
	}
	return 'minmax(0,1fr) auto';
}

/** The grid template is data (it follows the shown columns), so it travels as two CSS variables. */
export function tableGridStyleOf(columns: TableColumns): CSSProperties {
	const mobileFigure = mobileFigureOf(columns);
	return {
		'--ta-grid': mobileTemplateOf(mobileFigure),
		'--ta-grid-sm': desktopTemplateOf(columns)
	} as CSSProperties;
}

export const TABLE_GRID = 'grid grid-cols-(--ta-grid) items-center gap-x-4 px-4 sm:grid-cols-(--ta-grid-sm)';

export function figureCellClassOf(column: FigureColumn, mobileFigure: FigureColumn | null) {
	const isMobileFigure = column === mobileFigure;
	if (isMobileFigure) {
		return 'text-right';
	}
	return 'text-right max-sm:hidden';
}

export const FIGURE_TEXT = 'text-[13px] tabular-nums';

const NO_PROJECT_GLYPH = 'inline-block size-4 shrink-0 rounded-[28%] border border-dashed border-foreground/25';

export const ProjectGlyph = memo(function ProjectGlyph({ project }: Readonly<{ project: ReportProjectRef }>) {
	const hasProject = project.name !== null;
	if (!hasProject) {
		return <span aria-hidden="true" className={NO_PROJECT_GLYPH} />;
	}
	return (
		<EntityTile
			name={project.name}
			color={project.color}
			imageUrl={project.imageUrl}
			className="size-4 text-[7px]"
		/>
	);
});

function lastInitialOf(words: string[]) {
	if (words.length < 2) {
		return '';
	}
	const lastWord = words.at(-1);
	return lastWord?.[0] ?? '';
}

function initialsOf(name: string) {
	const words = name.trim().split(/\s+/).filter(Boolean);
	const first = words[0]?.[0] ?? '';
	const last = lastInitialOf(words);
	return `${first}${last}`.toUpperCase();
}

export function PersonGlyph({ name, imageUrl }: Readonly<{ name: string; imageUrl?: string | null }>) {
	return (
		<Avatar className="size-4 text-[7px] font-medium">
			<AvatarImage src={imageUrl ?? undefined} alt="" loading="lazy" />
			<AvatarFallback className="text-[inherit]">{initialsOf(name)}</AvatarFallback>
		</Avatar>
	);
}

export function projectNameOf(project: ReportProjectRef, noProjectLabel: string) {
	return project.name ?? noProjectLabel;
}

export const ProjectsCell = memo(function ProjectsCell({
	projects,
	noProjectLabel,
	moreLabel
}: Readonly<{
	projects: ReadonlyArray<ReportProjectRef>;
	noProjectLabel: string;
	moreLabel: (count: number) => string;
}>) {
	const [first, ...others] = projects;
	if (!first) {
		return <span className="max-sm:hidden" />;
	}
	const names = projects.map((project) => projectNameOf(project, noProjectLabel));
	const hasOthers = others.length > 0;
	return (
		<span className="flex min-w-0 items-center gap-1.5 max-sm:hidden" title={names.join(', ')}>
			<ProjectGlyph project={first} />
			<span className="truncate text-[13px] text-foreground">{projectNameOf(first, noProjectLabel)}</span>
			{hasOthers && (
				<span className="shrink-0 rounded-[5px] bg-foreground/[0.06] px-1 text-[11px] font-medium tabular-nums text-muted-foreground">
					{moreLabel(others.length)}
				</span>
			)}
		</span>
	);
});

export function DurationText({ seconds, className }: Readonly<{ seconds: number; className?: string }>) {
	const isEmpty = seconds <= 0;
	return (
		<span className={cn(FIGURE_TEXT, isEmpty && 'text-muted-foreground', className)}>
			{formatDurationShort(seconds)}
		</span>
	);
}

/** Members can be paid in different currencies: amounts are never mixed. */
export function EarningsText({
	amounts,
	locale,
	noRateLabel,
	className
}: Readonly<{ amounts: ReadonlyArray<CurrencyAmount>; locale: string; noRateLabel: string; className?: string }>) {
	const hasAmounts = amounts.length > 0;
	if (!hasAmounts) {
		return (
			<span className={cn(FIGURE_TEXT, 'text-muted-foreground', className)} title={noRateLabel}>
				<span aria-hidden="true">–</span>
				<span className="sr-only">{noRateLabel}</span>
			</span>
		);
	}
	const text = formatAmounts(amounts, locale);
	return (
		<span className={cn(FIGURE_TEXT, 'block truncate', className)} title={text}>
			{text}
		</span>
	);
}

export function ActivityText({
	seconds,
	activeSeconds,
	noActivityLabel
}: Readonly<{ seconds: number; activeSeconds: number; noActivityLabel: string }>) {
	const hasTime = seconds > 0;
	if (!hasTime) {
		return (
			<span className={cn(FIGURE_TEXT, 'text-muted-foreground')}>
				<span aria-hidden="true">–</span>
				<span className="sr-only">{noActivityLabel}</span>
			</span>
		);
	}
	const percent = activityPercentOf({ seconds, activeSeconds });
	return <ActivityFigure percent={percent} />;
}
