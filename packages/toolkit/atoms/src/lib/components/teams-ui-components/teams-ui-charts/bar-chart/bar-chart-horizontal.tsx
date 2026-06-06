'use client';

import { Bar, BarChart as RechartBarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '../chart';
import React from 'react';
import { IChartProps } from '@ever-teams/toolkit-types';
import { ChartContainer } from '../chart-container';
import { generateRandomColors } from '@ever-teams/toolkit-ui';

const BarChartHorizontal: React.FC<IChartProps> = ({
	data = [],
	config,
	title,
	description,
	footer,
	color = 'black',
	layout = 'vertical'
}) => {
	// Ensure that data[0] exists before trying to access its keys
	const hasData = data.length > 0;
	const colors = color && hasData ? generateRandomColors(color, Object.keys(data[0]).length) : '';

	return (
		<ChartContainer title={title} description={description} footer={footer} config={config}>
			<RechartBarChart
				accessibilityLayer
				data={data}
				layout={layout}
				margin={{
					left: -20
				}}
			>
				<CartesianGrid strokeOpacity={0.3} vertical={true} horizontal={false} />
				<XAxis
					dataKey={hasData ? Object.keys(data[0])[1] : ''}
					tickLine={false}
					axisLine={false}
					domain={[0, 10]}
					ticks={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
					type="number"
					tickFormatter={(value) => `${value}:00`}
				/>

				<YAxis
					dataKey={hasData ? Object.keys(data[0])[0] : ''}
					type="category"
					tickLine={false}
					axisLine={false}
					tickFormatter={(value) => value.split('-')[2] + '/' + value.split('-')[1]}
				/>

				<ChartLegend
					className="w-full flex flex-wrap justify-center items-center"
					content={<ChartLegendContent />}
				/>
				<ChartTooltip cursor={true} content={<ChartTooltipContent hideLabel={true} indicator={'dot'} />} />
				{/* Render bars only if data[0] has more than 1 key */}
				{/* Below loop is used for many employees */}
				{hasData &&
					Object.keys(data[0]).map((item, index) => {
						return (
							index !== 0 && (
								<Bar
									className="min-w-5"
									key={index}
									dataKey={item}
									fill={colors[index - 1]}
									radius={5}
								/>
							)
						);
					})}
			</RechartBarChart>
		</ChartContainer>
	);
};

export { BarChartHorizontal };
