import { useEmployeeDailyPlans } from '@/core/hooks/daily-plans/use-employee-daily-plans';
import { cn } from '@/core/lib/helpers';
import { PropsWithChildren, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, ChevronDown, ListTodo } from '@/core/components/icons';
import { Popover, PopoverContent, PopoverTrigger } from '../../common/popover';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '../../common/command';
import { SelectedMark } from '../../common/selected-mark';
import { buttonVariants } from '../../duplicated-components/_button';
import { usePlanDayLabel } from './plan-day-label';

const FILTER_FIELD_CLASS_NAME =
	'flex h-8 w-full min-w-[190px] items-center justify-between rounded-md bg-card px-2.5 text-xs text-foreground shadow-sm shadow-black/10 hairline-ring ring-foreground/10 transition-colors hover:bg-muted/50 dark:ring-foreground/15';

const NO_PICKS: string[] = [];

export function DailyPlanDropDownItem({
	children,
	label,
	active = true,
	checked = false,
	showIcon = true,
	icon
}: PropsWithChildren<{
	label: string;
	active?: boolean;
	checked?: boolean;
	showIcon?: boolean;
	icon?: React.ReactNode;
}>) {
	const isIconShown = showIcon && active;
	const visibleIcon = isIconShown && icon;
	return (
		<div className={cn(FILTER_FIELD_CLASS_NAME)}>
			<div className={cn('flex items-center space-x-2 text-foreground whitespace-nowrap text-ellipsis')}>
				{checked && <Check className="size-4 text-foreground" />}
				{!checked && visibleIcon}
				<div className="text-xs font-medium text-muted-foreground">{label}</div>
			</div>
			{children}
		</div>
	);
}

interface DailyPlanFilterProps {
	employeeId: string;
	/** The picked plan ids, when the caller narrows its views with them; the picker keeps its own pick otherwise. */
	pickedPlanIds?: string[];
	onPickedPlanIdsChange?: (planIds: string[]) => void;
}

function toggledPick(picks: string[], planId: string) {
	if (picks.includes(planId)) {
		return picks.filter((id) => id !== planId);
	}
	return [...picks, planId];
}

export function DailyPlanFilter({ employeeId, pickedPlanIds, onPickedPlanIdsChange }: Readonly<DailyPlanFilterProps>) {
	const t = useTranslations();
	const dayLabelOf = usePlanDayLabel();
	const [ownPicks, setOwnPicks] = useState<string[]>(NO_PICKS);
	const [open, setOpen] = useState(false);
	const { employeeSortedPlans } = useEmployeeDailyPlans(employeeId);

	const isControlled = pickedPlanIds !== undefined;
	const picks = pickedPlanIds ?? ownPicks;
	const plans = useMemo(() => [...employeeSortedPlans].reverse(), [employeeSortedPlans]);
	const pickedCount = plans.filter((plan) => picks.includes(plan.id ?? '')).length;
	const hasPicks = pickedCount > 0;

	let triggerLabel = t('common.plan.PLURAL');
	if (hasPicks) {
		triggerLabel = t('profile.plans.PICKED_PLANS', { count: pickedCount });
	}

	const changePicks = (nextPicks: string[]) => {
		if (!isControlled) {
			setOwnPicks(nextPicks);
		}
		onPickedPlanIdsChange?.(nextPicks);
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger
				className={cn(buttonVariants({ variant: 'outline', size: 'default' }), hasPicks && 'text-primary-ink')}
			>
				<ListTodo aria-hidden="true" className="text-muted-foreground" />
				{triggerLabel}
				<ChevronDown aria-hidden="true" className="size-3.5 text-muted-foreground" />
			</PopoverTrigger>
			<PopoverContent align="end" sideOffset={6} className="w-64 p-0">
				<Command className="bg-transparent">
					<CommandList className="max-h-72 overflow-y-auto">
						<CommandEmpty>{t('profile.plans.NO_PLANS_TO_PICK')}</CommandEmpty>
						<CommandGroup>
							{plans.map((plan) => {
								const planId = plan.id ?? '';
								const isPicked = picks.includes(planId);
								return (
									<CommandItem
										key={planId}
										value={planId}
										onSelect={() => changePicks(toggledPick(picks, planId))}
										className="cursor-pointer"
									>
										<span className="min-w-0 flex-1 truncate">{dayLabelOf(plan.date)}</span>
										<span className="text-xs tabular-nums text-muted-foreground">
											{plan.tasks?.length ?? 0}
										</span>
										{isPicked && <SelectedMark />}
									</CommandItem>
								);
							})}
						</CommandGroup>
					</CommandList>
				</Command>
				{hasPicks && (
					<div className="hairline-t border-border p-1">
						<button
							type="button"
							onClick={() => changePicks(NO_PICKS)}
							className="flex h-8 w-full items-center rounded-md px-2 text-left text-[13px] text-muted-foreground outline-none transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:bg-foreground/5"
						>
							{t('profile.plans.SHOW_EVERY_PLAN')}
						</button>
					</div>
				)}
			</PopoverContent>
		</Popover>
	);
}
