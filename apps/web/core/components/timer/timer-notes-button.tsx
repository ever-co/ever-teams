'use client';

import { type ChangeEvent, useCallback, useId, useRef } from 'react';
import { useTranslations } from 'next-intl';

import { controlRecipe } from '@/core/components/common/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/core/components/common/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/core/components/common/tooltip';
import { Button } from '@/core/components/duplicated-components/_button';
import { Compose } from '@/core/components/icons';
import { useTimerNotes } from '@/core/hooks/timer/use-timer-notes';
import { cn } from '@/core/lib/helpers';
import { TIMER_NOTES_MAX_LENGTH, normalizedTimerNotes } from '@/core/lib/utils/timer/timer-notes';
import { TIMER_ENTRY_TOGGLE, TIMER_ENTRY_TOGGLE_GLYPH, TIMER_TOOLTIP_DELAY_MS } from './timer-toggle-recipe';

const NOTES_FIELD_CLASS_NAME = cn(controlRecipe, 'field-sizing-content max-h-[6lh] min-h-16 resize-none p-3');

const NOTES_POPOVER_CLASS_NAME = 'flex w-[max(18rem,var(--anchor-width))] max-w-[calc(100vw-2rem)] flex-col gap-2 p-3';

/** Set on the surface each timer sits in: the home block's timer pane, the profile's timer card, the top bar pill. */
const TIMER_SURFACE_SELECTOR = '[data-timer-surface]';

/** The layer hangs under the whole timer surface, so it never opens over the task beside the timer. */
function notesAnchorOf(wrapper: HTMLElement | null): Element | null {
	if (!wrapper) {
		return null;
	}
	const surface = wrapper.closest(TIMER_SURFACE_SELECTOR);
	if (surface) {
		return surface;
	}
	return wrapper.firstElementChild;
}

function triggerLabelKeyOf(hasNotes: boolean) {
	if (hasNotes) {
		return 'timer.notes.EDIT' as const;
	}
	return 'timer.notes.ADD' as const;
}

function hintKeyOf(isRunning: boolean) {
	if (isRunning) {
		return 'timer.notes.HINT_RUNNING' as const;
	}
	return 'timer.notes.HINT_BEFORE_START' as const;
}

/**
 * The notes of the timer's entry, behind one toggle so the timer keeps its size: optional, typed before a start or
 * while the timer runs. Every timer on screen shares them. The toggle takes the picked fill once notes are typed.
 */
export function TimerNotesButton({ className }: Readonly<{ className?: string }>) {
	const t = useTranslations();
	const fieldId = useId();
	const hintId = useId();
	const { text, setText, isRunning } = useTimerNotes();
	const hasNotes = normalizedTimerNotes(text) !== '';
	const triggerLabel = t(triggerLabelKeyOf(hasNotes));
	const hint = t(hintKeyOf(isRunning));
	const wrapperRef = useRef<HTMLSpanElement>(null);

	const notesAnchor = useCallback(() => notesAnchorOf(wrapperRef.current), []);

	const changeText = useCallback(
		(event: ChangeEvent<HTMLTextAreaElement>) => {
			setText(event.target.value);
		},
		[setText]
	);

	return (
		<Popover>
			<span ref={wrapperRef} className="contents">
				<Tooltip>
					<TooltipTrigger
						delay={TIMER_TOOLTIP_DELAY_MS}
						render={
							<PopoverTrigger
								render={
									<Button
										type="button"
										variant="outline"
										size="icon-sm"
										aria-label={triggerLabel}
										data-filled={hasNotes || undefined}
										className={cn(TIMER_ENTRY_TOGGLE, className)}
									/>
								}
							/>
						}
					>
						<Compose aria-hidden="true" className={TIMER_ENTRY_TOGGLE_GLYPH} />
					</TooltipTrigger>
					<TooltipContent>{triggerLabel}</TooltipContent>
				</Tooltip>
			</span>
			<PopoverContent
				anchor={notesAnchor}
				align="end"
				sideOffset={8}
				collisionPadding={16}
				className={NOTES_POPOVER_CLASS_NAME}
			>
				<label htmlFor={fieldId} className="text-xs font-medium text-foreground">
					{t('timer.notes.LABEL')}
				</label>
				<textarea
					id={fieldId}
					value={text}
					onChange={changeText}
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
