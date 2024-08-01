'use client';

import { useTimeLogs } from '@app/hooks/features/useTimeLogs';
import { useEffect, useState } from 'react';
import { CalendarDatum, ResponsiveCalendar } from '@nivo/calendar';
import Skeleton from 'react-loading-skeleton';
import moment from 'moment';

export function ActivityCalendar() {
	const { timerLogsDailyReport, timerLogsDailyReportLoading } = useTimeLogs();
	const [calendarData, setCalendarData] = useState<CalendarDatum[]>([]);

	useEffect(() => {
		setCalendarData(
			timerLogsDailyReport.map((el) => ({ value: Number((el.sum / 3600).toPrecision(2)), day: el.date }))
		);
	}, [timerLogsDailyReport]);

	return (
		<div className=" h-40 w-full flex items-center justify-center overflow-y-hidden overflow-x-auto">
			{timerLogsDailyReportLoading ? (
				<ActivityCalendarSkeleton />
			) : (
				<ResponsiveCalendar
					data={calendarData}
					from={moment().startOf('year').toDate()}
					to={moment().startOf('year').toDate()}
					emptyColor="#ffffff"
					colors={['#D5D8F6', '#ACB2EC', '#838DE2', '#5B67D7', '#3343CC']}
					yearSpacing={40}
					monthBorderWidth={0}
					dayBorderWidth={0}
					daySpacing={2}
					monthLegendPosition="before"
					margin={{ top: 25, right: 5, bottom: 10, left: 5 }}
					legends={[
						{
							anchor: 'bottom-right',
							direction: 'row',
							translateY: 36,
							itemCount: 4,
							itemWidth: 42,
							itemHeight: 36,
							itemsSpacing: 14,
							itemDirection: 'right-to-left'
						}
					]}
					monthSpacing={20}
					monthLegend={(_, __, d) => d.toLocaleString('en-US', { month: 'short' })}
				/>
			)}
		</div>
	);
}

// Skeletons
function ActivityCalendarSkeleton() {
	const { innerWidth: deviceWith } = window;

	const skeletons = Array.from(Array(12));

	return (
		<div className="w-full overflow-hidden flex h-32 items-center justify-around">
			{skeletons.map((_, index) => (
				<Skeleton
					key={index}
					width={(deviceWith - (deviceWith * 10) / 100) / 12}
					className=" dark:bg-transparent h-32"
				/>
			))}
		</div>
	);
}
