'use client';

import { type FormEvent, type ReactNode, useId, useState } from 'react';
import { useAtomValue } from 'jotai';
import { type DottedLanguageObjectStringPaths, useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/core/components/common/button';
import { DialogFieldLabel } from '@/core/components/common/dialog-field-label';
import { Input } from '@/core/components/common/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/core/components/common/popover';
import { Clock } from '@/core/components/icons';
import { useMyRolePermissionsQuery } from '@/core/hooks/roles/use-my-role-permissions-query';
import { useMoveTimerStart, useTimerStartMoveSupport } from '@/core/hooks/timer/use-timer-start-move';
import { clsxm } from '@/core/lib/utils/clsxm';
import {
	TIMER_START_REASON_MAX_LENGTH,
	type TimerStartMoveAccess,
	isSameStartMinute,
	localStartMoveRefusalKeyOf,
	startFromTimeText,
	timeTextOf,
	timerStartMoveAccessOf,
	timerStartMoveRefusalKeyOf
} from '@/core/lib/utils/timer/timer-start-move';
import { timerStatusState } from '@/core/stores/timer/timer';
import { currentOrganizationState } from '@/core/stores/user/user-organizations';

/** Why the panel shows the start alone, in words. */
const VIEW_MESSAGE_KEYS: Record<Extract<TimerStartMoveAccess, { kind: 'view' }>['why'], string> = {
	tracker: 'timer.startMove.VIEW_TRACKER',
	'not-allowed': 'timer.startMove.VIEW_NOT_ALLOWED',
	unsupported: 'timer.startMove.UNSUPPORTED',
	checking: 'timer.startMove.CHECKING'
};

/**
 * The running time as a button: it opens a small panel with the start of the run, and where the rules let the person
 * change it, a time field that moves the start while the timer keeps running. The button keeps the clock's own box, so
 * nothing in the timer row moves or grows; while no timer runs, the clock is drawn as it is.
 */
export function TimerStartPopover({ children, className }: Readonly<{ children: ReactNode; className?: string }>) {
	const timerStatus = useAtomValue(timerStatusState);
	const runningLog = timerStatus?.running ? timerStatus.lastLog : undefined;
	const runStartValue = runningLog?.startedAt;
	if (!runStartValue) {
		return <>{children}</>;
	}
	return (
		<RunningTimerStartPopover runStartValue={runStartValue} source={runningLog?.source} className={className}>
			{children}
		</RunningTimerStartPopover>
	);
}

interface RunningTimerStartPopoverProps {
	children: ReactNode;
	className?: string;
	runStartValue: Date | string;
	source: string | null | undefined;
}

/** The button and its panel, for a timer that runs. */
function RunningTimerStartPopover({
	children,
	className,
	runStartValue,
	source
}: Readonly<RunningTimerStartPopoverProps>) {
	const t = useTranslations();
	const locale = useLocale();
	const organization = useAtomValue(currentOrganizationState);
	const { myPermissions, isLoaded: permissionsLoaded } = useMyRolePermissionsQuery();
	const [open, setOpen] = useState(false);
	const probedSupport = useTimerStartMoveSupport(open);

	const runStart = new Date(runStartValue);
	const formatTime = (date: Date) => date.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });
	const startLabel = formatTime(runStart);
	const support = permissionsLoaded ? probedSupport : 'checking';
	const access = timerStartMoveAccessOf({
		source,
		support,
		permissions: myPermissions,
		organization
	});

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger
				aria-label={t('timer.startMove.OPEN', { time: startLabel })}
				className={clsxm(
					'cursor-pointer rounded-md text-left tabular-nums outline-none transition-opacity hover:opacity-80 focus-visible:ring-[3px] focus-visible:ring-ring/50',
					className
				)}
			>
				{children}
			</PopoverTrigger>
			<PopoverContent align="start" collisionPadding={16} className="flex flex-col gap-3">
				<div className="flex flex-col gap-1">
					<p className="text-sm font-medium leading-snug">{t('timer.startMove.TITLE')}</p>
					<p className="flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
						<Clock aria-hidden="true" className="size-3.5 shrink-0" />
						{t('timer.startMove.STARTED_AT', { time: startLabel })}
					</p>
				</div>
				{access.kind === 'view' && (
					<p className="text-xs text-muted-foreground" aria-live="polite">
						{t(VIEW_MESSAGE_KEYS[access.why] as DottedLanguageObjectStringPaths)}
					</p>
				)}
				{access.kind === 'edit' && (
					<TimerStartForm
						key={runStart.getTime()}
						runStart={runStart}
						earlierAllowed={access.earlierAllowed}
						reasonRequired={access.reasonRequired}
						formatTime={formatTime}
						onClose={() => setOpen(false)}
					/>
				)}
			</PopoverContent>
		</Popover>
	);
}

