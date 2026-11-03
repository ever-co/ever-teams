'use client';

import { memo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ActivityFigure } from '@/core/components/dashboards/kit/meters';
import { DASHBOARD_SURFACE, NUMBER_CELL } from '@/core/components/dashboards/kit/recipes';
import { cn } from '@/core/lib/helpers';
import { formatDurationShort } from '@/core/lib/utils/dashboard-figures';
import { type DaySegment, localDateOfKey, type RosterDay } from '@/core/lib/utils/dashboards/team';
import { MemberFace } from './team-marks';
import { toneOfKey } from './team-series-tone';
import type { SlotFormats } from './team-slot-labels';

type Translate = ReturnType<typeof useTranslations>;

const SHOWN_MEMBERS = 4;

function memberNameOf(name: string, t: Translate) {
	if (name) {
		return name;
	}
	return t('dashboard.team.UNNAMED_MEMBER');
}

function weekdayOf(date: Date, formats: SlotFormats) {
	return formats.weekdayShort.format(date);
}

function monthDayOf(date: Date, formats: SlotFormats) {
	return formats.monthDay.format(date);
}

function DaySplitBar({
	segments,
	tones
}: Readonly<{ segments: ReadonlyArray<DaySegment>; tones: ReadonlyMap<string, string> }>) {
	if (segments.length === 0) {
		return <span aria-hidden="true" className="block h-1.5 w-full rounded-full bg-foreground/[0.07]" />;
	}
	return (
		<span aria-hidden="true" className="flex h-1.5 w-full gap-px overflow-hidden rounded-full">
			{segments.map((segment) => (
				<span
					key={segment.key}
					className="h-full"
					style={{ width: `${segment.share}%`, backgroundColor: toneOfKey(tones, segment.key) }}
				/>
			))}
		</span>
	);
}

function moreLabelOf(showsAll: boolean, hiddenCount: number, t: Translate) {
	if (showsAll) {
		return t('dashboard.team.roster.FEWER_MEMBERS');
	}
	return t('dashboard.team.roster.MORE_MEMBERS', { count: hiddenCount });
}

export const TeamDayCard = memo(function TeamDayCard({
	day,
	tones,
	formats
}: Readonly<{ day: RosterDay; tones: ReadonlyMap<string, string>; formats: SlotFormats }>) {
	const t = useTranslations();
	const [showsAll, setShowsAll] = useState(false);
	const { summary } = day;
	const date = localDateOfKey(summary.dateKey);
	const members = summary.members;
	const hiddenCount = Math.max(members.length - SHOWN_MEMBERS, 0);
	const hasHidden = hiddenCount > 0;
	let shownMembers = members;
	if (!showsAll) {
		shownMembers = members.slice(0, SHOWN_MEMBERS);
	}
	const meta = t('dashboard.team.roster.DAY_META', {
		members: summary.memberCount,
		projects: summary.projectCount
	});
	return (
		<article className={cn(DASHBOARD_SURFACE, 'flex flex-col gap-3.5 p-4')}>
			<header className="flex min-w-0 items-start justify-between gap-3">
				<div className="flex min-w-0 flex-col">
					<h3 className="flex min-w-0 items-baseline gap-1.5 text-[13px] text-foreground">
						<span className="font-semibold">{weekdayOf(date, formats)}</span>
						<span className="truncate">{monthDayOf(date, formats)}</span>
						{day.isToday && <span className="shrink-0 text-xs text-primary-ink">{t('common.TODAY')}</span>}
					</h3>
					<p className="truncate text-xs text-muted-foreground">{meta}</p>
				</div>
				<span className="shrink-0 text-lg font-semibold tabular-nums text-foreground">
					{formatDurationShort(summary.seconds)}
				</span>
			</header>
			<div className="flex items-center justify-between gap-3">
				<span className="text-xs text-muted-foreground">{t('dashboard.team.table.ACTIVITY')}</span>
				<ActivityFigure percent={summary.activity} />
			</div>
			<DaySplitBar segments={day.segments} tones={tones} />
			<ul className="flex flex-col">
				{shownMembers.map((member) => {
					const name = memberNameOf(member.name, t);
					return (
						<li key={member.key} className="flex min-h-8 min-w-0 items-center gap-2.5">
							<MemberFace name={name} imageUrl={member.imageUrl} className="size-5 text-[9px]" />
							<span className="min-w-0 flex-1 truncate text-[13px] text-foreground">{name}</span>
							<span className={NUMBER_CELL}>{formatDurationShort(member.seconds)}</span>
						</li>
					);
				})}
			</ul>
			{hasHidden && (
				<button
					type="button"
					aria-expanded={showsAll}
					onClick={() => setShowsAll((current) => !current)}
					className="-mx-1.5 -mt-2 self-start rounded-md px-1.5 py-1 text-xs font-medium text-primary-ink outline-none transition-colors hover:bg-foreground/5 focus-visible:ring-[3px] focus-visible:ring-ring/25"
				>
					{moreLabelOf(showsAll, hiddenCount, t)}
				</button>
			)}
		</article>
	);
});
