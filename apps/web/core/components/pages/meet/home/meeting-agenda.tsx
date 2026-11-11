'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AlertDialogConfirmation } from '@/core/components/common/alert-dialog-confirmation';
import { Button } from '@/core/components/duplicated-components/_button';
import { CalendarPlus, Copy, Trash } from '@/core/components/icons';
import { DashboardSection } from '@/core/components/dashboards/kit/dashboard-layout';
import { BlockEmptyMessage, DashboardErrorNotice } from '@/core/components/dashboards/kit/dashboard-states';
import { SKELETON_BAR } from '@/core/components/dashboards/kit/recipes';
import { cn } from '@/core/lib/helpers';
import {
	agendaOf,
	meetingPathOfInput,
	scheduledMeetingStateOf,
	type AgendaDay,
	type ScheduledMeeting
} from '@/core/lib/utils/meetings';
import { copyMeetingText, downloadMeetingIcs, meetingTimesOf } from './meeting-invitation';

const DAY = 24 * 60 * 60 * 1000;

function dayLabelOf(agendaDay: AgendaDay, today: Date, locale: string, t: ReturnType<typeof useTranslations>) {
	const daysAhead = Math.round((agendaDay.day.getTime() - today.getTime()) / DAY);
	if (daysAhead === 0) return t('meetings.TODAY');
	if (daysAhead === 1) return t('meetings.TOMORROW');
	return new Intl.DateTimeFormat(locale, { weekday: 'long', month: 'long', day: 'numeric' }).format(agendaDay.day);
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

/** Today and the coming days, as scheduled by the person: join, copy the link, add to a calendar, cancel. */
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
	const today = new Date(now);
	today.setHours(0, 0, 0, 0);
	const days = agendaOf(meetings, now);

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
			title={t('meetings.AGENDA')}
			meta={t('meetings.AGENDA_HINT')}
			ariaLabel={t('meetings.AGENDA')}
		>
			{isError && <DashboardErrorNotice onRetry={onRetry} />}
			{!isError && isLoading && (
				<div className="flex flex-col gap-3 p-4" aria-hidden="true">
					<span className={cn(SKELETON_BAR, 'h-3 w-40')} />
					<span className={cn(SKELETON_BAR, 'h-3 w-64')} />
				</div>
			)}
			{!isError && !isLoading && (
				<div className="flex flex-col gap-4 p-4">
					{days.map((agendaDay) => (
						<section key={agendaDay.day.getTime()} className="flex flex-col gap-2">
							<h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
								{dayLabelOf(agendaDay, today, locale, t)}
							</h3>
							{agendaDay.meetings.length === 0 && (
								<BlockEmptyMessage
									title={t('meetings.NO_MEETINGS_TODAY')}
									message={t('meetings.NO_MEETINGS_TODAY_HINT')}
								/>
							)}
							{agendaDay.meetings.length > 0 && (
								<ul className="divide-y divide-border overflow-hidden rounded-lg hairline-ring ring-border">
									{agendaDay.meetings.map((meeting) => (
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
						</section>
					))}
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
