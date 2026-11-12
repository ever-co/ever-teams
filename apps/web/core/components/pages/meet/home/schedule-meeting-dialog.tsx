'use client';

import { useState, type FormEvent } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { AppDialog, AppDialogHeader, APP_DIALOG_BODY, APP_DIALOG_FOOTER } from '@/core/components/common/app-dialog';
import { Input, controlRecipe } from '@/core/components/common/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/core/components/common/select';
import { Button } from '@/core/components/duplicated-components/_button';
import { CalendarPlus, Copy } from '@/core/components/icons';
import { useDefaultMeetingZone } from '@/core/hooks/meetings/use-default-meeting-zone';
import { useMeetingInvitees } from '@/core/hooks/meetings/use-meeting-invitees';
import { cn } from '@/core/lib/helpers';
import {
	meetingLinkWithTitle,
	participantsWithText,
	type RescheduleMeetingDraft,
	type ScheduledMeeting,
	type ScheduleMeetingDraft
} from '@/core/lib/utils/meetings';
import { detectTimeZone, utcOffsetOf } from '@/core/lib/utils/settings-time-zone';
import { instantOf, nextSlotIn, slotOnDay, wallClockOf } from '@/core/lib/utils/zoned-time';
import { copyMeetingInvitation, downloadMeetingIcs, meetingWhenOf } from './meeting-invitation';
import { ParticipantsField } from './participants-field';
import { TimeZoneField } from './time-zone-field';

const DURATIONS = [15, 30, 45, 60, 90, 120];
const DEFAULT_DURATION = 30;
const MINUTE = 60_000;

/** The durations offered: the usual ones, and a meeting's own when it lasts another time. */
function durationsWith(minutes: number): number[] {
	if (DURATIONS.includes(minutes)) {
		return DURATIONS;
	}
	return [...DURATIONS, minutes].sort((first, second) => first - second);
}

interface ScheduleMeetingDialogProps {
	open: boolean;
	onClose: () => void;
	/** The day picked in the agenda, when Schedule opens from it. */
	initialDay?: Date;
	/** The meeting to edit: its title and its time change, the rest stays. Without it, a new meeting is planned. */
	meeting?: ScheduledMeeting | null;
	/** The full link of a new room for this meeting, titled. */
	linkFor: (title: string) => string;
	onSchedule: (draft: ScheduleMeetingDraft) => Promise<unknown>;
	onReschedule: (appointmentId: string, draft: RescheduleMeetingDraft) => Promise<unknown>;
	/** A schedule or a reschedule is on its way. */
	isScheduling: boolean;
}

/**
 * Plans a meeting for later. It is kept in the person's agenda; Ever Teams sends no invitation, so the confirmation
 * gives the invitation to copy and a calendar file to send from one's own calendar. Given a meeting, it moves or
 * renames that meeting instead.
 */
