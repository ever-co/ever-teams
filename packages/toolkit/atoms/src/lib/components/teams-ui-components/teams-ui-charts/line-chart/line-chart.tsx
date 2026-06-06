'use client';

import { CartesianGrid, Line, LineChart as RechartLineChart, XAxis, YAxis } from 'recharts';
import { ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '../chart';
import { IChartProps } from '@ever-teams/toolkit-types';
import { ChartContainer } from '../chart-container';
import { generateRandomColors } from '@ever-teams/toolkit-ui';

const LineChart: React.FC<IChartProps> = ({ color, data, config, title, description, footer }) => {
	const hasData = data.length > 0;
	const colors = color && hasData ? generateRandomColors(color, Object.keys(data[0]).length) : '';

	return (
		<ChartContainer title={title} description={description} footer={footer} config={config}>
			<RechartLineChart
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
				<ChartLegend
					className="w-full flex flex-wrap justify-center items-center"
					content={<ChartLegendContent />}
				/>
				<XAxis
					dataKey={hasData ? Object.keys(data[0])[0] : ''}
					tickLine={false}
					axisLine={false}
					tickMargin={8}
					minTickGap={32}
					tickFormatter={(value) => value.split('-')[2] + '/' + value.split('-')[1]}
				/>
				<ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
				{/* <Line
							dataKey="desktop"
							type="natural"
							stroke="var(--color-desktop)"
							strokeWidth={2}
							dot={false}
						/> */}
				{hasData &&
					Object.keys(data[0]).map((item, index) => {
						return (
							index !== 0 && (
								<Line
									dataKey={item}
									stroke={colors[index - 1]}
									type="bump"
									// type="linear"
									strokeWidth={1}
									dot={true}
									key={index}
								>
									{/* <LabelList
										position="top"
										offset={12}
										className="fill-foreground"
										fontSize={12}
										content={<ChartCustomLabel width={3} x={3} y={5} />}
									/> */}
								</Line>
							)
						);
					})}
			</RechartLineChart>
		</ChartContainer>
	);
};
LineChart.displayName = 'LineChart';
export { LineChart };
