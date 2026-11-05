'use client';

import { useState, type KeyboardEvent } from 'react';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/core/components/common/button';
import { controlGroupRecipe } from '@/core/components/common/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/core/components/common/popover';
import { EMPTY_FIELD_RECIPE, VALUE_FIELD_RECIPE } from '@/core/components/common/surface-recipes';
import { Pencil, Plus, Spinner } from '@/core/components/icons';
import { useUpdateDailyPlan } from '@/core/hooks/daily-plans/use-update-daily-plan';
import { cn } from '@/core/lib/helpers';
import { hoursToHMM, parseStringInputToHours } from '@/core/lib/helpers/index';
import { formatDurationShort } from '@/core/lib/utils/dashboard-figures';
import { errorReasonKeyOf } from '@/core/lib/utils/error-feedback';
import { TDailyPlan } from '@/core/types/schemas';

const PRESET_HOURS = [2, 4, 6, 8];

/** Closing the panel by clicking or tabbing away keeps what was typed; Escape does not. */
const SAVING_CLOSE_REASONS = new Set(['outside-press', 'focus-out']);

const SECONDS_PER_HOUR = 3600;

const PENCIL = 'text-muted-foreground/70 transition-colors group-hover/field:text-foreground';

const READ_ONLY_VALUE = 'text-[13px] font-medium tabular-nums text-foreground';

const FIELD_INPUT =
	'h-full w-full min-w-0 bg-transparent text-[13px] font-medium tabular-nums text-foreground outline-none placeholder:text-muted-foreground/60';

const PRESET_CHIP =
	'inline-flex h-7 items-center justify-center rounded-md px-1 text-xs font-medium tabular-nums text-muted-foreground hairline-ring ring-border outline-none transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25 aria-pressed:bg-primary/[0.08] aria-pressed:text-primary-ink aria-pressed:ring-primary/30';

function isValidPlannedHours(hours: number | undefined, parseError: string | undefined): hours is number {
	if (parseError) {
		return false;
	}
	if (hours === undefined) {
		return false;
	}
	if (!Number.isFinite(hours)) {
		return false;
	}
	return hours >= 0;
}

function plannedTimeTextOf(hours: number) {
	return formatDurationShort(hours * SECONDS_PER_HOUR);
}

function closeReasonOf(details: unknown) {
	return (details as { reason?: string } | undefined)?.reason ?? '';
}

interface PlannedTimeFieldProps {
	plan: TDailyPlan;
	canEdit: boolean;
}

