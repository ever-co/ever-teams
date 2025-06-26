import { clsxm } from '@/core/lib/utils';
import { JSX, memo, useMemo } from 'react';

// Memoized utility function for colors
const getProgressColor = (progress: number): string => {
	if (progress < 25) return 'bg-red-600 dark:bg-red-400';
	if (progress >= 25 && progress < 50) return 'bg-yellow-600 dark:bg-yellow-400';
	if (progress >= 50 && progress < 75) return 'bg-blue-600 dark:bg-blue-400';
	return 'bg-green-600 dark:bg-green-400';
};

// Memoized component for displaying percentages
const PercentageDisplay = memo(({ progress }: { progress: number | string }) => (
	<div className="not-italic font-medium text-[0.625rem] leading-[140%] tracking-[-0.02em] ml-2 text-[#28204880] dark:text-white">
		{progress}
	</div>
));

// Memoized component for an individual segment
const ProgressSegment = memo(({ isActive, colorClass }: { isActive: boolean; colorClass: string }) => (
	<div className={clsxm('h-2 rounded-sm w-[.3rem]', isActive ? colorClass : 'bg-[#dfdfdf] dark:bg-[#2B303B]')} />
));

export const ProgressBar = memo(function ProgressBar({
	width,
	progress,
	className,
	showPercents,
	backgroundColor
}: {
	width: number | string;
	progress: number | string;
	className?: string;
	showPercents?: boolean;
	backgroundColor?: string;
}) {
	// Memoization of progress calculation
	const progressValue = useMemo(() => parseFloat(progress.toString()), [progress]);

	// Memoization of color class
	const progressColorClass = useMemo(() => getProgressColor(progressValue), [progressValue]);

	// Memoization of styles
	const containerStyle = useMemo(() => ({ width }), [width]);
	const progressStyle = useMemo(() => ({ width: progress }), [progress]);
	const backgroundStyle = useMemo(() => ({ backgroundColor }), [backgroundColor]);

	// Memoization of CSS classes
	const containerClassName = useMemo(
		() => clsxm('flex justify-between items-center relative', className),
		[className]
	);

	const progressBarClassName = useMemo(
		() => clsxm('h-2 rounded-full absolute z-[1] bg-black', progressColorClass),
		[progressColorClass]
	);

	return (
		<>
			<div className={containerClassName} style={containerStyle}>
				<div className={progressBarClassName} style={progressStyle} />
				<div style={backgroundStyle} className="bg-[#dfdfdf] dark:bg-[#2B303B] h-2 rounded-full w-full" />
			</div>
			{showPercents && <PercentageDisplay progress={progress} />}
		</>
	);
});

export const SegmentedProgressBar = memo(function SegmentedProgressBar({
	width,
	progress,
	className,
	showPercents,
	totalSegments = 30
}: {
	width: number | string;
	progress: number | string;
	className?: string;
	showPercents?: boolean;
	totalSegments?: number;
}) {
	// Memoization of base calculations
	const progressValue = useMemo(() => parseFloat(progress.toString()), [progress]);

	const activeSegments = useMemo(
		() => Math.round((progressValue / 100) * totalSegments),
		[progressValue, totalSegments]
	);

	const colorClass = useMemo(() => getProgressColor(progressValue), [progressValue]);

	// Memoization of container style
	const containerStyle = useMemo(() => ({ width }), [width]);

	const containerClassName = useMemo(
		() => clsxm('flex items-center gap-[2px] relative !m-0', className),
		[className]
	);

	// Optimized memoization of segments with Map
	const segments = useMemo(() => {
		const segmentMap = new Map<number, { isActive: boolean; key: string }>();

		for (let i = 0; i < totalSegments; i++) {
			segmentMap.set(i, {
				isActive: i < activeSegments,
				key: `segment-${i}-${activeSegments}` // Key stable qui change seulement quand nécessaire
			});
		}

		return segmentMap;
	}, [totalSegments, activeSegments]);

	// Optimized generation of segments
	const renderedSegments = useMemo(() => {
		const segmentElements: JSX.Element[] = [];

		for (const [, { isActive, key }] of segments) {
			segmentElements.push(<ProgressSegment key={key} isActive={isActive} colorClass={colorClass} />);
		}

		return segmentElements;
	}, [segments, colorClass]);

	return (
		<>
			<div className={containerClassName} style={containerStyle}>
				{renderedSegments}
			</div>
			{showPercents && <PercentageDisplay progress={progress} />}
		</>
	);
});

// Alternative version even more optimized for a lot of segments
export const SegmentedProgressBarVirtualized = memo(function SegmentedProgressBarVirtualized({
	width,
	progress,
	className,
	showPercents,
	totalSegments = 30
}: {
	width: number | string;
	progress: number | string;
	className?: string;
	showPercents?: boolean;
	totalSegments?: number;
}) {
	const progressValue = useMemo(() => parseFloat(progress.toString()), [progress]);
	const activeSegments = useMemo(
		() => Math.round((progressValue / 100) * totalSegments),
		[progressValue, totalSegments]
	);
	const colorClass = useMemo(() => getProgressColor(progressValue), [progressValue]);

	const containerStyle = useMemo(() => ({ width }), [width]);
	const containerClassName = useMemo(
		() => clsxm('flex items-center gap-[2px] relative !m-0', className),
		[className]
	);

	// CSS-in-JS optimized for a lot of identical segments
	const segmentStyle = useMemo(
		() => ({
			height: '0.5rem',
			width: '0.3rem',
			borderRadius: '0.125rem'
		}),
		[]
	);

	const activeSegmentClassName = useMemo(() => clsxm('inline-block', colorClass), [colorClass]);

	const inactiveSegmentClassName = 'inline-block bg-[#dfdfdf] dark:bg-[#2B303B]';

	// Optimized render with fragments to reduce DOM nodes
	const segments = useMemo(() => {
		const elements: JSX.Element[] = [];

		// Batch active segments
		if (activeSegments > 0) {
			for (let i = 0; i < activeSegments; i++) {
				elements.push(<div key={`active-${i}`} className={activeSegmentClassName} style={segmentStyle} />);
			}
		}

		// Batch inactive segments
		const inactiveCount = totalSegments - activeSegments;
		if (inactiveCount > 0) {
			for (let i = 0; i < inactiveCount; i++) {
				elements.push(<div key={`inactive-${i}`} className={inactiveSegmentClassName} style={segmentStyle} />);
			}
		}

		return elements;
	}, [activeSegments, totalSegments, activeSegmentClassName, segmentStyle]);

	return (
		<>
			<div className={containerClassName} style={containerStyle}>
				{segments}
			</div>
			{showPercents && <PercentageDisplay progress={progress} />}
		</>
	);
});
