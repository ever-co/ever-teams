'use client';

import { type CSSProperties, memo, useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { DashboardErrorNotice } from '@/core/components/dashboards/kit/dashboard-states';
import { HourAxis } from '@/core/components/dashboards/kit/hour-axis';
import { SKELETON_BAR } from '@/core/components/dashboards/kit/recipes';
import { dataColorHue } from '@/core/components/tasks/task-data-color';
import { cn } from '@/core/lib/helpers';
import { formatDurationShort, formatPercent } from '@/core/lib/utils/dashboard-figures';
import type { LiveMember } from '@/core/lib/utils/dashboards/team';
import {
	type DayTimeline,
	isNoProjectKey,
	type TimelineBlock,
	type TimelineLane,
	type TimelineProject
} from '@/core/lib/utils/dashboards/team-day';
import { TeamCard } from './team-card';
import { FULL_SPAN } from './team-grid';
import { FaceStack, memberNameOf } from './team-live-parts';
import { MemberFace } from './team-marks';
import { memberToneOf } from './team-series-tone';

type Translate = ReturnType<typeof useTranslations>;

const LANE_GRID = 'grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-[12rem_minmax(0,1fr)] sm:items-center';

const NO_PROJECT_TONE = 'hsl(var(--foreground) / 0.28)';

const SKELETON_LANES = 3;

function isNamedProject(project: TimelineProject) {
	const isWithoutProject = isNoProjectKey(project.key);
	return !project.isOther && !isWithoutProject;
}

/** Blocks take their project's colour when some project carries time today; otherwise their member's hue. */
function hasProjectTimeOf(timeline: DayTimeline) {
	return timeline.projects.some(isNamedProject);
}

function projectToneOf(projectKey: string, projectColor: string | null) {
	if (projectColor) {
		return dataColorHue(projectColor);
	}
	if (isNoProjectKey(projectKey)) {
		return NO_PROJECT_TONE;
	}
	return memberToneOf(projectKey);
}

function blockToneOf(block: TimelineBlock, employeeId: string, byProject: boolean) {
	if (byProject) {
		return projectToneOf(block.projectKey, block.projectColor);
	}
	return memberToneOf(employeeId);
}

function legendToneOf(project: TimelineProject) {
	if (project.isOther) {
		return NO_PROJECT_TONE;
	}
	return projectToneOf(project.key, project.color);
}

function blockStyleOf(block: TimelineBlock, employeeId: string, byProject: boolean): CSSProperties {
	return {
		left: `${block.leftPercent}%`,
		width: `${block.widthPercent}%`,
		backgroundColor: blockToneOf(block, employeeId, byProject)
	};
}

function projectNameOf(project: TimelineProject, t: Translate) {
	if (project.isOther) {
		return t('dashboard.team.timeline.OTHER_PROJECTS', { count: project.otherCount });
	}
	if (isNoProjectKey(project.key)) {
		return t('dashboard.team.projects.NONE');
	}
	return project.name;
}

function blockLabelOf(block: TimelineBlock, timeFormat: Intl.DateTimeFormat, t: Translate) {
	const start = timeFormat.format(block.start);
	const end = timeFormat.format(block.end);
	const duration = formatDurationShort(block.seconds);
	let task = block.taskTitle;
	if (!task) {
		task = t('dashboard.team.recent.WITHOUT_TASK');
	}
	return t('dashboard.team.timeline.BLOCK_LABEL', { start, end, duration, task });
}

const LaneTrack = memo(function LaneTrack({
	lane,
	nowPercent,
	timeFormat,
	byProject
}: Readonly<{ lane: TimelineLane; nowPercent: number | null; timeFormat: Intl.DateTimeFormat; byProject: boolean }>) {
	const t = useTranslations();
	const showsNow = nowPercent !== null;
	return (
		<div className="relative h-7 overflow-hidden rounded-md bg-foreground/[0.03]">
			{lane.blocks.map((block) => {
				const label = blockLabelOf(block, timeFormat, t);
				return (
					<span
						key={block.key}
						title={label}
						aria-label={label}
						role="img"
						style={blockStyleOf(block, lane.person.employeeId, byProject)}
						className="absolute inset-y-1 min-w-[3px] rounded-[4px]"
					/>
				);
			})}
			{showsNow && (
				<span
					aria-hidden="true"
					style={{ left: `${nowPercent}%` }}
					className="absolute inset-y-0 w-px bg-destructive/70"
				/>
			)}
		</div>
	);
});

const LaneLabel = memo(function LaneLabel({ lane }: Readonly<{ lane: TimelineLane }>) {
	const t = useTranslations();
	const name = memberNameOf(lane.person.name, t);
	return (
		<div className="flex min-w-0 items-center gap-2">
			<MemberFace name={name} imageUrl={lane.person.imageUrl} className="size-6 text-[9px]" />
			<span className="min-w-0 flex-1 truncate text-[13px] text-foreground">{name}</span>
			<span className="shrink-0 text-xs tabular-nums text-muted-foreground">
				{formatDurationShort(lane.seconds)}
			</span>
		</div>
	);
});

function ProjectLegend({ projects }: Readonly<{ projects: ReadonlyArray<TimelineProject> }>) {
	const t = useTranslations();
	const locale = useLocale();
	if (projects.length === 0) {
		return null;
	}
	return (
		<ul className="flex flex-wrap items-center gap-x-5 gap-y-1.5 pt-4">
			{projects.map((project) => (
				<li key={project.key} className="flex min-w-0 items-center gap-1.5 text-xs">
					<span
						aria-hidden="true"
						className="size-2 shrink-0 rounded-full"
						style={{ backgroundColor: legendToneOf(project) }}
					/>
					<span className="tabular-nums text-foreground">{formatPercent(project.share, locale)}</span>
					<span className="max-w-48 truncate text-muted-foreground">{projectNameOf(project, t)}</span>
				</li>
			))}
		</ul>
	);
}

function NotStartedLine({ members }: Readonly<{ members: ReadonlyArray<LiveMember> }>) {
	const t = useTranslations();
	if (members.length === 0) {
		return null;
	}
	return (
		<div className="flex min-w-0 items-center gap-3 pt-4">
			<FaceStack members={members} />
			<span className="truncate text-xs text-muted-foreground">
				{t('dashboard.team.live.NOT_STARTED', { count: members.length })}
			</span>
		</div>
	);
}

export function TeamDayTimelineSkeleton() {
	const t = useTranslations();
	return (
		<TeamCard title={t('dashboard.team.timeline.TITLE')} className={FULL_SPAN} isBusy>
			<div className="flex flex-col gap-2" aria-hidden="true">
				<span className={cn('ml-auto h-2.5 w-2/3', SKELETON_BAR)} />
				{Array.from({ length: SKELETON_LANES }).map((_, index) => (
					<div key={index} className={LANE_GRID}>
						<span className={cn('h-3 w-32', SKELETON_BAR)} />
						<span className="h-7 animate-pulse rounded-md bg-foreground/[0.04]" />
					</div>
				))}
			</div>
		</TeamCard>
	);
}

/**
 * Who tracked what today, hour by hour: one lane per member, each block a time log in its project's colour, the
 * present moment as a thin red line. From the references' day timelines (dashboard-work, overview-timeline,
 * employee-aside); the hours come from the time logs, which the daily report does not carry.
 */
export function TeamDayTimeline({
	timeline,
	notStarted,
	isLoading,
	isError,
	onRetry
}: Readonly<{
	timeline: DayTimeline;
	notStarted: ReadonlyArray<LiveMember>;
	isLoading: boolean;
	isError: boolean;
	onRetry: () => void;
}>) {
	const t = useTranslations();
	const locale = useLocale();
	const timeFormat = useClockFormat();
	const dayFormat = useMemo(
		() => new Intl.DateTimeFormat(locale, { weekday: 'short', month: 'short', day: 'numeric' }),
		[locale]
	);

	if (isLoading) {
		return <TeamDayTimelineSkeleton />;
	}

	const title = t('dashboard.team.timeline.TITLE');
	if (isError) {
		return (
			<TeamCard title={title} className={FULL_SPAN}>
				<DashboardErrorNotice onRetry={onRetry} />
			</TeamCard>
		);
	}

	const today = dayFormat.format(new Date());
	const meta = t('dashboard.team.timeline.META', {
		day: today,
		duration: formatDurationShort(timeline.seconds),
		count: timeline.lanes.length
	});
	const hasLanes = timeline.lanes.length > 0;
	const byProject = hasProjectTimeOf(timeline);
	const nowLabel = nowLabelOf(timeline, timeFormat);

	return (
		<TeamCard title={title} meta={meta} className={FULL_SPAN}>
			<div className={LANE_GRID}>
				<span aria-hidden="true" className="max-sm:hidden" />
				<HourAxis timeline={timeline} nowLabel={nowLabel} />
				{timeline.lanes.map((lane) => (
					<LaneRow
						key={lane.person.employeeId}
						lane={lane}
						timeline={timeline}
						timeFormat={timeFormat}
						byProject={byProject}
					/>
				))}
			</div>
			{!hasLanes && (
				<p className="py-4 text-center text-[13px] text-muted-foreground">{t('dashboard.team.today.NOBODY')}</p>
			)}
			{byProject && <ProjectLegend projects={timeline.projects} />}
			<NotStartedLine members={notStarted} />
		</TeamCard>
	);
}

function useClockFormat() {
	const locale = useLocale();
	return useMemo(() => new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }), [locale]);
}

