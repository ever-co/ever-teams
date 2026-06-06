'use client';

import { Pie, PieChart as RechartPieChart } from 'recharts';

import { ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '../chart';
import { IChartProps } from '@ever-teams/toolkit-types';
import { ChartContainer } from '../chart-container';
import { generateRandomColors } from '@ever-teams/toolkit-ui';

const PieChart: React.FC<IChartProps> = ({ data, config, color }) => {
	const hasData = data.length > 0;
	const colors = color && hasData ? generateRandomColors(color, Object.keys(data[0]).length) : '';

	return (
		<ChartContainer config={config}>
			<RechartPieChart>
				<ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />

				<ChartLegend
					className="w-full flex flex-wrap justify-center items-center"
					content={<ChartLegendContent />}
				/>

				<ChartTooltip content={<ChartTooltipContent hideLabel />} />
				<Pie
					data={data}
					fill={colors[0]}
					dataKey={hasData ? Object.keys(data[0])[1] : ''}
					label
					nameKey={hasData ? Object.keys(data[0])[0] : ''}
				/>
			</RechartPieChart>
		</ChartContainer>
	);
};
PieChart.displayName = 'PieChart';
export { PieChart };