export function PlannedTimeField({ plan, canEdit }: Readonly<PlannedTimeFieldProps>) {
	const t = useTranslations();
	const savedHours = plan.workTimePlanned ?? 0;
	const [shownHours, setShownHours] = useState(savedHours);
	const [lastSavedHours, setLastSavedHours] = useState(savedHours);
	const [inputValue, setInputValue] = useState(hoursToHMM(savedHours));
	const [isOpen, setIsOpen] = useState(false);
	const { updateDailyPlan, updateDailyPlanLoading } = useUpdateDailyPlan({ handlesOwnError: true });

	if (savedHours !== lastSavedHours) {
		setLastSavedHours(savedHours);
		setShownHours(savedHours);
	}

	const text = plannedTimeTextOf(shownHours);
	const hasPlannedTime = shownHours > 0;
	const isSaving = Boolean(updateDailyPlanLoading);

	if (!canEdit) {
		return <span className={READ_ONLY_VALUE}>{text}</span>;
	}

	const restoreSavedHours = () => {
		setShownHours(savedHours);
		setInputValue(hoursToHMM(savedHours));
	};

	const saveHours = async (hours: number) => {
		setIsOpen(false);
		if (plan.workTimePlanned === hours) {
			setShownHours(hours);
			return;
		}
		setShownHours(hours);
		try {
			// The API checks permissions against the plan owner, so the owner goes with every update
			await updateDailyPlan({ workTimePlanned: hours, employeeId: plan.employeeId || undefined }, plan.id ?? '');
		} catch (error) {
			restoreSavedHours();
			const reasonKey = errorReasonKeyOf(error) as DottedLanguageObjectStringPaths;
			toast.error(t('toasts.plans.SAVE_FAILED'), { description: t(reasonKey) });
		}
	};

	const saveTypedHours = () => {
		if (isSaving) {
			return;
		}
		const { hours, error: parseError } = parseStringInputToHours(inputValue);
		if (!isValidPlannedHours(hours, parseError)) {
			setIsOpen(false);
			restoreSavedHours();
			toast.warning(t('toasts.plans.HOURS_INVALID'), { id: 'plan-hours-invalid' });
			return;
		}
		void saveHours(hours);
	};

	const cancelEdition = () => {
		setIsOpen(false);
		setInputValue(hoursToHMM(shownHours));
	};

	const handleOpenChange = (isNextOpen: boolean, details: unknown) => {
		if (isNextOpen) {
			setInputValue(hoursToHMM(shownHours));
			setIsOpen(true);
			return;
		}
		const savesOnClose = SAVING_CLOSE_REASONS.has(closeReasonOf(details));
		if (savesOnClose) {
			saveTypedHours();
			return;
		}
		cancelEdition();
	};

	const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		if (event.key === 'Enter') {
			event.preventDefault();
			saveTypedHours();
		}
	};

	let triggerClassName = VALUE_FIELD_RECIPE;
	let triggerLabel = `${t('dailyPlan.PLANNED_TIME')}: ${text}`;
	if (!hasPlannedTime) {
		triggerClassName = EMPTY_FIELD_RECIPE;
		triggerLabel = t('profile.plans.SET_PLANNED_TIME');
	}
	const showsPencil = hasPlannedTime && !isSaving;

	return (
		<Popover open={isOpen} onOpenChange={handleOpenChange}>
			<PopoverTrigger disabled={isSaving} aria-label={triggerLabel} className={triggerClassName}>
				{!hasPlannedTime && <Plus aria-hidden="true" />}
				{!hasPlannedTime && t('profile.plans.SET_PLANNED_TIME')}
				{hasPlannedTime && text}
				{isSaving && <Spinner aria-hidden="true" className="size-3.5 animate-spin text-muted-foreground" />}
				{showsPencil && <Pencil aria-hidden="true" className={PENCIL} />}
			</PopoverTrigger>
			<PopoverContent align="end" className="w-60 p-3">
				<p className="text-[13px] font-semibold text-foreground">{t('dailyPlan.PLANNED_TIME')}</p>
				<label className={cn(controlGroupRecipe, 'mt-2.5 h-8 gap-1.5 px-2.5')}>
					<input
						inputMode="decimal"
						aria-label={t('dailyPlan.PLANNED_TIME')}
						placeholder="4:30"
						value={inputValue}
						onChange={(event) => setInputValue(event.target.value)}
						onKeyDown={handleKeyDown}
						onFocus={(event) => event.target.select()}
						className={FIELD_INPUT}
					/>
					<span className="text-xs text-muted-foreground">h</span>
				</label>
				<p className="mt-1.5 text-xs text-muted-foreground text-pretty">{t('toasts.plans.HOURS_INVALID')}</p>
				<div className="mt-2 grid grid-cols-4 gap-1.5">
					{PRESET_HOURS.map((hours) => (
						<button
							key={hours}
							type="button"
							aria-pressed={shownHours === hours}
							onClick={() => void saveHours(hours)}
							className={PRESET_CHIP}
						>
							{`${hours}h`}
						</button>
					))}
				</div>
				<div className="-mx-3 mt-3 flex items-center gap-2 hairline-t border-border px-3 pt-3">
					{hasPlannedTime && (
						<Button type="button" variant="ghost" size="sm" onClick={() => void saveHours(0)}>
							{t('common.CLEAR')}
						</Button>
					)}
					<Button type="button" variant="ghost" size="sm" onClick={cancelEdition} className="ml-auto">
						{t('common.CANCEL')}
					</Button>
					<Button type="button" size="sm" onClick={saveTypedHours}>
						{t('common.SAVE')}
					</Button>
				</div>
			</PopoverContent>
		</Popover>
	);
}
