'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAtomValue } from 'jotai';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { nanoid } from 'nanoid';
import { PageLayout } from '@/core/components/layouts/default-layout';
import { Breadcrumb } from '@/core/components/duplicated-components/breadcrumb';
import { DASHBOARD_STACK } from '@/core/components/dashboards/kit/recipes';
import { CalendarPlus, LogIn, Plus, VideoCall } from '@/core/components/icons';
import { preloadLiveKit } from '@/core/components/optimized-components/meet';
import { useScheduledMeetings } from '@/core/hooks/meetings/use-scheduled-meetings';
import { activeTeamNameState } from '@/core/stores';
import { cn } from '@/core/lib/helpers';
import { isJitsiMeeting, meetRoomNameFor } from '@/core/lib/utils/collaboration';
import { meetingPathFor } from '@/core/lib/utils/meetings';
import { JoinMeetingDialog } from './join-meeting-dialog';
import { MeetingAgenda } from './meeting-agenda';
import { ScheduleMeetingDialog } from './schedule-meeting-dialog';

/** The agenda and the clock move on with time; half a minute is fine for both, and cheap. */
const NOW_REFRESH_MS = 30_000;

function useNow(): Date {
	const [now, setNow] = useState(() => new Date());
	useEffect(() => {
		const timer = window.setInterval(() => setNow(new Date()), NOW_REFRESH_MS);
		return () => window.clearInterval(timer);
	}, []);
	return now;
}

interface ActionTileProps {
	icon: ReactNode;
	label: string;
	hint: string;
	onClick: () => void;
	onPrepare?: () => void;
	isPrimary?: boolean;
	disabled?: boolean;
	testId: string;
}

function ActionTile({
	icon,
	label,
	hint,
	onClick,
	onPrepare,
	isPrimary = false,
	disabled = false,
	testId
}: Readonly<ActionTileProps>) {
	return (
		<button
			type="button"
			onClick={onClick}
			onPointerEnter={onPrepare}
			onFocus={onPrepare}
			disabled={disabled}
			data-testid={testId}
			className="group flex cursor-pointer flex-col items-center gap-3 rounded-xl p-4 text-center outline-none transition-colors hover:bg-muted/60 focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-50"
		>
			<span
				className={cn(
					'flex size-16 items-center justify-center rounded-full transition-transform group-hover:scale-105 [&_svg]:size-6',
					isPrimary
						? 'bg-primary text-primary-foreground'
						: 'bg-card text-foreground hairline-ring ring-border'
				)}
				aria-hidden="true"
			>
				{icon}
			</span>
			<span className="flex flex-col gap-0.5">
				<span className="text-sm font-medium text-foreground">{label}</span>
				<span className="text-xs text-muted-foreground">{hint}</span>
			</span>
		</button>
	);
}

/**
 * The meetings home: the time, the three ways in (join, start, plan) and the agenda of the meetings one scheduled.
 * Rooms are Jitsi or LiveKit, as the deployment chose; scheduling keeps the meeting in Ever Gauzy.
 */
export function MeetingsPage() {
	const t = useTranslations();
	const locale = useLocale();
	const router = useRouter();
	const now = useNow();
	const isJitsi = useMemo(() => isJitsiMeeting(), []);
	const teamName = useAtomValue(activeTeamNameState);
	const scheduled = useScheduledMeetings();
	const [openDialog, setOpenDialog] = useState<'join' | 'schedule' | null>(null);
	// Each opening starts a new dialog: the time it proposes is the next slot from now, and the answer of a request
	// made by a dialog closed before it came back never shows in the next one
	const [dialogKey, setDialogKey] = useState(0);
	// The day Schedule proposes, when it opens from a day of the agenda
	const [scheduleDay, setScheduleDay] = useState<Date | undefined>(undefined);
	const openDialogOf = (dialog: 'join' | 'schedule', day?: Date) => {
		setDialogKey((key) => key + 1);
		setScheduleDay(day);
		setOpenDialog(dialog);
	};
	const title = t('meetings.TITLE');

	const newRoomPath = (meetingTitle?: string) =>
		meetingPathFor(meetRoomNameFor(teamName, [], nanoid(10)), isJitsi, meetingTitle);

	const startMeeting = () => router.push(newRoomPath());
	const prepareMeeting = () => {
		if (!isJitsi) preloadLiveKit();
	};

	return (
		<PageLayout
			title={title}
			breadcrumb={
				<div className="flex min-w-0 items-center gap-2">
					<VideoCall className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
					<Breadcrumb paths={[{ title, href: `/${locale}/meet` }]} className="min-w-0 text-sm" />
				</div>
			}
		>
			<div className={cn(DASHBOARD_STACK, 'mx-auto w-full max-w-4xl')}>
				<section aria-labelledby="meetings-heading" className="flex flex-col items-center gap-6 py-6 sm:py-10">
					<div className="flex flex-col items-center gap-1 text-center">
						<h1 id="meetings-heading" className="sr-only">
							{title}
						</h1>
						<time
							dateTime={now.toISOString()}
							className="text-4xl font-semibold tabular-nums tracking-tight text-foreground sm:text-5xl"
						>
							{new Intl.DateTimeFormat(locale, { timeStyle: 'short' }).format(now)}
						</time>
						<p className="text-sm text-muted-foreground">
							{new Intl.DateTimeFormat(locale, { dateStyle: 'full' }).format(now)}
						</p>
					</div>
					<div className="grid w-full max-w-xl grid-cols-3 gap-2">
						<ActionTile
							icon={<LogIn />}
							label={t('meetings.JOIN')}
							hint={t('meetings.JOIN_HINT')}
							onClick={() => openDialogOf('join')}
							onPrepare={prepareMeeting}
							testId="meetings-join"
						/>
						<ActionTile
							icon={<Plus />}
							label={t('meetings.NEW_MEETING')}
							hint={t('meetings.NEW_MEETING_HINT')}
							onClick={startMeeting}
							onPrepare={prepareMeeting}
							isPrimary
							testId="meetings-new"
						/>
						<ActionTile
							icon={<CalendarPlus />}
							label={t('meetings.SCHEDULE')}
							hint={
								scheduled.canSchedule ? t('meetings.SCHEDULE_HINT') : t('meetings.SCHEDULE_NO_EMPLOYEE')
							}
							onClick={() => openDialogOf('schedule')}
							disabled={!scheduled.canSchedule}
							testId="meetings-schedule"
						/>
					</div>
				</section>

				{scheduled.canSchedule && (
					<MeetingAgenda
						meetings={scheduled.meetings}
						isLoading={scheduled.isLoading}
						isError={scheduled.isError}
						onRetry={() => void scheduled.refetch()}
						isJitsi={isJitsi}
						now={now}
						cancellingId={scheduled.cancellingId}
						onCancelMeeting={scheduled.cancelMeeting}
						onScheduleOn={(day) => openDialogOf('schedule', day)}
					/>
				)}
			</div>

			<JoinMeetingDialog
				key={`join-${dialogKey}`}
				open={openDialog === 'join'}
				onClose={() => setOpenDialog(null)}
				isJitsi={isJitsi}
			/>
			<ScheduleMeetingDialog
				key={`schedule-${dialogKey}`}
				open={openDialog === 'schedule'}
				onClose={() => setOpenDialog(null)}
				initialDay={scheduleDay}
				linkFor={(meetingTitle) => `${window.location.origin}${newRoomPath(meetingTitle)}`}
				onSchedule={scheduled.scheduleMeeting}
				isScheduling={scheduled.isScheduling}
			/>
		</PageLayout>
	);
}
