'use client';

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, ReferenceLine } from 'recharts';
import { SegmentedControl } from '@/core/components/common/segmented-control';
import { Button } from '@/core/components/duplicated-components/_button';
import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Spinner } from '@/core/components/common/spinner';
import { format, startOfWeek, startOfMonth } from 'date-fns';
import { ITimeLogReportDailyChart } from '@/core/types/interfaces/activity/activity-report';
import { cn } from '@/core/lib/helpers';

const SERIES_COLORS = {
	tracked: '#0284C7',
	manual: '#DC2626',
	idle: '#EAB308',
	resumed: '#22C55E'
} as const;

const LEGEND_CHIP_CLASS = 'gap-1.5 rounded-full px-3 font-normal text-foreground';

type GroupBy = 'daily' | 'weekly' | 'monthly';

interface TooltipProps {
	active?: boolean;
	payload?: {
		name: string;
		value: number;
		color: string;
	}[];
	label?: string;
}

const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
	if (active && payload && payload.length) {
		return (
			<div className="rounded-lg bg-popover px-3 py-2 text-popover-foreground hairline-ring ring-border shadow-md shadow-black/6.5">
				<p className="mb-1 text-xs text-muted-foreground">{label}</p>
				{payload.map((item) => (
					<p key={item.name} className="flex gap-2 items-center text-xs tabular-nums">
						<span className="size-2 rounded-full" style={{ backgroundColor: item.color }}></span>
						{item.name.charAt(0).toUpperCase() + item.name.slice(1)}: {Math.round(item.value * 100) / 100}h
					</p>
				))}
			</div>
		);
	}
	return null;
};

interface TeamStatsChartProps {
	rapportChartActivity: ITimeLogReportDailyChart[];
	isLoading: boolean;
}

