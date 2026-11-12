'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/core/components/duplicated-components/_button';
import { CalendarPlus, Copy, Trash } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import { meetingPathOfInput, scheduledMeetingStateOf, type ScheduledMeeting } from '@/core/lib/utils/meetings';
import { copyMeetingText, downloadMeetingIcs, meetingTimesOf } from './meeting-invitation';

interface MeetingCardProps {
	meeting: ScheduledMeeting;
	now: Date;
	isJitsi: boolean;
	isCancelling: boolean;
	onCancel: (meeting: ScheduledMeeting) => void;
}

export function MeetingCard({ meeting, now, isJitsi, isCancelling, onCancel }: Readonly<MeetingCardProps>) {
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
