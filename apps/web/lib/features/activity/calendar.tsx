'use client';

import { useTimeLogs } from '@app/hooks/features/useTimeLogs';
import { ResponsiveCalendar } from '@nivo/calendar';
import { useEffect, useState } from 'react';
import { CalendarDatum } from '@nivo/calendar';

export function ActivityCalendar() {
	const { timerLogsDailyReport } = useTimeLogs();
	const [calendarData, setCalendarData] = useState<CalendarDatum[]>([]);

	useEffect(() => {
		setCalendarData(
			timerLogsDailyReport.map((el) => ({ value: Number((el.sum / 3600).toPrecision(2)), day: el.date }))
		);
	}, [timerLogsDailyReport]);

	return (
		<div className=" h-40 w-full">
			<ResponsiveCalendar
				data={calendarData}
				from="2024-01-01"
				to="2024-12-12"
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
		</div>
	);
}
