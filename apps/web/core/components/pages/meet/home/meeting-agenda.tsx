'use client';

import { useCallback, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { AlertDialogConfirmation } from '@/core/components/common/alert-dialog-confirmation';
import { Calendar } from '@/core/components/common/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/core/components/common/popover';
import { Button } from '@/core/components/duplicated-components/_button';
import { ChevronDown, ChevronLeft, ChevronRight, Plus } from '@/core/components/icons';
import { DashboardSection } from '@/core/components/dashboards/kit/dashboard-layout';
import { BlockEmptyMessage, DashboardErrorNotice } from '@/core/components/dashboards/kit/dashboard-states';
import { SKELETON_BAR } from '@/core/components/dashboards/kit/recipes';
import { cn } from '@/core/lib/helpers';
import { dayAfter, meetingDaysOf, meetingsOfDay, startOfDay, type ScheduledMeeting } from '@/core/lib/utils/meetings';
import { MeetingCard } from './meeting-card';

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

/** A dot under the days that hold a meeting. */
const MEETING_DAY_MARK =
	"after:absolute after:bottom-1 after:left-1/2 after:size-1 after:-translate-x-1/2 after:rounded-full after:bg-primary after:content-[''] aria-selected:after:bg-primary-foreground";

interface AgendaDayPickerProps {
	day: Date;
	label: string;
	meetings: readonly ScheduledMeeting[];
	onPick: (day: Date) => void;
}

/** The agenda's day, as a button that opens a month to pick another day from. */
function AgendaDayPicker({ day, label, meetings, onPick }: Readonly<AgendaDayPickerProps>) {
	const [isOpen, setIsOpen] = useState(false);
	const meetingDays = useMemo(() => meetingDaysOf(meetings), [meetings]);
	const hasMeeting = useCallback((date: Date) => meetingDays.has(startOfDay(date).getTime()), [meetingDays]);

	const pick = (picked: Date | undefined) => {
		// Picking the day shown again unselects it in the calendar: the agenda stays on it
		if (picked) onPick(startOfDay(picked));
		setIsOpen(false);
	};

	return (
		<Popover open={isOpen} onOpenChange={setIsOpen}>
			<PopoverTrigger
				data-testid="meetings-agenda-day-picker"
				className="-mx-1.5 flex min-w-0 cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-0.5 text-left outline-none transition-colors hover:bg-foreground/[0.05] focus-visible:ring-[3px] focus-visible:ring-ring/25"
			>
				<span className="truncate">{label}</span>
				<ChevronDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
			</PopoverTrigger>
			<PopoverContent align="start" className="w-auto p-0">
				<Calendar
					mode="single"
					selected={day}
					defaultMonth={day}
					onSelect={pick}
					initialFocus
					modifiers={{ hasMeeting }}
					modifiersClassNames={{ hasMeeting: MEETING_DAY_MARK }}
				/>
			</PopoverContent>
		</Popover>
	);
}

interface MeetingAgendaProps {
	meetings: ScheduledMeeting[];
	isLoading: boolean;
	isError: boolean;
	onRetry: () => void;
	isJitsi: boolean;
	now: Date;
	/** Who hosts the meetings listed: the person, whose own meetings these are. */
	hostName: string;
	cancellingId: string | undefined;
	onCancelMeeting: (appointmentId: string) => Promise<unknown>;
	/** Opens the meeting to change its title or its time. */
	onEditMeeting: (meeting: ScheduledMeeting) => void;
	/** Opens Schedule on a day of the agenda. */
	onScheduleOn: (day: Date) => void;
}

/**
 * One day of the meetings the person scheduled, today first, with the way to the day before, back to today and to
 * the day after, and to schedule a meeting that day; on each meeting: join, copy, add to a calendar, edit, cancel.
 */
export function MeetingAgenda({
	meetings,
	isLoading,
	isError,
	onRetry,
	isJitsi,
	now,
	hostName,
	cancellingId,
	onCancelMeeting,
	onEditMeeting,
	onScheduleOn
}: Readonly<MeetingAgendaProps>) {
	const t = useTranslations();
	const locale = useLocale();
	const [meetingToCancel, setMeetingToCancel] = useState<ScheduledMeeting | null>(null);
	const today = startOfDay(now);
	const [day, setDay] = useState(today);
	const isToday = day.getTime() === today.getTime();
	const isPast = day.getTime() < today.getTime();
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
			title={
				<AgendaDayPicker
					day={day}
					label={dayLabelOf(day, today, locale, t)}
					meetings={meetings}
					onPick={setDay}
				/>
			}
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
					<Button
						type="button"
						variant="secondary"
						size="icon-sm"
						className="ml-1.5"
						aria-label={t('meetings.SCHEDULE_ON_DAY')}
						title={t('meetings.SCHEDULE_ON_DAY')}
						disabled={isPast}
						onClick={() => onScheduleOn(day)}
						data-testid="meetings-schedule-on-day"
					>
						<Plus className="size-4" />
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
						<ul className="grid gap-3 sm:grid-cols-2">
							{dayMeetings.map((meeting) => (
								<MeetingCard
									key={meeting.id}
									meeting={meeting}
									now={now}
									isJitsi={isJitsi}
									hostName={hostName}
									isCancelling={cancellingId === meeting.id}
									onEdit={onEditMeeting}
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