function nowLabelOf(timeline: DayTimeline, timeFormat: Intl.DateTimeFormat) {
	if (timeline.nowPercent === null) {
		return null;
	}
	return timeFormat.format(new Date());
}

export function MemberDayStripSkeleton() {
	return <span aria-hidden="true" className="h-12 animate-pulse rounded-md bg-foreground/[0.04]" />;
}

/** The member sheet's day: the page timeline's hours and track for one member, with that member's projects. */
export function MemberDayStrip({ timeline }: Readonly<{ timeline: DayTimeline }>) {
	const timeFormat = useClockFormat();
	const lane = timeline.lanes[0];
	if (!lane) {
		return null;
	}
	const byProject = hasProjectTimeOf(timeline);
	const nowLabel = nowLabelOf(timeline, timeFormat);
	return (
		<div className="flex flex-col gap-1.5">
			<HourAxis timeline={timeline} nowLabel={nowLabel} isCompact />
			<LaneTrack lane={lane} nowPercent={timeline.nowPercent} timeFormat={timeFormat} byProject={byProject} />
			{byProject && <ProjectLegend projects={timeline.projects} />}
		</div>
	);
}

function LaneRow({
	lane,
	timeline,
	timeFormat,
	byProject
}: Readonly<{ lane: TimelineLane; timeline: DayTimeline; timeFormat: Intl.DateTimeFormat; byProject: boolean }>) {
	return (
		<>
			<LaneLabel lane={lane} />
			<LaneTrack lane={lane} nowPercent={timeline.nowPercent} timeFormat={timeFormat} byProject={byProject} />
		</>
	);
}
