import { memo, useMemo } from 'react';
import { cn } from '@/core/lib/helpers';
import { pillTonesOf, type BudgetAmounts, type PillTone } from '@/core/lib/utils/dashboards/project-budget';

const PILL_TONES: Record<PillTone, string> = {
	empty: 'bg-foreground/[0.08]',
	within: 'bg-primary',
	near: 'bg-warning',
	over: 'bg-destructive'
};

const SEGMENT = 'h-full min-w-0 flex-1 rounded-[2px]';

/** Twenty pills of the budget; the figure and the verdict are written beside it, colour is never the only signal. */
export const BudgetPillMeter = memo(function BudgetPillMeter({
	amounts,
	className
}: Readonly<{ amounts: BudgetAmounts; className?: string }>) {
	const tones = useMemo(() => pillTonesOf(amounts), [amounts]);
	return (
		<span aria-hidden="true" className={cn('flex h-3 w-full gap-0.5', className)}>
			{tones.map((tone, index) => (
				<span key={index} className={cn(SEGMENT, PILL_TONES[tone])} />
			))}
		</span>
	);
});

export function BudgetPillMeterSkeleton({ className }: Readonly<{ className?: string }>) {
	return <span aria-hidden="true" className={cn('block h-3 w-full rounded-[2px] bg-foreground/[0.05]', className)} />;
}
