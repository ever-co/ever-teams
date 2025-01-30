'use client';

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, ReferenceLine } from 'recharts';
import { Button } from '@/components/ui/button';
import { ITimerDailyLog } from '@/app/interfaces/timer/ITimerLog';
import { useState, useMemo } from 'react';
import { Spinner } from '@/components/ui/loaders/spinner';
import { format, startOfWeek, startOfMonth } from 'date-fns';

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
			<div className="p-3 bg-[#ffff] dark:bg-[#2D2F31] rounded border border-gray-200 dark:border-gray-700 shadow-lg">
				<p className="mb-1 text-xs text-gray-400">{label}</p>
				{payload.map((item, index) => (
					<p key={index} className="flex gap-2 items-center text-xs" style={{ color: item.color }}>
						<span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></span>
						{item.name.charAt(0).toUpperCase() + item.name.slice(1)}: {Math.round(item.value * 100) / 100}h
					</p>
				))}
			</div>
		);
	}
	return null;
};

interface TeamStatsChartProps {
	rapportChartActivity: ITimerDailyLog[];
	isLoading: boolean;
}

export function TeamStatsChart({ rapportChartActivity, isLoading }: TeamStatsChartProps) {
	const [visibleLines, setVisibleLines] = useState({
		tracked: true,
		manual: true,
		idle: true,
		resumed: true
	});
	const [groupBy,setGroupBy] = useState<GroupBy>('daily');

	const toggleLine = (line: keyof typeof visibleLines) => {
		setVisibleLines((prev) => ({
			...prev,
			[line]: !prev[line]
		}));
	};

	const groupData = (data: ITimerDailyLog[], grouping: GroupBy) => {
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
			rapportChartActivity?.map((item: ITimerDailyLog) => ({
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
			<div className="flex justify-center items-center h-[300px] dark:bg-dark--theme-light">
				<Spinner />
			</div>
		);
	}

	return (
		<div className="flex flex-col p-4 w-full bg-white rounded-lg dark:bg-dark--theme-light">
			<div className="flex gap-2 justify-end mb-2">
				<Button
					size="sm"
					variant={groupBy === 'daily' ? 'default' : 'outline'}
					onClick={() => setGroupBy('daily')}
					className="px-3 h-8 text-xs"
				>
					Daily
				</Button>
				<Button
					size="sm"
					variant={groupBy === 'weekly' ? 'default' : 'outline'}
					onClick={() => setGroupBy('weekly')}
					className="px-3 h-8 text-xs"
				>
					Weekly
				</Button>
				<Button
					size="sm"
					variant={groupBy === 'monthly' ? 'default' : 'outline'}
					onClick={() => setGroupBy('monthly')}
					className="px-3 h-8 text-xs"
				>
					Monthly
				</Button>
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
								stroke="#0284C7"
								strokeWidth={1.5}
								dot={{ r: 1.5, fill: '#0284C7' }}
								activeDot={{ r: 2.5, fill: '#0284C7' }}
							/>
						)}
						{visibleLines.manual && (
							<Line
								type="monotone"
								dataKey="manual"
								stroke="#DC2626"
								strokeWidth={1.5}
								dot={{ r: 1.5, fill: '#DC2626' }}
								activeDot={{ r: 2.5, fill: '#DC2626' }}
							/>
						)}
						{visibleLines.idle && (
							<Line
								type="monotone"
								dataKey="idle"
								stroke="#EAB308"
								strokeWidth={1.5}
								dot={{ r: 1.5, fill: '#EAB308' }}
								activeDot={{ r: 2.5, fill: '#EAB308' }}
							/>
						)}
						{visibleLines.resumed && (
							<Line
								type="monotone"
								dataKey="resumed"
								stroke="#22C55E"
								strokeWidth={1.5}
								dot={{ r: 1.5, fill: '#22C55E' }}
								activeDot={{ r: 2.5, fill: '#22C55E' }}
							/>
						)}
					</LineChart>
				</ResponsiveContainer>
				<div className="flex gap-2 justify-center mt-4">
					<Button
						size="sm"
						variant="outline"
						className={`gap-2 px-3 py-1.5 h-8 text-xs font-normal hover:bg-transparent ${!visibleLines.tracked ? 'line-through opacity-50' : ''}`}
						onClick={() => toggleLine('tracked')}
					>
						<div className="w-2 h-2 bg-[#0284C7] rounded-full" />
						Tracked
					</Button>
					<Button
						size="sm"
						variant="outline"
						className={`gap-2 px-3 py-1.5 h-8 text-xs font-normal hover:bg-transparent ${!visibleLines.manual ? 'line-through opacity-50' : ''}`}
						onClick={() => toggleLine('manual')}
					>
						<div className="w-2 h-2 bg-[#DC2626] rounded-full" />
						Manual
					</Button>
					<Button
						size="sm"
						variant="outline"
						className={`gap-2 px-3 py-1.5 h-8 text-xs font-normal hover:bg-transparent ${!visibleLines.idle ? 'line-through opacity-50' : ''}`}
						onClick={() => toggleLine('idle')}
					>
						<div className="w-2 h-2 bg-[#EAB308] rounded-full" />
						Idle
					</Button>
					<Button
						size="sm"
						variant="outline"
						className={`gap-2 px-3 py-1.5 h-8 text-xs font-normal hover:bg-transparent ${!visibleLines.resumed ? 'line-through opacity-50' : ''}`}
						onClick={() => toggleLine('resumed')}
					>
						<div className="w-2 h-2 bg-[#22C55E] rounded-full" />
						Resumed
					</Button>
				</div>
			</div>
		</div>
	);
}