export function TeamStatsChart({ rapportChartActivity, isLoading }: TeamStatsChartProps) {
	const t = useTranslations();
	const [visibleLines, setVisibleLines] = useState({
		tracked: true,
		manual: true,
		idle: true,
		resumed: true
	});
	const [groupBy, setGroupBy] = useState<GroupBy>('daily');

	const toggleLine = (line: keyof typeof visibleLines) => {
		setVisibleLines((prev) => ({
			...prev,
			[line]: !prev[line]
		}));
	};

	const groupData = (data: ITimeLogReportDailyChart[], grouping: GroupBy) => {
		if (grouping === 'daily') return data;

		const groups: { [key: string]: any } = {};

		data.forEach((item) => {
			const date = new Date(item.date);
			let groupKey: string;

			if (grouping === 'weekly') {
				groupKey = format(startOfWeek(date), 'MMM. dd yyyy');
			} else {
				groupKey = format(startOfMonth(date), 'MMM. yyyy');
			}

			if (!groups[groupKey]) {
				groups[groupKey] = {
					date: groupKey,
					tracked: 0,
					manual: 0,
					idle: 0,
					resumed: 0,
					count: 0
				};
			}

			groups[groupKey].tracked += item.value.TRACKED || 0;
			groups[groupKey].manual += item.value.MANUAL || 0;
			groups[groupKey].idle += item.value.IDLE || 0;
			groups[groupKey].resumed += item.value.RESUMED || 0;
			groups[groupKey].count += 1;
		});

		return Object.values(groups).map((group: any) => ({
			date: group.date,
			tracked: group.tracked / group.count,
			manual: group.manual / group.count,
			idle: group.idle / group.count,
			resumed: group.resumed / group.count
		}));
	};

	const formattedData = useMemo(() => {
		const rawData =
			rapportChartActivity?.map((item: ITimeLogReportDailyChart) => ({
				...item,
				date: format(new Date(item.date), 'MMM. dd yyyy'),
				tracked: item.value.TRACKED || 0,
				manual: item.value.MANUAL || 0,
				idle: item.value.IDLE || 0,
				resumed: item.value.RESUMED || 0
			})) || [];

		return groupData(rawData, groupBy);
	}, [rapportChartActivity, groupBy]);

	if (isLoading) {
		return (
			<div className="flex justify-center items-center h-[300px]">
				<Spinner />
			</div>
		);
	}

	return (
		<div className="flex flex-col p-4 w-full">
			<div className="mb-2 flex justify-end">
				<SegmentedControl
					items={[
						{ value: 'daily', label: t('dashboard.DAILY') },
						{ value: 'weekly', label: t('dashboard.WEEKLY') },
						{ value: 'monthly', label: t('dashboard.MONTHLY') }
					]}
					value={groupBy}
					onValueChange={setGroupBy}
					ariaLabel={t('common.GROUP_BY')}
				/>
			</div>
			<div className="w-full  h-[300px]">
				<ResponsiveContainer width="100%" height="85%">
					<LineChart data={formattedData} margin={{ top: 5, right: 25, bottom: 15, left: 0 }}>
						<CartesianGrid
							strokeDasharray="3 3"
							horizontal={true}
							vertical={false}
							stroke="rgba(156, 163, 175, 0.2)"
						/>
						<XAxis
							dataKey="date"
							stroke="#888888"
							fontSize={10}
							tickLine={false}
							axisLine={false}
							padding={{ left: 10, right: 10 }}
							interval={'preserveStartEnd'}
							tick={{ fill: '#888888', fontSize: 10 }}
							height={35}
						/>
						<YAxis
							stroke="#888888"
							fontSize={10}
							tickLine={false}
							axisLine={false}
							tickFormatter={(value) => `${Math.round(value)}h`}
							padding={{ top: 5, bottom: 5 }}
							tick={{ fill: '#888888', fontSize: 10 }}
							tickCount={4}
							width={25}
						/>
						<ReferenceLine
							y={8}
							stroke="rgba(156, 163, 175, 0.2)"
							strokeDasharray="3 3"
							label={{
								value: '8h',
								position: 'right',
								fill: '#888888',
								fontSize: 10
							}}
						/>
						<Tooltip
							content={<CustomTooltip />}
							cursor={{ stroke: 'rgba(156, 163, 175, 0.2)', strokeWidth: 1, strokeDasharray: '3 3' }}
						/>
						{visibleLines.tracked && (
							<Line
								type="monotone"
								dataKey="tracked"
								stroke={SERIES_COLORS.tracked}
								strokeWidth={1.5}
								dot={{ r: 1.5, fill: SERIES_COLORS.tracked }}
								activeDot={{ r: 2.5, fill: SERIES_COLORS.tracked }}
							/>
						)}
						{visibleLines.manual && (
							<Line
								type="monotone"
								dataKey="manual"
								stroke={SERIES_COLORS.manual}
								strokeWidth={1.5}
								dot={{ r: 1.5, fill: SERIES_COLORS.manual }}
								activeDot={{ r: 2.5, fill: SERIES_COLORS.manual }}
							/>
						)}
						{visibleLines.idle && (
							<Line
								type="monotone"
								dataKey="idle"
								stroke={SERIES_COLORS.idle}
								strokeWidth={1.5}
								dot={{ r: 1.5, fill: SERIES_COLORS.idle }}
								activeDot={{ r: 2.5, fill: SERIES_COLORS.idle }}
							/>
						)}
						{visibleLines.resumed && (
							<Line
								type="monotone"
								dataKey="resumed"
								stroke={SERIES_COLORS.resumed}
								strokeWidth={1.5}
								dot={{ r: 1.5, fill: SERIES_COLORS.resumed }}
								activeDot={{ r: 2.5, fill: SERIES_COLORS.resumed }}
							/>
						)}
					</LineChart>
				</ResponsiveContainer>
				<div className="flex gap-2 justify-center mt-4">
					<Button
						size={'sm'}
						variant="outline"
						className={cn(LEGEND_CHIP_CLASS, !visibleLines.tracked && 'line-through opacity-50')}
						onClick={() => toggleLine('tracked')}
					>
						<span
							aria-hidden="true"
							className="size-2 rounded-full"
							style={{ backgroundColor: SERIES_COLORS.tracked }}
						/>
						{t('common.teamStats.TRACKED')}
					</Button>
					<Button
						size={'sm'}
						variant="outline"
						className={cn(LEGEND_CHIP_CLASS, !visibleLines.manual && 'line-through opacity-50')}
						onClick={() => toggleLine('manual')}
					>
						<span
							aria-hidden="true"
							className="size-2 rounded-full"
							style={{ backgroundColor: SERIES_COLORS.manual }}
						/>
						{t('common.teamStats.MANUAL')}
					</Button>
					<Button
						size={'sm'}
						variant="outline"
						className={cn(LEGEND_CHIP_CLASS, !visibleLines.idle && 'line-through opacity-50')}
						onClick={() => toggleLine('idle')}
					>
						<span
							aria-hidden="true"
							className="size-2 rounded-full"
							style={{ backgroundColor: SERIES_COLORS.idle }}
						/>
						{t('common.teamStats.IDLE')}
					</Button>
					<Button
						size={'sm'}
						variant="outline"
						className={cn(LEGEND_CHIP_CLASS, !visibleLines.resumed && 'line-through opacity-50')}
						onClick={() => toggleLine('resumed')}
					>
						<span
							aria-hidden="true"
							className="size-2 rounded-full"
							style={{ backgroundColor: SERIES_COLORS.resumed }}
						/>
						{t('common.teamStats.RESUMED')}
					</Button>
				</div>
			</div>
		</div>
	);
}
