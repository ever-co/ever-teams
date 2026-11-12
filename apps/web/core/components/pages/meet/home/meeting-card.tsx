'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@/core/components/common/dropdown-menu';
import { Button } from '@/core/components/duplicated-components/_button';
import { CalendarPlus, Copy, Link, MoreHorizontal, Trash, VideoCall } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import {
	meetingPathOfInput,
	scheduledMeetingStateOf,
	startOfDay,
	type ScheduledMeeting,
	type ScheduledMeetingState
} from '@/core/lib/utils/meetings';
import {
	copyMeetingInvitation,
	copyMeetingText,
	downloadMeetingIcs,
	meetingStartedAgoOf,
	meetingTimesOf
} from './meeting-invitation';

const DAY = 24 * 60 * 60 * 1000;

type Translate = ReturnType<typeof useTranslations>;

/** "Now" for a running meeting, "Starts soon", "Ended", else the day it starts: "Today", "Tomorrow" or its weekday. */
function whenWordOf(
	state: ScheduledMeetingState,
	meeting: ScheduledMeeting,
	now: Date,
	locale: string,
	t: Translate
): string {
	if (state === 'live') return t('meetings.LIVE');
	if (state === 'soon') return t('meetings.STARTS_SOON');
	if (state === 'ended') return t('meetings.ENDED');
	// Rounded: a day that changes the clock is 23 or 25 hours long
	const daysAway = Math.round((startOfDay(meeting.start).getTime() - startOfDay(now).getTime()) / DAY);
	if (daysAway === 0) return t('meetings.TODAY');
	if (daysAway === 1) return t('meetings.TOMORROW');
	return new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(meeting.start);
}

interface MeetingCardProps {
	meeting: ScheduledMeeting;
	now: Date;
	isJitsi: boolean;
	/** Who hosts the meeting: the agenda lists the person's own meetings, so the person. */
	hostName: string;
	isCancelling: boolean;
	onCancel: (meeting: ScheduledMeeting) => void;
}

/**
 * A meeting of the agenda, as the inspiration draws it: its title, when it runs, who hosts it, how long it has been
 * on once it started, and the way in: Join while it runs, Start before. Its menu starts or joins it, copies the
 * invitation or the link, adds it to a calendar, and deletes it once confirmed.
 */
export function MeetingCard({ meeting, now, isJitsi, hostName, isCancelling, onCancel }: Readonly<MeetingCardProps>) {
	const t = useTranslations();
	const locale = useLocale();
	const router = useRouter();
	const state = scheduledMeetingStateOf(meeting, now);
	const title = meeting.title || t('meetings.UNTITLED');
	const path = meeting.link ? meetingPathOfInput(meeting.link, isJitsi) : null;
	const isLive = state === 'live';

	const copyLink = async () => {
		if (!meeting.link) return;
		const isCopied = await copyMeetingText(meeting.link);
		if (isCopied) toast.success(t('meetings.LINK_COPIED'));
		else toast.info(t('meetings.COPY_LINK'), { description: meeting.link, duration: 10000 });
	};

	const copyInvitation = async () => {
		if (meeting.link) await copyMeetingInvitation({ ...meeting, title, link: meeting.link }, locale, t);
	};

	const open = () => {
		if (path) router.push(path);
	};

	return (
		<li
			data-testid="scheduled-meeting"
			className={cn(
				'flex min-w-0 flex-col gap-3 rounded-xl p-4 hairline-ring ring-border',
				isLive ? 'bg-muted/60' : 'bg-card',
				state === 'ended' && 'opacity-60'
			)}
		>
			<div className="flex min-w-0 gap-3">
				<span
					aria-hidden="true"
					className={cn('w-1 shrink-0 self-stretch rounded-full', isLive ? 'bg-primary' : 'bg-border')}
				/>
				<div className="flex min-w-0 flex-1 flex-col gap-0.5">
					<h3 className="truncate text-sm font-semibold text-foreground">{title}</h3>
					<p className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
						<span className={cn(isLive && 'font-medium text-destructive-ink')}>
							{whenWordOf(state, meeting, now, locale, t)}
						</span>
						<span aria-hidden="true">·</span>
						<span className="tabular-nums">{meetingTimesOf(meeting, locale)}</span>
					</p>
				</div>
			</div>
			{hostName && <p className="text-xs text-muted-foreground">{t('meetings.HOST', { name: hostName })}</p>}
			{isLive && (
				<p className="flex items-center gap-1.5 text-xs font-medium text-destructive-ink">
					<span aria-hidden="true" className="size-2 shrink-0 animate-pulse rounded-full bg-destructive" />
					{t('meetings.STARTED_AGO', { ago: meetingStartedAgoOf(meeting, now, locale) })}
				</p>
			)}
			<div className="mt-auto flex items-center gap-1">
				{path && state !== 'ended' && (
					<Button
						type="button"
						size="sm"
						variant={isLive ? 'default' : 'secondary'}
						onClick={open}
						aria-label={
							isLive
								? t('meetings.JOIN_MEETING_OF', { title })
								: t('meetings.START_MEETING_OF', { title })
						}
					>
						<VideoCall className="size-4" aria-hidden="true" />
						{isLive ? t('meetings.JOIN') : t('meetings.START')}
					</Button>
				)}
				<span className="flex-1" />
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							type="button"
							variant="ghost"
							size="icon-sm"
							aria-label={t('meetings.MEETING_ACTIONS_OF', { title })}
							title={t('common.MORE_OPTIONS')}
						>
							<MoreHorizontal className="size-4" aria-hidden="true" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						{path && state !== 'ended' && (
							<DropdownMenuItem onClick={open}>
								<VideoCall />
								{isLive ? t('meetings.JOIN_MEETING') : t('meetings.START_MEETING')}
							</DropdownMenuItem>
						)}
						{meeting.link && (
							<>
								<DropdownMenuItem onClick={copyInvitation}>
									<Copy />
									{t('meetings.COPY_INVITATION')}
								</DropdownMenuItem>
								<DropdownMenuItem onClick={copyLink}>
									<Link />
									{t('meetings.COPY_LINK')}
								</DropdownMenuItem>
								<DropdownMenuItem
									onClick={() =>
										downloadMeetingIcs({ ...meeting, title, link: meeting.link as string })
									}
								>
									<CalendarPlus />
									{t('meetings.ADD_TO_CALENDAR')}
								</DropdownMenuItem>
							</>
						)}
						<DropdownMenuSeparator />
						<DropdownMenuItem
							variant="destructive"
							disabled={isCancelling}
							onClick={() => onCancel(meeting)}
						>
							<Trash />
							{t('common.DELETE')}
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</li>
	);
}
