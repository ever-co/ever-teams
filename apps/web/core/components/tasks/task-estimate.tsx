'use client';

import { RefObject, useEffect, type KeyboardEvent, type MouseEvent } from 'react';
import { useTranslations } from 'next-intl';
import { useCallbackRef, useTaskEstimation } from '@/core/hooks';
import { Button } from '@/core/components/common/button';
import { controlGroupRecipe } from '@/core/components/common/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/core/components/common/popover';
import { EMPTY_FIELD_RECIPE, VALUE_FIELD_RECIPE } from '@/core/components/common/surface-recipes';
import { Pencil, Plus, Spinner } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import { clsxm } from '@/core/lib/utils';
import { Nullable } from '@/core/types/generics/utils';
import { TTask } from '@/core/types/schemas/task/task.schema';

type Props = {
	_task?: Nullable<TTask>;
	onCloseEdition?: () => void;
	onOpenEdition?: () => void;
	className?: string;
	loadingRef?: RefObject<boolean>;
	closeable_fc?: () => void;
	showEditAndSaveButton?: boolean;
	useActiveTeamTaskByDefault?: boolean;
};

interface EstimatePreset {
	label: string;
	hours: number;
	minutes: number;
}

/** The durations people give most, one click each. */
const PRESETS: EstimatePreset[] = [
	{ label: '30m', hours: 0, minutes: 30 },
	{ label: '1h', hours: 1, minutes: 0 },
	{ label: '2h', hours: 2, minutes: 0 },
	{ label: '4h', hours: 4, minutes: 0 },
	{ label: '8h', hours: 8, minutes: 0 }
];

/** Closing the panel by clicking or tabbing away keeps what was typed, as the inline fields did; Escape does not. */
const SAVING_CLOSE_REASONS = new Set(['outside-press', 'focus-out']);

const PENCIL = 'text-muted-foreground/70 transition-colors group-hover/field:text-foreground';

const FIELD_INPUT =
	'h-full w-full min-w-0 bg-transparent text-[13px] font-medium tabular-nums text-foreground outline-none placeholder:text-muted-foreground/60';

const PRESET_CHIP =
	'inline-flex h-7 items-center justify-center rounded-md px-1 text-xs font-medium tabular-nums text-muted-foreground hairline-ring ring-border outline-none transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25 aria-pressed:bg-primary/[0.08] aria-pressed:text-primary-ink aria-pressed:ring-primary/30';

function wholeNumberOf(value: number) {
	if (Number.isNaN(value)) {
		return 0;
	}
	return value;
}

function estimateTextOf(hours: number, minutes: number) {
	if (hours === 0) {
		return `${minutes}m`;
	}
	if (minutes === 0) {
		return `${hours}h`;
	}
	return `${hours}h ${minutes}m`;
}

function isPresetOf(preset: EstimatePreset, hours: number, minutes: number) {
	const isSameHours = preset.hours === hours;
	return isSameHours && preset.minutes === minutes;
}

function closeReasonOf(details: unknown) {
	return (details as { reason?: string } | undefined)?.reason ?? '';
}

/**
 * A task's estimate in three states: the value in a field with its pencil, "+ Estimate" in a dashed field when there
 * is none, and a panel anchored to it with the hours and minutes, presets and Save, so editing never squeezes the row.
 * Without the right to edit it is plain text, so a field always means "editable".
 */
