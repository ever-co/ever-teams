'use client';

import { useTimeLogs } from '@app/hooks/features/useTimeLogs';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { CalendarDatum, ResponsiveCalendar } from '@nivo/calendar';
import Skeleton from 'react-loading-skeleton';
import moment from 'moment';
import Separator from '@components/ui/separator';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

export function ActivityCalendar() {
	const { timerLogsDailyReport, timerLogsDailyReportLoading } = useTimeLogs();
	const [calendarData, setCalendarData] = useState<CalendarDatum[]>([]);
	useEffect(() => {
		setCalendarData(
			timerLogsDailyReport.map((el) => ({ value: Number((el.sum / 3600).toPrecision(2)), day: el.date }))
		);
	}, [timerLogsDailyReport]);

	const colorRange = [
		'#9370DB',
		'#6A5ACD',
		'#4169E1',
		'#0000FF',
		'#1E90FF',
		'#87CEEB',
		'#FFA500',
		'#FF8C00',
		'#FF4500',
		'#FF0000'
	];

	return (
		<div className="h-[650px] w-full flex items-center justify-center overflow-y-hidden overflow-x-auto">
			{timerLogsDailyReportLoading ? (
				<ActivityCalendarSkeleton />
			) : (
				<div className="flex flex-col w-full h-full">
					<ActivityLegend />
					<div className="w-full h-80">
						<ResponsiveCalendar
							tooltip={(value) => (
								<div className="flex items-center mb-2">
									<span
										className="inline-block w-4 h-4 mr-2"
										style={{ backgroundColor: value.color }}
									></span>
									<span className={`text-[14px] font-semibold dark:!text-primary-xlight`}>
										{value.day}
									</span>
								</div>
							)}
							yearLegend={(value) => value}
							data={calendarData}
							from={moment().startOf('year').toDate()}
							to={moment().startOf('year').toDate()}
							emptyColor="#ffffff"
							colors={colorRange}
							yearSpacing={40}
							monthBorderWidth={0}
							dayBorderWidth={0}
							daySpacing={2}
							monthLegendPosition="before"
							margin={{ top: 0, right: 5, bottom: 0, left: 5 }}
							legends={[
								{
									anchor: 'bottom-right',
									direction: 'row',
									translateY: 36,
									itemCount: 4,
									itemWidth: 70,
									itemHeight: 20,
									itemsSpacing: 14,
									itemDirection: 'left-to-right',
									symbolSize: 20,
									data: [
										{ color: '#9370DB', label: '0 - 4 Hours', id: 'legend-purple' },
										{ color: '#0000FF', label: '4 - 10 Hours', id: 'legend-blue' },
										{ color: '#FFA500', label: '10 - 18 Hours', id: 'legend-orange' },
										{ color: '#FF0000', label: '18 - 24 Hours', id: 'legend-red' }
									]
								}
							]}
							monthSpacing={20}
							monthLegend={(year, month) => {
								return new Date(year, month).toLocaleString('en-US', { month: 'short' });
							}}
							theme={{
								labels: {
									text: {
										fill: '#9ca3af',
										fontSize: 16,
										font: 'icon',
										animation: 'ease',
										border: '12'
									}
								}
							}}
						/>
					</div>
				</div>
			)}
		</div>
	);
}

// Skeletons
function ActivityCalendarSkeleton() {
	const { innerWidth: deviceWith } = window;

	const skeletons = Array.from(Array(12));

	return (
		<div className="flex items-center justify-around w-full h-32 overflow-hidden">
			{skeletons.map((_, index) => (
				<Skeleton
					key={index}
					width={(deviceWith - (deviceWith * 10) / 100) / 12}
					className="h-32 dark:bg-transparent"
				/>
			))}
		</div>
	);
}

function ActivityLegend() {
	const t = useTranslations();

	const data = useMemo(
		() => [
			{ color: '#FFFFFF', label: t('common.NOT_HOURS_WORKED') },
			{
				color: '#9370DB',
				label: `0 - 4 ${t('common.HOURS')}`
			},
			{
				color: '#0000FF',
				label: `4 - 10 ${t('common.HOURS')}`
			},
			{
				color: '#FFA500',
				label: `10 - 18 ${t('common.HOURS')}`
			},
			{
				color: '#FF4500',
				label: `18 - 24 ${t('common.HOURS')}`
			}
		],
		[t]
	);
	return (
		<div className="flex w-full flex-wrap items-center gap-3 justify-start !border p-1 bg-white dark:bg-dark--theme-light rounded-lg shadow shadow-slate-50 dark:shadow-slate-700 space-x-3 px-3 max-w-[100svw] min-w-fit">
			<h3 className=" text-lg font-bold">{t('common.LEGEND')}</h3>
			{data.map((item, index) => (
				<Fragment key={index}>
					<Separator className="!w-fit" />
					<div className="flex items-center" id={`legend-${item.color.slice(1)}`}>
						<span
							className={cn('inline-block w-4 h-4 mr-2', item.color == '#FFFFFF' && 'border')}
							style={{ backgroundColor: item.color }}
						></span>
						<span className="text-nowrap">{item.label}</span>
					</div>
				</Fragment>
			))}
		</div>
	);
}
