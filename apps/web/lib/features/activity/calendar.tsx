'use client';
import { ResponsiveCalendar } from '@nivo/calendar';

const data = [
	{ value: 23, day: '2024-01-01' },
	{ value: 78, day: '2024-01-15' },
	{ value: 41, day: '2024-02-05' },
	{ value: 60, day: '2024-02-20' },
	{ value: 12, day: '2024-03-10' },
	{ value: 87, day: '2024-03-25' },
	{ value: 35, day: '2024-04-05' },
	{ value: 94, day: '2024-04-20' },
	{ value: 17, day: '2024-05-01' },
	{ value: 68, day: '2024-05-15' },
	{ value: 52, day: '2024-06-05' },
	{ value: 81, day: '2024-06-20' },
	{ value: 29, day: '2024-07-10' },
	{ value: 73, day: '2024-07-25' },
	{ value: 45, day: '2024-08-05' },
	{ value: 88, day: '2024-08-20' },
	{ value: 8, day: '2024-09-01' },
	{ value: 57, day: '2024-09-15' },
	{ value: 63, day: '2024-10-05' },
	{ value: 37, day: '2024-10-20' },
	{ value: 91, day: '2024-11-10' },
	{ value: 19, day: '2024-11-25' },
	{ value: 74, day: '2024-12-05' },
	{ value: 5, day: '2024-12-20' },
	{ value: 23, day: '2024-01-01' }
	// Add more objects as needed
];

export function ActivityCalendar() {
	return (
		<div className=" h-40 w-full text-red-700">
			<ResponsiveCalendar
				data={data}
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
