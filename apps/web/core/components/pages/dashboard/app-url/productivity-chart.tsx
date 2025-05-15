import React, { useState } from 'react';
import { cn } from '@/core/lib/helpers';

// Types
interface ProductivityData {
	date: string;
	productive: number;
	neutral: number;
	unproductive: number;
}

interface ProductivityChartProps {
	data: ProductivityData[];
}

interface LegendProps {
	productivePercentage: number;
	neutralPercentage: number;
	unproductivePercentage: number;
	date?: string;
}

// Constants
const CHART_COLORS = {
	productive: 'bg-[#1554E0]',
	neutral: 'bg-[#F5B458]',
	unproductive: 'bg-[#F56D58]'
} as const;

// Components
const Legend: React.FC<LegendProps> = ({ productivePercentage, neutralPercentage, unproductivePercentage, date }) => {
	const formattedDate = date
		? new Date(date).toLocaleDateString('en-US', {
				month: 'short',
				day: '2-digit',
				year: 'numeric'
			})
		: new Date().toLocaleDateString('en-US', {
				month: 'short',
				day: '2-digit',
				year: 'numeric'
			});

	const legendItems = [
		{ label: 'Productive', percentage: productivePercentage, color: CHART_COLORS.productive },
		{ label: 'Neutral', percentage: neutralPercentage, color: CHART_COLORS.neutral },
		{ label: 'Unproductive', percentage: unproductivePercentage, color: CHART_COLORS.unproductive }
	];

	return (
		<div>
			<div className="mb-2 text-sm text-gray-600 dark:text-gray-400">{formattedDate}</div>
			<div className="space-y-2">
				{legendItems.map(({ label, percentage, color }) => (
					<div key={label} className="flex gap-2 items-center">
						<div className={cn('w-4 h-4 rounded', color)} />
						<span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
						<span className="ml-auto text-sm text-gray-600 dark:text-gray-400">{percentage}%</span>
					</div>
				))}
			</div>
		</div>
	);
};

const ChartBar: React.FC<{
	day: ProductivityData;
	isHovered: boolean;
	onHover: (day: ProductivityData | null) => void;
}> = ({ day, isHovered, onHover }) => (
	<div
		className="flex relative flex-col flex-1 justify-end cursor-pointer group"
		onMouseEnter={() => onHover(day)}
		onMouseLeave={() => onHover(null)}
	>
		<div className="flex overflow-hidden absolute inset-0 flex-col justify-end">
			{[
				{ value: day.productive, color: CHART_COLORS.productive, isTop: true },
				{ value: day.unproductive, color: CHART_COLORS.unproductive },
				{ value: day.neutral, color: CHART_COLORS.neutral }
			].map(({ value, color, isTop }, index) => (
				<div
					key={index}
					style={{ height: `${value}%` }}
					className={cn(
						'w-full transition-opacity duration-200 group-hover:opacity-80',
						color,
						isTop && 'rounded-t-lg'
					)}
				/>
			))}
		</div>
		{isHovered && (
			<div className="absolute top-1/2 left-1/2 z-10 transform -translate-x-1/2 -translate-y-1/2">
				<div className="p-3 whitespace-nowrap bg-white rounded-lg border border-gray-200 shadow-lg dark:bg-dark--theme-light dark:border-gray-700">
					<Legend
						productivePercentage={day.productive}
						neutralPercentage={day.neutral}
						unproductivePercentage={day.unproductive}
						date={day.date}
					/>
				</div>
			</div>
		)}
	</div>
);

export const ProductivityChart: React.FC<ProductivityChartProps> = ({ data }) => {
	const [hoveredDay, setHoveredDay] = useState<ProductivityData | null>(null);

	const getDateNumber = (dateString: string): number => {
		return new Date(dateString).getDate();
	};

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col gap-2">
				<div className="flex gap-[2px] h-[220px] w-full justify-between">
					{data.map((day) => (
						<ChartBar key={day.date} day={day} isHovered={hoveredDay === day} onHover={setHoveredDay} />
					))}
				</div>
				<div className="flex gap-[2px] w-full justify-between px-1">
					{data.map((day) => (
						<div
							key={`label-${day.date}`}
							className="flex-1 text-xs text-center text-gray-500 dark:text-gray-400"
						>
							{getDateNumber(day.date)}
						</div>
					))}
				</div>
			</div>
		</div>
	);
};
