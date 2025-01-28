'use client';

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
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
			<div className="p-4 bg-white rounded-lg border shadow-lg">
				<p className="mb-2 font-medium">{label}</p>
				{payload.map((item, index) => (
					<p key={index} className="text-sm" style={{ color: item.color }}>
						{item.name}: {Math.round(item.value * 100) / 100}
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
	const [groupBy, setGroupBy] = useState<GroupBy>('daily');

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
		const rawData = rapportChartActivity?.map((item: ITimerDailyLog) => ({
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
			<div className="flex justify-center items-center h-[250px]">
				<Spinner />
			</div>
		);
	}

	return (
		<div className="flex flex-col">
			<div className="flex gap-2 justify-end mb-4">
				<Button
					size="sm"
					variant={groupBy === 'daily' ? 'default' : 'outline'}
					onClick={() => setGroupBy('daily')}
					className="text-xs"
				>
					Daily
				</Button>
				<Button
					size="sm"
					variant={groupBy === 'weekly' ? 'default' : 'outline'}
					onClick={() => setGroupBy('weekly')}
					className="text-xs"
				>
					Weekly
				</Button>
				<Button
					size="sm"
					variant={groupBy === 'monthly' ? 'default' : 'outline'}
					onClick={() => setGroupBy('monthly')}
					className="text-xs"
				>
					Monthly
				</Button>
			</div>
			<div className="h-[250px] w-full">
				<ResponsiveContainer width="100%" height="100%">
					<LineChart data={formattedData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
						<CartesianGrid
							strokeDasharray="3 3"
							horizontal={true}
							className="stroke-gray-200 dark:stroke-gray-700"
							vertical={true}
						/>
						<XAxis
							dataKey="date"
							stroke="#888888"
							fontSize={12}
							tickLine={false}
							axisLine={false}
							padding={{ left: 10, right: 10 }}
							interval={0}
							tick={{ dy: 10 }}
							height={50}
						/>
						<YAxis
							stroke="#888888"
							fontSize={12}
							tickLine={false}
							axisLine={false}
							tickFormatter={(value) => `${Math.round(value * 100) / 100}`}
							padding={{ top: 10, bottom: 10 }}
							tickCount={8}
						/>
						<Tooltip content={<CustomTooltip />} />
						{visibleLines.tracked && (
							<Line
								type="monotone"
								dataKey="tracked"
								stroke="#2563eb"
								strokeWidth={2}
								dot={{ fill: '#2563eb', r: 4 }}
								activeDot={{ r: 6, fill: '#2563eb' }}
							/>
						)}
						{visibleLines.manual && (
							<Line
								type="monotone"
								dataKey="manual"
								stroke="#dc2626"
								strokeWidth={2}
								dot={{ fill: '#dc2626', r: 4 }}
								activeDot={{ r: 6, fill: '#dc2626' }}
							/>
						)}
						{visibleLines.idle && (
							<Line
								type="monotone"
								dataKey="idle"
								stroke="#eab308"
								strokeWidth={2}
								dot={{ fill: '#eab308', r: 4 }}
								activeDot={{ r: 6, fill: '#eab308' }}
							/>
						)}
						{visibleLines.resumed && (
							<Line
								type="monotone"
								dataKey="resumed"
								stroke="#34c759"
								strokeWidth={2}
								dot={{ fill: '#34c759', r: 4 }}
								activeDot={{ r: 6, fill: '#34c759' }}
							/>
						)}
					</LineChart>
				</ResponsiveContainer>
			</div>
			<div className="flex gap-3 justify-center mt-4">
				<Button
					size="sm"
					variant="outline"
					className={`gap-2 px-3 py-1.5 h-8 text-xs font-normal hover:bg-transparent ${!visibleLines.tracked ? 'line-through' : ''}`}
					onClick={() => toggleLine('tracked')}
				>
					<div className="w-2 h-2 bg-blue-500 rounded-full" />
					Tracked
				</Button>
				<Button
					size="sm"
					variant="outline"
					className={`gap-2 px-3 py-1.5 h-8 text-xs font-normal hover:bg-transparent ${!visibleLines.manual ? 'line-through' : ''}`}
					onClick={() => toggleLine('manual')}
				>
					<div className="w-2 h-2 bg-red-500 rounded-full" />
					Manual
				</Button>
				<Button
					size="sm"
					variant="outline"
					className={`gap-2 px-3 py-1.5 h-8 text-xs font-normal hover:bg-transparent ${!visibleLines.idle ? 'line-through' : ''}`}
					onClick={() => toggleLine('idle')}
				>
					<div className="w-2 h-2 bg-yellow-500 rounded-full" />
					Idle
				</Button>
				<Button
					size="sm"
					variant="outline"
					className={`gap-2 px-3 py-1.5 h-8 text-xs font-normal hover:bg-transparent ${!visibleLines.resumed ? 'line-through' : ''}`}
					onClick={() => toggleLine('resumed')}
				>
					<div className="w-2 h-2 bg-green-500 rounded-full" />
					Resumed
				</Button>
			</div>
		</div>
	);
}
