'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AlertDialogConfirmation } from '@/core/components/common/alert-dialog-confirmation';
import { Button } from '@/core/components/duplicated-components/_button';
import { CalendarPlus, ChevronLeft, ChevronRight, Copy, Trash } from '@/core/components/icons';
import { DashboardSection } from '@/core/components/dashboards/kit/dashboard-layout';
import { BlockEmptyMessage, DashboardErrorNotice } from '@/core/components/dashboards/kit/dashboard-states';
import { SKELETON_BAR } from '@/core/components/dashboards/kit/recipes';
import { cn } from '@/core/lib/helpers';
import {
	dayAfter,
	meetingPathOfInput,
	meetingsOfDay,
	scheduledMeetingStateOf,
	startOfDay,
	type ScheduledMeeting
} from '@/core/lib/utils/meetings';
import { copyMeetingText, downloadMeetingIcs, meetingTimesOf } from './meeting-invitation';

const DAY = 24 * 60 * 60 * 1000;

/** The days next to today that the agenda names in words. */
const RELATIVE_DAY_KEYS = new Map([
	[-1, 'meetings.YESTERDAY'],
	[0, 'meetings.TODAY'],
	[1, 'meetings.TOMORROW']
] as const);

/** "Today, October 30, 2026", or "Saturday, October 31, 2026" for a day further away, in the reader's language. */
function dayLabelOf(day: Date, today: Date, locale: string, t: ReturnType<typeof useTranslations>): string {
	// Rounded: a day that changes the clock is 23 or 25 hours long
	const daysAway = Math.round((day.getTime() - today.getTime()) / DAY);
	const relativeKey = RELATIVE_DAY_KEYS.get(daysAway as -1 | 0 | 1);
	if (!relativeKey) {
		return new Intl.DateTimeFormat(locale, { dateStyle: 'full' }).format(day);
	}
	const date = new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(day);
	return t('meetings.DAY_LABEL', { day: t(relativeKey), date });
}

interface MeetingCardProps {
	meeting: ScheduledMeeting;
	now: Date;
	isJitsi: boolean;
	isCancelling: boolean;
	onCancel: (meeting: ScheduledMeeting) => void;
}

function MeetingCard({ meeting, now, isJitsi, isCancelling, onCancel }: Readonly<MeetingCardProps>) {
	const t = useTranslations();
	const locale = useLocale();
	const router = useRouter();
	const state = scheduledMeetingStateOf(meeting, now);
	const title = meeting.title || t('meetings.UNTITLED');
	const path = meeting.link ? meetingPathOfInput(meeting.link, isJitsi) : null;
	const isOpen = state === 'live' || state === 'soon';

	const copyLink = async () => {
		if (!meeting.link) return;
		const isCopied = await copyMeetingText(meeting.link);
		if (isCopied) toast.success(t('meetings.LINK_COPIED'));
		else toast.info(t('meetings.COPY_LINK'), { description: meeting.link, duration: 10000 });
	};

	return (
		<li
			data-testid="scheduled-meeting"
			className={cn('flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3', state === 'ended' && 'opacity-60')}
		>
			<span
				aria-hidden="true"
				className={cn('h-10 w-1 shrink-0 rounded-full', state === 'live' ? 'bg-emerald-500' : 'bg-primary/40')}
			/>
			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				<span className="truncate text-sm font-medium text-foreground">{title}</span>
				<span className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
					{state === 'live' && (
						<span className="font-medium text-emerald-600 dark:text-emerald-400">{t('meetings.LIVE')}</span>
					)}
					{state === 'soon' && (
						<span className="font-medium text-primary-ink">{t('meetings.STARTS_SOON')}</span>
					)}
					{state === 'ended' && <span>{t('meetings.ENDED')}</span>}
					<span className="tabular-nums">{meetingTimesOf(meeting, locale)}</span>
				</span>
			</div>
			<div className="flex items-center gap-1">
				{meeting.link && (
					<>
						<Button
							type="button"
							variant="ghost"
							size="icon-sm"
							aria-label={t('meetings.COPY_LINK_OF', { title })}
							title={t('meetings.COPY_LINK')}
							onClick={copyLink}
						>
							<Copy className="size-4" />
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="icon-sm"
							aria-label={t('meetings.ADD_TO_CALENDAR_OF', { title })}
							title={t('meetings.ADD_TO_CALENDAR')}
							onClick={() => downloadMeetingIcs({ ...meeting, title, link: meeting.link as string })}
						>
							<CalendarPlus className="size-4" />
						</Button>
					</>
				)}
				{state !== 'ended' && (
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						aria-label={t('meetings.CANCEL_MEETING_OF', { title })}
						title={t('meetings.CANCEL_MEETING')}
						disabled={isCancelling}
						onClick={() => onCancel(meeting)}
					>
						<Trash className="size-4" />
					</Button>
				)}
				{path && state !== 'ended' && (
					<Button
						type="button"
						size="sm"
						variant={isOpen ? 'default' : 'outline'}
						onClick={() => router.push(path)}
						aria-label={t('meetings.JOIN_MEETING_OF', { title })}
					>
						{t('meetings.JOIN')}
					</Button>
				)}
			</div>
		</li>
	);
}

