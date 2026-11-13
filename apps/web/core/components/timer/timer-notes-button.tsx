'use client';

import { type ChangeEvent, useCallback, useId } from 'react';
import { useTranslations } from 'next-intl';

import { controlRecipe } from '@/core/components/common/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/core/components/common/popover';
import { Button } from '@/core/components/duplicated-components/_button';
import { Compose } from '@/core/components/icons';
import { useTimerNotes } from '@/core/hooks/timer/use-timer-notes';
import { cn } from '@/core/lib/helpers';
import { TIMER_NOTES_MAX_LENGTH, normalizedTimerNotes } from '@/core/lib/utils/timer/timer-notes';

const NOTES_FIELD_CLASS_NAME = cn(controlRecipe, 'field-sizing-content max-h-[6lh] min-h-16 resize-none p-3');

const NOTES_POPOVER_CLASS_NAME = 'flex w-72 max-w-[calc(100vw-2rem)] flex-col gap-2 p-3';

const HAS_NOTES_MARK_CLASS_NAME = 'absolute right-1 top-1 size-1.5 rounded-full bg-primary';

function triggerLabelKeyOf(hasNotes: boolean) {
	if (hasNotes) {
		return 'timer.notes.EDIT' as const;
	}
	return 'timer.notes.ADD' as const;
}

function hintKeyOf(isRunning: boolean, isReadOnly: boolean) {
	if (isReadOnly) {
		return 'timer.notes.HINT_OTHER_TEAM' as const;
	}
	if (isRunning) {
		return 'timer.notes.HINT_RUNNING' as const;
	}
	return 'timer.notes.HINT_BEFORE_START' as const;
}

/**
 * The notes of the timer's entry, behind one button so the timer keeps its size: optional, typed before a start or
 * while the timer runs. Every timer on screen shares them.
 */
export function TimerNotesButton({ className }: Readonly<{ className?: string }>) {
	const t = useTranslations();
	const fieldId = useId();
	const hintId = useId();
	const { text, setText, isRunning, isReadOnly } = useTimerNotes();
	const hasNotes = normalizedTimerNotes(text) !== '';
	const triggerLabel = t(triggerLabelKeyOf(hasNotes));
	const hint = t(hintKeyOf(isRunning, isReadOnly));

	const changeText = useCallback(
		(event: ChangeEvent<HTMLTextAreaElement>) => {
			setText(event.target.value);
		},
		[setText]
	);

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					aria-label={triggerLabel}
					title={triggerLabel}
					className={cn('relative text-muted-foreground', className)}
				>
					<Compose aria-hidden="true" />
					{hasNotes && <span aria-hidden="true" className={HAS_NOTES_MARK_CLASS_NAME} />}
				</Button>
			</PopoverTrigger>
			<PopoverContent align="end" collisionPadding={16} className={NOTES_POPOVER_CLASS_NAME}>
				<label htmlFor={fieldId} className="text-xs font-medium text-foreground">
					{t('timer.notes.LABEL')}
				</label>
				<textarea
					id={fieldId}
					value={text}
					onChange={changeText}
					readOnly={isReadOnly}
					maxLength={TIMER_NOTES_MAX_LENGTH}
					rows={3}
					placeholder={t('timer.notes.PLACEHOLDER')}
					aria-describedby={hintId}
					className={NOTES_FIELD_CLASS_NAME}
				/>
				<p id={hintId} className="text-xs text-muted-foreground">
					{hint}
				</p>
			</PopoverContent>
		</Popover>
	);
}
