'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { cn } from '@/core/lib/helpers';
import { localDayKeyOf } from '@/core/lib/utils/dashboard-export';
import {
	type LiveMember,
	type LiveState,
	type LiveTask,
	localDateOfKey,
	timesheetPathOf
} from '@/core/lib/utils/dashboards/team';
import { MemberFace } from './team-marks';

type Translate = ReturnType<typeof useTranslations>;

export const DOT_TONES: Record<LiveState, string> = {
	working: 'bg-success',
	paused: 'bg-warning',
	online: 'bg-info',
	stopped: 'bg-muted-foreground/60',
	notStarted: 'border-[1.5px] border-muted-foreground/60 bg-card',
	inactive: 'border-[1.5px] border-muted-foreground/40 bg-card'
};

export const CHIP_TONES: Record<LiveState, string> = {
	working: 'bg-success/10 text-success-foreground',
	paused: 'bg-warning/10 text-warning-foreground',
	online: 'bg-info/10 text-info-foreground',
	stopped: 'bg-foreground/5 text-muted-foreground',
	notStarted: 'bg-foreground/5 text-muted-foreground',
	inactive: 'bg-foreground/5 text-muted-foreground'
};

export const STATE_LABEL_KEYS = {
	working: 'common.WORKING',
	paused: 'common.PAUSED',
	online: 'common.ONLINE',
	stopped: 'dashboard.team.live.STATE_STOPPED',
	notStarted: 'dashboard.team.live.STATE_NOT_STARTED',
	inactive: 'dashboard.team.live.STATE_INACTIVE'
} as const;

export function taskTextOf(task: LiveTask) {
	if (!task.numberLabel) {
		return task.title;
	}
	return `${task.numberLabel} ${task.title}`;
}

function yesterdayKeyOf(now: Date) {
	const yesterday = new Date(now);
	yesterday.setDate(now.getDate() - 1);
	return localDayKeyOf(yesterday);
}

export function lastTrackedTextOf(dateKey: string, dayFormat: Intl.DateTimeFormat, t: Translate) {
	const now = new Date();
	const todayKey = localDayKeyOf(now);
	if (dateKey === todayKey) {
		return t('dashboard.team.live.TRACKED_TODAY');
	}
	const yesterdayKey = yesterdayKeyOf(now);
	if (dateKey === yesterdayKey) {
		return t('dashboard.team.live.LAST_TRACKED_YESTERDAY');
	}
	const date = localDateOfKey(dateKey);
	const day = dayFormat.format(date);
	return t('dashboard.team.live.LAST_TRACKED', { day });
}

/** What the member does now, in words; Gauzy keeps no time of day for a stopped timer, so the day stands in. */
export function doingTextOf(member: LiveMember, dayFormat: Intl.DateTimeFormat, t: Translate) {
	const task = member.task;
	switch (member.state) {
		case 'working':
			if (task) {
				return taskTextOf(task);
			}
			return t('dashboard.team.live.TRACKING_NO_TASK');
		case 'paused':
			if (task) {
				return t('dashboard.team.live.PAUSED_ON', { task: taskTextOf(task) });
			}
			return t('common.PAUSED');
		case 'online':
			return t('dashboard.team.live.ONLINE_IDLE');
		case 'stopped':
			if (task) {
				return t('dashboard.team.live.LAST_ON', { task: taskTextOf(task) });
			}
			return t('dashboard.team.live.TRACKED_TODAY');
		case 'inactive':
			return t('dashboard.team.live.INACTIVE');
		default:
			break;
	}
	if (member.lastTrackedDateKey) {
		return lastTrackedTextOf(member.lastTrackedDateKey, dayFormat, t);
	}
	return t('dashboard.team.live.NOT_STARTED_TODAY');
}

export function isQuietMember(member: LiveMember) {
	const hasTodayTime = member.todaySeconds > 0;
	const isOff = member.state === 'notStarted';
	const isInactive = member.state === 'inactive';
	const isAway = isOff || isInactive;
	return isAway && !hasTodayTime;
}

export function memberNameOf(name: string, t: Translate) {
	if (name) {
		return name;
	}
	return t('dashboard.team.UNNAMED_MEMBER');
}

export function timesheetHrefOf(member: LiveMember, name: string, canOpenTimesheet: boolean) {
	if (!canOpenTimesheet || !member.userId) {
		return null;
	}
	return timesheetPathOf(member.userId, name);
}

export function MemberName({ name, href, isQuiet }: Readonly<{ name: string; href: string | null; isQuiet: boolean }>) {
	const t = useTranslations();
	const className = cn('truncate text-[13px] font-medium', isQuiet && 'text-muted-foreground');
	if (!href) {
		return <span className={className}>{name}</span>;
	}
	return (
		<Link
			href={href}
			prefetch={false}
			aria-label={t('dashboard.team.roster.OPEN_TIMESHEET', { name })}
			className={cn(className, 'rounded-sm outline-none hover:underline focus-visible:underline')}
		>
			{name}
		</Link>
	);
}

const SHOWN_FACES = 6;

export function foldedTextOf(member: LiveMember, dayFormat: Intl.DateTimeFormat, t: Translate) {
	if (member.state === 'online') {
		return t('dashboard.team.live.ONLINE_IDLE');
	}
	if (member.state === 'inactive') {
		return t('dashboard.team.live.INACTIVE');
	}
	if (member.lastTrackedDateKey) {
		return lastTrackedTextOf(member.lastTrackedDateKey, dayFormat, t);
	}
	return t('dashboard.team.live.NO_TIME_IN_PERIOD');
}

export function FaceStack({ members }: Readonly<{ members: ReadonlyArray<LiveMember> }>) {
	const t = useTranslations();
	const shown = members.slice(0, SHOWN_FACES);
	const hiddenCount = members.length - shown.length;
	return (
		<span aria-hidden="true" className="flex shrink-0 -space-x-1.5">
			{shown.map((member) => (
				<span key={member.employeeId} className="rounded-full ring-2 ring-card">
					<MemberFace
						name={memberNameOf(member.name, t)}
						imageUrl={member.imageUrl}
						className="size-6 text-[9px]"
					/>
				</span>
			))}
			{hiddenCount > 0 && (
				<span className="z-[1] flex size-6 items-center justify-center rounded-full bg-muted text-[10px] font-medium tabular-nums text-muted-foreground ring-2 ring-card">
					+{hiddenCount}
				</span>
			)}
		</span>
	);
}

export function StateDot({ state, className }: Readonly<{ state: LiveState; className?: string }>) {
	return (
		<span
			aria-hidden="true"
			className={cn(
				'absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full ring-2 ring-card',
				DOT_TONES[state],
				className
			)}
		/>
	);
}

export function StateChip({ state, className }: Readonly<{ state: LiveState; className?: string }>) {
	const t = useTranslations();
	return (
		<span
			className={cn(
				'inline-flex h-5 items-center gap-1.5 rounded-md px-1.5 text-[11px] font-medium whitespace-nowrap',
				CHIP_TONES[state],
				className
			)}
		>
			<span aria-hidden="true" className={cn('size-1.5 rounded-full', DOT_TONES[state])} />
			{t(STATE_LABEL_KEYS[state])}
		</span>
	);
}