interface TimerStartFormProps {
	runStart: Date;
	earlierAllowed: boolean;
	reasonRequired: boolean;
	formatTime: (date: Date) => string;
	onClose: () => void;
}

/** The new start, the reason the organization may ask for, and Save. */
function TimerStartForm({ runStart, earlierAllowed, reasonRequired, formatTime, onClose }: TimerStartFormProps) {
	const t = useTranslations();
	const timeId = useId();
	const reasonId = useId();
	const startText = timeTextOf(runStart);
	const [timeText, setTimeText] = useState(startText);
	const [reason, setReason] = useState('');
	const [errorKey, setErrorKey] = useState<string | null>(null);
	const { moveStart, saving } = useMoveTimerStart();

	const start = startFromTimeText(runStart, timeText);
	const isUnchanged = start === null || isSameStartMinute(start, runStart);
	const saveDisabled = isUnchanged || saving;

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!start || isUnchanged) {
			return;
		}
		const localRefusalKey = localStartMoveRefusalKeyOf({
			start,
			runStart,
			now: new Date(),
			earlierAllowed,
			reasonRequired,
			reason
		});
		if (localRefusalKey) {
			setErrorKey(localRefusalKey);
			return;
		}
		setErrorKey(null);
		try {
			await moveStart({ startedAt: start, reason });
			toast.success(t('timer.startMove.SAVED', { time: formatTime(start) }));
			onClose();
		} catch (error) {
			setErrorKey(timerStartMoveRefusalKeyOf(error));
		}
	};

	const laterOnly = !earlierAllowed;
	const hasError = errorKey !== null;

	return (
		<form className="flex flex-col gap-3" onSubmit={handleSubmit} noValidate>
			<div className="flex flex-col">
				<DialogFieldLabel htmlFor={timeId} isRequired>
					{t('timer.startMove.NEW_START')}
				</DialogFieldLabel>
				<Input
					id={timeId}
					type="time"
					value={timeText}
					min={laterOnly ? startText : undefined}
					onChange={(event) => {
						setTimeText(event.target.value);
						setErrorKey(null);
					}}
					aria-invalid={hasError}
					className="tabular-nums"
					required
				/>
				{laterOnly && <p className="mt-1.5 text-xs text-muted-foreground">{t('timer.startMove.LATER_ONLY')}</p>}
			</div>
			{reasonRequired && (
				<div className="flex flex-col">
					<DialogFieldLabel htmlFor={reasonId} isRequired>
						{t('timer.startMove.REASON')}
					</DialogFieldLabel>
					<Input
						id={reasonId}
						value={reason}
						maxLength={TIMER_START_REASON_MAX_LENGTH}
						placeholder={t('timer.startMove.REASON_PLACEHOLDER')}
						onChange={(event) => {
							setReason(event.target.value);
							setErrorKey(null);
						}}
						required
					/>
				</div>
			)}
			{hasError && (
				<p role="alert" className="text-xs font-medium text-destructive-ink">
					{t(errorKey as DottedLanguageObjectStringPaths)}
				</p>
			)}
			<div className="flex justify-end gap-2">
				<Button type="button" variant="outline" size="default" onClick={onClose}>
					{t('common.CANCEL')}
				</Button>
				<Button type="submit" size="default" loading={saving} disabled={saveDisabled}>
					{saving ? t('timer.startMove.SAVING') : t('common.SAVE')}
				</Button>
			</div>
		</form>
	);
}
