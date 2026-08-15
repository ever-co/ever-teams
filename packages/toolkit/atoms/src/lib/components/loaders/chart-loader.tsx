import React from 'react';
import { cn } from '@ever-teams/toolkit-ui';
import { ChartType } from '@components/teams-report/basic-report/teams-basic-report';

interface IBasicReportLoaderProps {
	type?: ChartType;
}

/**
 * Skeleton component for bar charts (bar and bar-horizontal)
 */
const BarChartSkeleton: React.FC<{ horizontal?: boolean }> = ({ horizontal = false }) => (
	<div className={cn('flex-1 flex items-end gap-3 px-4 mb-6', horizontal && 'flex-col items-start justify-center')}>
		{horizontal
			? // Horizontal bars
				Array.from({ length: 7 }, (_, index) => (
					<div key={index} className="flex items-center gap-2 w-full">
						<div className="h-4 w-16 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
						<div
							className="h-8 rounded bg-gray-100 dark:bg-gray-800 animate-pulse"
							style={{ width: `${Math.random() * 50 + 30}%` }}
						/>
					</div>
				))
			: // Vertical bars
				Array.from({ length: 7 }, (_, index) => (
					<div key={index} className="flex flex-col items-center gap-2 flex-1">
						<div
							className="w-full max-w-[60px] rounded-t bg-gray-100 dark:bg-gray-800 animate-pulse"
							style={{ height: `${Math.random() * 150 + 50}px` }}
						/>
						<div className="h-3 w-12 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
					</div>
				))}
	</div>
);

/**
 * Skeleton component for line and area charts
 */
const LineAreaChartSkeleton: React.FC = () => (
	<div className="flex-1 flex flex-col justify-between px-4 mb-4">
		{/* Y-axis labels */}
		<div className="flex justify-between h-full">
			<div className="flex flex-col justify-between py-4">
				{Array.from({ length: 7 }, (_, index) => (
					<div key={index} className="h-3 w-8 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
				))}
			</div>
			{/* Chart area with fake line */}
			<div className="flex-1 relative mx-4">
				<div className="absolute inset-0 flex items-center">
					<svg className="w-full h-3/4" viewBox="0 0 100 50" preserveAspectRatio="none">
						<path
							d="M0,40 Q10,30 20,35 T40,25 T60,30 T80,15 T100,20"
							fill="none"
							stroke="currentColor"
							strokeWidth="1"
							className="text-gray-200 dark:text-gray-700 animate-pulse"
						/>
					</svg>
				</div>
			</div>
		</div>
		{/* X-axis labels */}
		<div className="flex justify-between px-12 pt-2">
			{Array.from({ length: 7 }, (_, index) => (
				<div key={index} className="h-3 w-12 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
			))}
		</div>
	</div>
);

/**
 * Skeleton component for radial and pie charts
 */
const RadialPieChartSkeleton: React.FC = () => (
	<div className="flex-1 flex items-center justify-center mb-4">
		<div className="relative">
			{/* Outer circle */}
			<div className="w-48 h-48 rounded-full border-20 border-gray-100 dark:border-gray-800 animate-pulse" />
			{/* Inner circle (for donut effect) */}
			<div className="absolute inset-0 flex items-center justify-center">
				<div className="w-24 h-24 rounded-full bg-white dark:bg-black" />
			</div>
			{/* Center text skeleton */}
			<div className="absolute inset-0 flex flex-col items-center justify-center">
				<div className="h-6 w-16 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
				<div className="h-3 w-12 mt-1 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
			</div>
		</div>
	</div>
);

/**
 * Skeleton component for radar charts
 */
const RadarChartSkeleton: React.FC = () => (
	<div className="flex-1 flex items-center justify-center mb-4">
		<div className="relative w-56 h-56">
			{/* Hexagon/polygon shapes */}
			<svg viewBox="0 0 100 100" className="w-full h-full">
				{/* Background rings */}
				{[40, 30, 20].map((r, i) => (
					<polygon
						key={i}
						points="50,10 90,30 90,70 50,90 10,70 10,30"
						fill="none"
						stroke="currentColor"
						strokeWidth="1"
						className="text-gray-200 dark:text-gray-700"
						transform={`scale(${r / 40}) translate(${(40 - r) * 1.25}, ${(40 - r) * 1.25})`}
					/>
				))}
				{/* Data polygon */}
				<polygon
					points="50,25 75,35 70,65 50,75 25,60 30,35"
					fill="currentColor"
					className="text-gray-100 dark:text-gray-800 animate-pulse"
					fillOpacity="0.5"
				/>
			</svg>
			{/* Axis labels */}
			{['top', 'top-right', 'bottom-right', 'bottom', 'bottom-left', 'top-left'].map((pos, i) => (
				<div
					key={i}
					className="absolute h-3 w-10 rounded bg-gray-100 dark:bg-gray-800 animate-pulse"
					style={{
						top: pos.includes('top')
							? pos === 'top'
								? '0'
								: '15%'
							: pos.includes('bottom')
								? pos === 'bottom'
									? 'auto'
									: '75%'
								: '45%',
						bottom: pos === 'bottom' ? '0' : 'auto',
						left: pos.includes('left') ? '0' : pos.includes('right') ? 'auto' : '50%',
						right: pos.includes('right') ? '0' : 'auto',
						transform: pos === 'top' || pos === 'bottom' ? 'translateX(-50%)' : 'none'
					}}
				/>
			))}
		</div>
	</div>
);

/**
 * Skeleton component for tooltip charts
 */
const TooltipChartSkeleton: React.FC = () => (
	<div className="flex-1 flex flex-col gap-3 px-4 mb-4">
		{Array.from({ length: 10 }, (_, index) => (
			<div key={index} className="flex items-center  gap-3">
				{/* Label */}
				<div className="h-4 w-20 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
				{/* Progress bar */}
				<div className="flex-1 h-6 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse relative overflow-hidden">
					<div
						className="absolute inset-y-0 left-0 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse"
						style={{ width: `${Math.random() * 60 + 20}%` }}
					/>
				</div>
				{/* Value */}
				<div className="h-4 w-12 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
			</div>
		))}
	</div>
);

/**
 * Get the appropriate chart skeleton based on chart type
 */
const getChartSkeleton = (type: ChartType): React.ReactNode => {
	switch (type) {
		case 'bar':
			return <BarChartSkeleton horizontal={false} />;
		case 'bar-horizontal':
			return <BarChartSkeleton horizontal={true} />;
		case 'line':
		case 'area':
			return <LineAreaChartSkeleton />;
		case 'pie':
		case 'radial':
			return <RadialPieChartSkeleton />;
		case 'radar':
			return <RadarChartSkeleton />;
		case 'tooltip':
			return <TooltipChartSkeleton />;
		default:
			return <BarChartSkeleton horizontal={true} />;
	}
};

const ChartLoader: React.FC<IBasicReportLoaderProps> = ({ type = 'bar-horizontal' }) => {
	return <>{getChartSkeleton(type)}</>;
};

ChartLoader.displayName = 'ChartLoader';

export { ChartLoader };
