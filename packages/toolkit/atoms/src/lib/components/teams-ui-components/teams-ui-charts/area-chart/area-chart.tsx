'use client';

import { Area, AreaChart as RechartAreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';

import { ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '../chart';
import { IChartProps } from '@ever-teams/toolkit-types';
import { ChartContainer } from '../chart-container';
import { generateRandomColors } from '@ever-teams/toolkit-ui';
const AreaChart: React.FC<IChartProps> = ({ color, data, config, title, description, footer }) => {
	const hasData = data.length > 0;
	const colors = color && hasData ? generateRandomColors(color, Object.keys(data[0]).length - 1) : '';

	return (
		<ChartContainer title={title} description={description} footer={footer} config={config}>
			<RechartAreaChart
				accessibilityLayer
				data={data}
				margin={{
					left: 12,
					right: 12
				}}
			>
				<CartesianGrid strokeOpacity={0.3} vertical={false} horizontal={true} />
				<YAxis
					tickLine={false}
					axisLine={false}
					domain={[0, 10]}
					ticks={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
					type="number"
					tickFormatter={(v) => `${v}:00`}
				/>
				<XAxis
					dataKey={hasData ? Object.keys(data[0])[0] : ''}
					tickLine={false}
					axisLine={false}
					tickMargin={8}
					minTickGap={32}
					tickFormatter={(value) => value.split('-')[2] + '/' + value.split('-')[1]}
				/>
				<ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />

				{hasData &&
					Object.keys(data[0]).map((item, index) => {
						return (
							index !== 0 && (
								<Area
									key={index}
									dataKey={item}
									stroke={colors[index - 1]}
									strokeWidth={2}
									dot={false}
									type="natural"
									fill={colors[index - 1]}
									fillOpacity={0.2}
									stackId="a"
								>
									{/* <LabelList position="top" offset={12} className="fill-foreground" fontSize={12} /> */}
									{/* <LabelList
										position="top"
										offset={12}
										className="fill-foreground"
										fontSize={12}
										content={<ChartCustomLabel width={3} x={3} y={5} />}
									/> */}
								</Area>
							)
						);
					})}
				<ChartLegend
					className="w-full flex flex-wrap justify-center items-center"
					content={<ChartLegendContent />}
				/>
			</RechartAreaChart>
		</ChartContainer>
	);
};

export { AreaChart };