interface MeetingAgendaProps {
	meetings: ScheduledMeeting[];
	isLoading: boolean;
	isError: boolean;
	onRetry: () => void;
	isJitsi: boolean;
	now: Date;
	cancellingId: string | undefined;
	onCancelMeeting: (appointmentId: string) => Promise<unknown>;
}

/**
 * One day of the meetings the person scheduled, today first, with the way to the day before, back to today and to
 * the day after; on each meeting: join, copy the link, add to a calendar, cancel.
 */
export function MeetingAgenda({
	meetings,
	isLoading,
	isError,
	onRetry,
	isJitsi,
	now,
	cancellingId,
	onCancelMeeting
}: Readonly<MeetingAgendaProps>) {
	const t = useTranslations();
	const locale = useLocale();
	const [meetingToCancel, setMeetingToCancel] = useState<ScheduledMeeting | null>(null);
	const today = startOfDay(now);
	const [day, setDay] = useState(today);
	const isToday = day.getTime() === today.getTime();
	const dayMeetings = meetingsOfDay(meetings, day);

	const confirmCancel = async () => {
		if (!meetingToCancel) return;
		try {
			await onCancelMeeting(meetingToCancel.id);
			toast.success(t('meetings.CANCELLED'));
		} catch {
			toast.error(t('meetings.CANCEL_FAILED'));
		} finally {
			setMeetingToCancel(null);
		}
	};

	return (
		<DashboardSection
			title={dayLabelOf(day, today, locale, t)}
			meta={t('meetings.AGENDA_HINT')}
			ariaLabel={t('meetings.AGENDA')}
			actions={
				<div className="flex items-center gap-0.5">
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						aria-label={t('meetings.PREVIOUS_DAY')}
						title={t('meetings.PREVIOUS_DAY')}
						onClick={() => setDay(dayAfter(day, -1))}
					>
						<ChevronLeft className="size-4" />
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						aria-current={isToday ? 'date' : undefined}
						onClick={() => setDay(today)}
					>
						{t('meetings.TODAY')}
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						aria-label={t('meetings.NEXT_DAY')}
						title={t('meetings.NEXT_DAY')}
						onClick={() => setDay(dayAfter(day, 1))}
					>
						<ChevronRight className="size-4" />
					</Button>
				</div>
			}
		>
			{isError && <DashboardErrorNotice onRetry={onRetry} />}
			{!isError && isLoading && (
				<div className="flex flex-col gap-3 p-4" aria-hidden="true">
					<span className={cn(SKELETON_BAR, 'h-3 w-40')} />
					<span className={cn(SKELETON_BAR, 'h-3 w-64')} />
				</div>
			)}
			{!isError && !isLoading && (
				<div className="flex flex-col gap-2 p-4" data-testid="meetings-agenda-day">
					{dayMeetings.length === 0 && (
						<BlockEmptyMessage
							title={isToday ? t('meetings.NO_MEETINGS_TODAY') : t('meetings.NO_MEETINGS_DAY')}
							message={t('meetings.NO_MEETINGS_TODAY_HINT')}
						/>
					)}
					{dayMeetings.length > 0 && (
						<ul className="divide-y divide-border overflow-hidden rounded-lg hairline-ring ring-border">
							{dayMeetings.map((meeting) => (
								<MeetingCard
									key={meeting.id}
									meeting={meeting}
									now={now}
									isJitsi={isJitsi}
									isCancelling={cancellingId === meeting.id}
									onCancel={setMeetingToCancel}
								/>
							))}
						</ul>
					)}
				</div>
			)}
			<AlertDialogConfirmation
				isOpen={meetingToCancel !== null}
				onOpenChange={(isOpen) => {
					if (!isOpen) setMeetingToCancel(null);
				}}
				title={t('meetings.CANCEL_CONFIRM_TITLE')}
				description={t('meetings.CANCEL_CONFIRM_DESCRIPTION')}
				confirmText={t('meetings.CANCEL_MEETING')}
				cancelText={t('meetings.KEEP_MEETING')}
				onConfirm={confirmCancel}
				onCancel={() => setMeetingToCancel(null)}
				loading={Boolean(cancellingId)}
			/>
		</DashboardSection>
	);
}
