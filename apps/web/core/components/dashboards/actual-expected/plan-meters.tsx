import { type CSSProperties, memo } from 'react';
import { cn } from '@/core/lib/helpers';
import { dotCountsOf } from '@/core/lib/utils/dashboards/actual-expected';

const PRIMARY = 'hsl(var(--primary))';
const WARNING = 'hsl(var(--warning))';
const TRACK = 'hsl(var(--foreground) / 0.12)';

const DOT_PITCH = 8;
const DOT_RADIUS = 2.75;

function shareOf(part: number, whole: number) {
	if (whole <= 0) {
		return 0;
	}
	const share = (part / whole) * 100;
	return Math.min(Math.max(share, 0), 100);
}

function percentStyleOf(share: number) {
	return `${share}%`;
}

export const BulletMeter = memo(function BulletMeter({
	expected,
	actual,
	scale,
	className
}: Readonly<{ expected: number | null; actual: number; scale: number; className?: string }>) {
	const planned = expected ?? 0;
	const hasPlan = planned > 0;
	const reach = Math.max(planned, actual);
	const trackShare = shareOf(reach, scale);
	const barShare = shareOf(actual, reach);
	const tickShare = shareOf(planned, scale);
	return (
		<span aria-hidden="true" className={cn('relative flex h-4 w-full items-center', className)}>
			<span
				className="relative block h-2.5 overflow-hidden rounded-[3px] bg-foreground/[0.07]"
				style={{ width: percentStyleOf(trackShare) }}
			>
				<span
					className="absolute inset-y-0 left-0 block rounded-[3px] bg-primary"
					style={{ width: percentStyleOf(barShare) }}
				/>
			</span>
			{hasPlan && (
				<span
					className="absolute top-0 block h-4 w-0.5 -translate-x-1/2 rounded-full bg-foreground"
					style={{ left: percentStyleOf(tickShare) }}
				/>
			)}
		</span>
	);
});

function dotMeterStyleOf(planDots: number, filledDots: number, extraDots: number): CSSProperties {
	const filledEnd = filledDots * DOT_PITCH;
	const planEnd = planDots * DOT_PITCH;
	const totalDots = planDots + extraDots;
	const totalEnd = totalDots * DOT_PITCH;
	const background = `linear-gradient(to right, ${PRIMARY} 0 ${filledEnd}px, ${TRACK} ${filledEnd}px ${planEnd}px, ${WARNING} ${planEnd}px ${totalEnd}px)`;
	const dots = `radial-gradient(circle at ${DOT_PITCH / 2}px 50%, #000 0 ${DOT_RADIUS}px, transparent ${DOT_RADIUS + 0.5}px)`;
	const maskSize = `${DOT_PITCH}px 100%`;
	return {
		width: totalEnd,
		background,
		maskImage: dots,
		WebkitMaskImage: dots,
		maskSize,
		WebkitMaskSize: maskSize,
		maskRepeat: 'repeat-x',
		WebkitMaskRepeat: 'repeat-x'
	};
}

/** One element draws every dot (a gradient for the tones, a mask for the dots), so open months stay light. */
export const DayDotMeter = memo(function DayDotMeter({
	expected,
	actual,
	className
}: Readonly<{ expected: number; actual: number; className?: string }>) {
	const { planDots, filledDots, extraDots } = dotCountsOf(expected, actual);
	const style = dotMeterStyleOf(planDots, filledDots, extraDots);
	return <span aria-hidden="true" className={cn('block h-2 max-w-full shrink-0', className)} style={style} />;
});