export function TaskEstimate({
	_task,
	onCloseEdition,
	onOpenEdition,
	className,
	loadingRef,
	closeable_fc,
	showEditAndSaveButton = true,
	useActiveTeamTaskByDefault = true
}: Props) {
	const {
		value,
		onChange,
		handleSubmit,
		handleFocus,
		task,
		handleBlur,
		handleFocusMinutes,
		handleBlurMinutes,
		updateLoading,
		editableMode,
		setEditableMode,
		cancelEdition,
		saveEstimate
	} = useTaskEstimation(_task, useActiveTeamTaskByDefault);
	const t = useTranslations();
	const onCloseEditionRef = useCallbackRef(onCloseEdition);
	const onOpenEditionRef = useCallbackRef(onOpenEdition);
	const closeable_fcRef = useCallbackRef(closeable_fc);

	useEffect(() => {
		if (editableMode) {
			onOpenEditionRef.current?.();
			return;
		}
		onCloseEditionRef.current?.();
	}, [editableMode, onCloseEditionRef, onOpenEditionRef]);

	useEffect(() => {
		if (loadingRef?.current && !updateLoading) {
			closeable_fcRef.current?.();
		}
		if (loadingRef) {
			loadingRef.current = updateLoading;
		}
	}, [updateLoading, loadingRef, closeable_fcRef]);

	const hours = wholeNumberOf(Number.parseInt(value['hours']));
	const minutes = wholeNumberOf(Number.parseInt(value['minutes']));
	const savedSeconds = task?.estimate ?? 0;
	const hasSavedEstimate = savedSeconds > 0;
	const hasEstimate = hours > 0 || minutes > 0;
	const text = estimateTextOf(hours, minutes);
	const isSaving = Boolean(updateLoading);
	const isDisabled = !task || isSaving;

	if (!showEditAndSaveButton) {
		return (
			<div className={clsxm('inline-flex shrink-0 items-center', className)}>
				{hasEstimate && <span className="text-[13px] font-medium tabular-nums text-foreground">{text}</span>}
				{!hasEstimate && <span className="text-[13px] text-muted-foreground">-</span>}
			</div>
		);
	}

	const handleOpenChange = (isNextOpen: boolean, details: unknown) => {
		if (isNextOpen) {
			setEditableMode(true);
			return;
		}
		const savesOnClose = SAVING_CLOSE_REASONS.has(closeReasonOf(details));
		if (savesOnClose) {
			handleSubmit();
			return;
		}
		cancelEdition();
	};

	const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		if (event.key === 'Enter') {
			event.preventDefault();
			handleSubmit();
		}
	};

	const keepRowClick = (event: MouseEvent<HTMLButtonElement>) => event.stopPropagation();

	let triggerClassName = VALUE_FIELD_RECIPE;
	let triggerLabel = `${t('common.ESTIMATE')}: ${text}`;
	if (!hasEstimate) {
		triggerClassName = EMPTY_FIELD_RECIPE;
		triggerLabel = t('common.ESTIMATE');
	}

	return (
		<div className={clsxm('inline-flex shrink-0 items-center', className)}>
			<Popover open={editableMode} onOpenChange={handleOpenChange}>
				<PopoverTrigger
					disabled={isDisabled}
					aria-label={triggerLabel}
					onClick={keepRowClick}
					className={triggerClassName}
				>
					{!hasEstimate && <Plus aria-hidden="true" />}
					{!hasEstimate && t('common.ESTIMATE')}
					{hasEstimate && text}
					{isSaving && <Spinner aria-hidden="true" className="size-3.5 animate-spin text-muted-foreground" />}
					{hasEstimate && !isSaving && <Pencil aria-hidden="true" className={PENCIL} />}
				</PopoverTrigger>
				<PopoverContent align="start" className="w-60 p-3" onClick={(event) => event.stopPropagation()}>
					<p className="text-[13px] font-semibold text-foreground">{t('common.ESTIMATE')}</p>
					<div className="mt-2.5 grid grid-cols-2 gap-2">
						<label className={cn(controlGroupRecipe, 'h-8 gap-1.5 px-2.5')}>
							<input
								inputMode="numeric"
								aria-label={t('common.HOURS')}
								placeholder="0"
								value={value['hours']}
								onChange={onChange('hours')}
								onKeyDown={handleKeyDown}
								onFocus={handleFocus}
								onBlur={handleBlur}
								className={FIELD_INPUT}
							/>
							<span className="text-xs text-muted-foreground">h</span>
						</label>
						<label className={cn(controlGroupRecipe, 'h-8 gap-1.5 px-2.5')}>
							<input
								inputMode="numeric"
								aria-label={t('common.MINUTES')}
								placeholder="00"
								value={value['minutes']}
								onChange={onChange('minutes')}
								onKeyDown={handleKeyDown}
								onFocus={handleFocusMinutes}
								onBlur={handleBlurMinutes}
								className={FIELD_INPUT}
							/>
							<span className="text-xs text-muted-foreground">m</span>
						</label>
					</div>
					<div className="mt-2 grid grid-cols-5 gap-1.5">
						{PRESETS.map((preset) => (
							<button
								key={preset.label}
								type="button"
								aria-pressed={isPresetOf(preset, hours, minutes)}
								onClick={() => saveEstimate(preset.hours, preset.minutes)}
								className={PRESET_CHIP}
							>
								{preset.label}
							</button>
						))}
					</div>
					<div className="-mx-3 mt-3 flex items-center gap-2 hairline-t border-border px-3 pt-3">
						{hasSavedEstimate && (
							<Button type="button" variant="ghost" size="sm" onClick={() => saveEstimate(0, 0)}>
								{t('common.CLEAR')}
							</Button>
						)}
						<Button type="button" variant="ghost" size="sm" onClick={cancelEdition} className="ml-auto">
							{t('common.CANCEL')}
						</Button>
						<Button type="button" size="sm" onClick={handleSubmit}>
							{t('common.SAVE')}
						</Button>
					</div>
				</PopoverContent>
			</Popover>
		</div>
	);
}