export function ScheduleMeetingDialog({
	open,
	onClose,
	initialDay,
	meeting,
	linkFor,
	onSchedule,
	onReschedule,
	isScheduling
}: Readonly<ScheduleMeetingDialogProps>) {
	const t = useTranslations();
	const locale = useLocale();
	const defaultZone = useDefaultMeetingZone();
	const [zone, setZone] = useState(defaultZone);
	// The date and time fields read on the clocks of the zone; changing the zone keeps them as typed
	const [initialClock] = useState(() =>
		meeting ? wallClockOf(meeting.start, defaultZone) : slotOnDay(initialDay, defaultZone)
	);
	const [title, setTitle] = useState(() => meeting?.title ?? '');
	const [date, setDate] = useState(initialClock.date);
	const [time, setTime] = useState(initialClock.time);
	const [duration, setDuration] = useState(() =>
		meeting ? Math.max(1, Math.round((meeting.end.getTime() - meeting.start.getTime()) / MINUTE)) : DEFAULT_DURATION
	);
	const [description, setDescription] = useState('');
	const invitees = useMeetingInvitees();
	const [participants, setParticipants] = useState<string[]>([]);
	const [participantDraft, setParticipantDraft] = useState('');
	const [isParticipantInvalid, setIsParticipantInvalid] = useState(false);
	const [problem, setProblem] = useState<'title' | 'past' | null>(null);
	const [scheduled, setScheduled] = useState<(ScheduledMeeting & { link: string }) | null>(null);
	const [invitedCount, setInvitedCount] = useState(0);
	const minutesFormat = new Intl.NumberFormat(locale, { style: 'unit', unit: 'minute', unitDisplay: 'short' });
	const typedStart = instantOf(date, time, zone);
	const browserZone = detectTimeZone();
	// Typed in another zone than the browser's: the time where the person is, to be sure of it
	const isElsewhere =
		!Number.isNaN(typedStart.getTime()) && utcOffsetOf(zone, typedStart) !== utcOffsetOf(browserZone, typedStart);

	const close = () => {
		const slot = nextSlotIn(defaultZone);
		setTitle('');
		setZone(defaultZone);
		setDate(slot.date);
		setTime(slot.time);
		setDuration(DEFAULT_DURATION);
		setDescription('');
		setParticipants([]);
		setParticipantDraft('');
		setIsParticipantInvalid(false);
		setProblem(null);
		setScheduled(null);
		onClose();
	};

	/** Adds the addresses typed in the participants; null when part of it is no address, left there to fix. */
	const commitParticipantDraft = (): string[] | null => {
		if (!participantDraft.trim()) {
			return participants;
		}
		const { emails, rejected } = participantsWithText(participants, participantDraft);
		setParticipants(emails);
		setParticipantDraft(rejected.join(', '));
		setIsParticipantInvalid(rejected.length > 0);
		return rejected.length > 0 ? null : emails;
	};

	const toggleParticipant = (email: string) =>
		setParticipants((current) =>
			current.includes(email) ? current.filter((address) => address !== email) : [...current, email]
		);

	const reschedule = async (edited: ScheduledMeeting, start: Date) => {
		const newTitle = title.trim();
		const link = edited.link ? meetingLinkWithTitle(edited.link, newTitle) : null;
		try {
			await onReschedule(edited.id, { title: newTitle, start, durationMinutes: duration, link });
			toast.success(t('meetings.RESCHEDULED'));
			close();
		} catch {
			toast.error(t('meetings.RESCHEDULE_FAILED'));
		}
	};

	const schedule = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!title.trim()) {
			setProblem('title');
			return;
		}
		// A meeting that already began may keep its start, to the second: only a new start must lie ahead
		const meetingClock = meeting ? wallClockOf(meeting.start, zone) : null;
		const keptStart = meeting && meetingClock?.date === date && meetingClock.time === time;
		const start = keptStart ? meeting.start : typedStart;
		if (Number.isNaN(start.getTime()) || (start.getTime() < Date.now() && !keptStart)) {
			setProblem('past');
			return;
		}
		if (meeting) {
			await reschedule(meeting, start);
			return;
		}
		const participantEmails = commitParticipantDraft();
		if (!participantEmails) {
			return;
		}
		const link = linkFor(title.trim());
		try {
			const draft = { title, description, start, durationMinutes: duration, link, participantEmails };
			const appointment = (await onSchedule(draft)) as { id?: string };
			setScheduled({
				id: appointment?.id ?? link,
				title: title.trim(),
				description: description.trim() || null,
				start,
				end: new Date(start.getTime() + duration * 60_000),
				link
			});
			setInvitedCount(participantEmails.length);
			toast.success(t('meetings.SCHEDULED'));
		} catch {
			toast.error(t('meetings.SCHEDULE_FAILED'));
		}
	};

	const copyInvitation = async () => {
		if (scheduled) await copyMeetingInvitation(scheduled, locale, t);
	};

	return (
		<AppDialog open={open} onClose={close} width="md" keepOpenOnOutsideClick>
			<AppDialogHeader
				title={meeting ? t('meetings.EDIT_TITLE') : t('meetings.SCHEDULE_TITLE')}
				onClose={close}
			/>
			{scheduled && (
				<>
					<div className={`${APP_DIALOG_BODY} flex flex-col gap-3 pb-4`} data-testid="meeting-scheduled">
						<div className="flex flex-col gap-0.5">
							<p className="text-base font-medium text-foreground">{scheduled.title}</p>
							<p className="text-sm text-muted-foreground">{meetingWhenOf(scheduled, locale)}</p>
						</div>
						<p className="text-sm text-muted-foreground">
							{invitedCount > 0 ? t('meetings.INVITE_HINT_PARTICIPANTS') : t('meetings.INVITE_HINT')}
						</p>
						<div className="flex flex-wrap gap-2">
							<Button type="button" variant="outline" onClick={copyInvitation}>
								<Copy className="size-4" aria-hidden="true" />
								{t('meetings.COPY_INVITATION')}
							</Button>
							<Button type="button" variant="outline" onClick={() => downloadMeetingIcs(scheduled)}>
								<CalendarPlus className="size-4" aria-hidden="true" />
								{t('meetings.ADD_TO_CALENDAR')}
							</Button>
						</div>
					</div>
					<div className={`${APP_DIALOG_FOOTER} justify-end`}>
						<Button type="button" onClick={close}>
							{t('meetings.DONE')}
						</Button>
					</div>
				</>
			)}
			{!scheduled && (
				<form onSubmit={schedule} noValidate className="contents">
					<div className={`${APP_DIALOG_BODY} grid gap-3 pb-4 sm:grid-cols-2`}>
						<div className="flex flex-col gap-1.5 sm:col-span-2">
							<label htmlFor="meeting-title" className="text-sm font-medium text-foreground">
								{t('meetings.FIELD_TITLE')}
							</label>
							<Input
								id="meeting-title"
								data-initial-focus
								value={title}
								maxLength={120}
								placeholder={t('meetings.FIELD_TITLE_PLACEHOLDER')}
								aria-invalid={problem === 'title' || undefined}
								onChange={(event) => {
									setTitle(event.target.value);
									setProblem(null);
								}}
							/>
						</div>
						<div className="flex flex-col gap-1.5">
							<label htmlFor="meeting-date" className="text-sm font-medium text-foreground">
								{t('meetings.FIELD_DATE')}
							</label>
							<Input
								id="meeting-date"
								type="date"
								value={date}
								min={wallClockOf(new Date(), zone).date}
								aria-invalid={problem === 'past' || undefined}
								onChange={(event) => {
									setDate(event.target.value);
									setProblem(null);
								}}
							/>
						</div>
						<div className="flex flex-col gap-1.5">
							<label htmlFor="meeting-time" className="text-sm font-medium text-foreground">
								{t('meetings.FIELD_TIME')}
							</label>
							<Input
								id="meeting-time"
								type="time"
								value={time}
								aria-invalid={problem === 'past' || undefined}
								onChange={(event) => {
									setTime(event.target.value);
									setProblem(null);
								}}
							/>
						</div>
						<div className="flex flex-col gap-1.5 sm:col-span-2">
							<span className="text-sm font-medium text-foreground">{t('meetings.FIELD_DURATION')}</span>
							<Select
								value={String(duration)}
								onValueChange={(value) => setDuration(Number(value) || DEFAULT_DURATION)}
							>
								<SelectTrigger aria-label={t('meetings.FIELD_DURATION')} className="h-9 w-full">
									<SelectValue>{minutesFormat.format(duration)}</SelectValue>
								</SelectTrigger>
								<SelectContent position="popper" sideOffset={4}>
									{durationsWith(duration).map((minutes) => (
										<SelectItem key={minutes} value={String(minutes)}>
											{minutesFormat.format(minutes)}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<TimeZoneField
							zone={zone}
							at={typedStart}
							onChange={(picked) => {
								setZone(picked);
								setProblem(null);
							}}
						/>
						{isElsewhere && (
							<p
								className="-mt-1.5 text-xs text-muted-foreground sm:col-span-2"
								data-testid="meeting-local-time"
							>
								{t('meetings.LOCAL_TIME_HINT', {
									time: new Intl.DateTimeFormat(locale, {
										dateStyle: 'medium',
										timeStyle: 'short'
									}).format(typedStart)
								})}
							</p>
						)}
						{!meeting && (
							<ParticipantsField
								invitees={invitees}
								emails={participants}
								draft={participantDraft}
								onDraftChange={(draft) => {
									setParticipantDraft(draft);
									setIsParticipantInvalid(false);
								}}
								onCommitDraft={commitParticipantDraft}
								onToggle={toggleParticipant}
								onRemove={toggleParticipant}
								isInvalid={isParticipantInvalid}
							/>
						)}
						{!meeting && (
							<div className="flex flex-col gap-1.5 sm:col-span-2">
								<label htmlFor="meeting-description" className="text-sm font-medium text-foreground">
									{t('meetings.FIELD_DESCRIPTION')}
								</label>
								<textarea
									id="meeting-description"
									rows={3}
									value={description}
									maxLength={2000}
									placeholder={t('meetings.FIELD_DESCRIPTION_PLACEHOLDER')}
									onChange={(event) => setDescription(event.target.value)}
									className={cn(controlRecipe, 'min-h-20 resize-y py-2')}
								/>
							</div>
						)}
						{problem && (
							<p role="alert" className="text-xs text-destructive-ink sm:col-span-2">
								{problem === 'title'
									? t('meetings.SCHEDULE_TITLE_MISSING')
									: t('meetings.SCHEDULE_PAST')}
							</p>
						)}
					</div>
					<div className={`${APP_DIALOG_FOOTER} justify-end`}>
						<Button type="button" variant="ghost" onClick={close}>
							{t('common.CANCEL')}
						</Button>
						<Button type="submit" disabled={isScheduling} aria-busy={isScheduling || undefined}>
							{meeting ? t('common.SAVE_CHANGES') : t('meetings.SCHEDULE')}
						</Button>
					</div>
				</form>
			)}
		</AppDialog>
	);
}
