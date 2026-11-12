'use client';

import { useState, type FormEvent } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { AppDialog, AppDialogHeader, APP_DIALOG_BODY, APP_DIALOG_FOOTER } from '@/core/components/common/app-dialog';
import { Input, controlRecipe } from '@/core/components/common/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/core/components/common/select';
import { Button } from '@/core/components/duplicated-components/_button';
import { CalendarPlus, Copy } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import { startOfDay, type ScheduledMeeting, type ScheduleMeetingDraft } from '@/core/lib/utils/meetings';
import { copyMeetingInvitation, downloadMeetingIcs, meetingWhenOf } from './meeting-invitation';

const DURATIONS = [15, 30, 45, 60, 90, 120];
const DEFAULT_DURATION = 30;
const SLOT_MINUTES = 30;

function twoDigits(value: number): string {
	return String(value).padStart(2, '0');
}

/** The next half hour: the time a meeting planned now most often starts. */
function nextSlotOf(now: Date): Date {
	const slot = new Date(now);
	slot.setSeconds(0, 0);
	slot.setMinutes(Math.ceil((slot.getMinutes() + 1) / SLOT_MINUTES) * SLOT_MINUTES);
	return slot;
}

/** When a new meeting is proposed: the next half hour, at that time of day on a later day picked in the agenda. */
function proposedStartOf(day: Date | undefined): Date {
	const slot = nextSlotOf(new Date());
	if (!day || startOfDay(day).getTime() <= startOfDay(slot).getTime()) {
		return slot;
	}
	const start = startOfDay(day);
	start.setHours(slot.getHours(), slot.getMinutes());
	return start;
}

function dateInputOf(date: Date): string {
	return `${date.getFullYear()}-${twoDigits(date.getMonth() + 1)}-${twoDigits(date.getDate())}`;
}

function timeInputOf(date: Date): string {
	return `${twoDigits(date.getHours())}:${twoDigits(date.getMinutes())}`;
}

interface ScheduleMeetingDialogProps {
	open: boolean;
	onClose: () => void;
	/** The day picked in the agenda, when Schedule opens from it. */
	initialDay?: Date;
	/** The full link of a new room for this meeting, titled. */
	linkFor: (title: string) => string;
	onSchedule: (draft: ScheduleMeetingDraft) => Promise<unknown>;
	isScheduling: boolean;
}

/**
 * Plans a meeting for later. It is kept in the person's agenda; Ever Teams sends no invitation, so the confirmation
 * gives the invitation to copy and a calendar file to send from one's own calendar.
 */
export function ScheduleMeetingDialog({
	open,
	onClose,
	initialDay,
	linkFor,
	onSchedule,
	isScheduling
}: Readonly<ScheduleMeetingDialogProps>) {
	const t = useTranslations();
	const locale = useLocale();
	const [title, setTitle] = useState('');
	const [date, setDate] = useState(() => dateInputOf(proposedStartOf(initialDay)));
	const [time, setTime] = useState(() => timeInputOf(proposedStartOf(initialDay)));
	const [duration, setDuration] = useState(DEFAULT_DURATION);
	const [description, setDescription] = useState('');
	const [problem, setProblem] = useState<'title' | 'past' | null>(null);
	const [scheduled, setScheduled] = useState<(ScheduledMeeting & { link: string }) | null>(null);
	const minutesFormat = new Intl.NumberFormat(locale, { style: 'unit', unit: 'minute', unitDisplay: 'short' });

	const close = () => {
		const slot = nextSlotOf(new Date());
		setTitle('');
		setDate(dateInputOf(slot));
		setTime(timeInputOf(slot));
		setDuration(DEFAULT_DURATION);
		setDescription('');
		setProblem(null);
		setScheduled(null);
		onClose();
	};

	const schedule = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const start = new Date(`${date}T${time}`);
		if (!title.trim()) {
			setProblem('title');
			return;
		}
		if (Number.isNaN(start.getTime()) || start.getTime() < Date.now()) {
			setProblem('past');
			return;
		}
		const link = linkFor(title.trim());
		try {
			const appointment = (await onSchedule({ title, description, start, durationMinutes: duration, link })) as {
				id?: string;
			};
			setScheduled({
				id: appointment?.id ?? link,
				title: title.trim(),
				description: description.trim() || null,
				start,
				end: new Date(start.getTime() + duration * 60_000),
				link
			});
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
			<AppDialogHeader title={t('meetings.SCHEDULE_TITLE')} onClose={close} />
			{scheduled && (
				<>
					<div className={`${APP_DIALOG_BODY} flex flex-col gap-3 pb-4`} data-testid="meeting-scheduled">
						<div className="flex flex-col gap-0.5">
							<p className="text-base font-medium text-foreground">{scheduled.title}</p>
							<p className="text-sm text-muted-foreground">{meetingWhenOf(scheduled, locale)}</p>
						</div>
						<p className="text-sm text-muted-foreground">{t('meetings.INVITE_HINT')}</p>
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
								min={dateInputOf(new Date())}
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
									{DURATIONS.map((minutes) => (
										<SelectItem key={minutes} value={String(minutes)}>
											{minutesFormat.format(minutes)}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
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
							{t('meetings.SCHEDULE')}
						</Button>
					</div>
				</form>
			)}
		</AppDialog>
	);
}
