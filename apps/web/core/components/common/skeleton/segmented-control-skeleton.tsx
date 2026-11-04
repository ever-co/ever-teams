import { cn } from '@/core/lib/helpers';

const TRACK = 'inline-flex shrink-0 items-center gap-0.5 rounded-lg bg-foreground/[0.05] p-0.5';

const ITEM = 'flex h-7 shrink-0 items-center justify-center gap-1.5 rounded-md px-3';

const ICON_ONLY_ITEM = 'w-7 px-0';

const THUMB =
	'bg-card shadow-[0_1px_2px_rgb(0_0_0/0.08)] hairline-ring ring-foreground/10 dark:bg-foreground/[0.09] dark:ring-foreground/15';

const LABEL = 'h-2.5 animate-pulse rounded-full bg-foreground/[0.07]';

const ICON = 'size-3.5 animate-pulse rounded-[4px] bg-foreground/[0.07]';

export interface SegmentSkeleton {
	/** The width of the label bar; a segment without one is an icon-only option. */
	labelWidth?: string;
	hasCount?: boolean;
}

export function SegmentCountSkeleton() {
	return (
		<span
			aria-hidden="true"
			className="inline-block h-4.5 w-5 shrink-0 animate-pulse rounded-[5px] bg-foreground/[0.06]"
		/>
	);
}

function SegmentItemSkeleton({ segment, isPicked }: Readonly<{ segment: SegmentSkeleton; isPicked: boolean }>) {
	const isIconOnly = !segment.labelWidth;
	return (
		<span className={cn(ITEM, isIconOnly && ICON_ONLY_ITEM, isPicked && THUMB)}>
			{isIconOnly && <span className={ICON} />}
			{!isIconOnly && <span className={cn(LABEL, segment.labelWidth)} />}
			{segment.hasCount && <SegmentCountSkeleton />}
		</span>
	);
}

export function SegmentedControlSkeleton({
	segments,
	pickedIndex = 0,
	className
}: Readonly<{ segments: ReadonlyArray<SegmentSkeleton>; pickedIndex?: number; className?: string }>) {
	return (
		<span aria-hidden="true" className={cn(TRACK, className)}>
			{segments.map((segment, index) => (
				<SegmentItemSkeleton
					key={`${segment.labelWidth ?? 'icon'}-${index}`}
					segment={segment}
					isPicked={index === pickedIndex}
				/>
			))}
		</span>
	);
}
