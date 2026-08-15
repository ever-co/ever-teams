'use client';

import { RadialBar, RadialBarChart } from 'recharts';

import { ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '../chart';
import { IChartProps } from '@ever-teams/toolkit-types';
import { ChartContainer } from '../chart-container';
import { generateRandomColors } from '@ever-teams/toolkit-ui';

const RadialChart: React.FC<IChartProps> = ({ color, data, config, title, description, footer }) => {
	const hasData = data.length > 0;
	const colors = color && hasData ? generateRandomColors(color, Object.keys(data[0]).length) : '';

	return (
		<ChartContainer title={title} description={description} footer={footer} config={config}>
			<RadialBarChart data={data} innerRadius={30} outerRadius={110}>
				<ChartTooltip cursor={false} content={<ChartTooltipContent />} />

				<ChartLegend
					className="w-full flex flex-wrap justify-center items-center"
					content={<ChartLegendContent />}
				/>

				{hasData &&
					Object.keys(data[0]).map((item, index) => {
						return (
							index !== 0 && (
								<RadialBar
									key={index}
									dataKey={item}
									fill={colors[index - 1]}
									background
									type="bump"
									// type="linear"
									strokeWidth={1}
									radius={15}
									stackId="a"
								>
									{/* <LabelList
											position="top"
											offset={12}
											className="fill-foreground"
											fontSize={12}
											content={<ChartCustomLabel width={3} x={3} y={5} />}
										/> */}
								</RadialBar>
							)
						);
					})}
			</RadialBarChart>
		</ChartContainer>
	);
};

export { RadialChart };
