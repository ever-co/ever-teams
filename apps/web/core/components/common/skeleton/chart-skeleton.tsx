import { cn } from '@/core/lib/helpers';

const BAR = 'animate-pulse rounded-md bg-foreground/5';

const LEGEND_PILL_WIDTHS = ['w-24', 'w-20', 'w-16', 'w-24'];

interface ChartSkeletonProps {
	className?: string;
}

/** The chart block of the team dashboard; the surface around it belongs to the page. */
export function ChartSkeleton({ className }: ChartSkeletonProps) {
	return (
		<div className={cn('flex w-full flex-col p-4', className)}>
			<div className="mb-2 flex justify-end">
				<div className={cn(BAR, 'h-8 w-44')} />
			</div>
			<div className="h-[300px] w-full">
				<div className={cn(BAR, 'h-[255px] w-full rounded-lg')} />
				<div className="mt-4 flex justify-center gap-2">
					{LEGEND_PILL_WIDTHS.map((width, index) => (
						<div key={index} className={cn(BAR, 'h-7 rounded-full', width)} />
					))}
				</div>
			</div>
		</div>
	);
}
