'use client';

import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart as RechartRadarChart } from 'recharts';
import { ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '../chart';
import { IChartProps } from '@ever-teams/toolkit-types';
import { ChartContainer } from '../chart-container';
import React from 'react';
import { generateRandomColors } from '@ever-teams/toolkit-ui';

const RadarChart: React.FC<IChartProps> = ({ color, data, config, title, description, footer }) => {
	const hasData = data.length > 0;
	const colors = color && hasData ? generateRandomColors(color, Object.keys(data[0]).length) : '';

	return (
		<ChartContainer config={config} title={title} description={description} footer={footer}>
			<RechartRadarChart data={data}>
				<ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />

				<ChartLegend
					className="w-full flex flex-wrap justify-center items-center"
					content={<ChartLegendContent />}
				/>
				<PolarGrid gridType="circle" strokeOpacity={0.3} />
				<PolarAngleAxis dataKey={hasData ? Object.keys(data[0])[0] : ''} />
				<PolarRadiusAxis angle={90} domain={[0, 10]} tickLine={false} tick={false} />

				{hasData &&
					Object.keys(data[0]).map((item, index) => {
						return index !== 0 && <Radar key={index} dataKey={item} fill={colors[index - 1]} radius={5} />;
					})}
			</RechartRadarChart>
		</ChartContainer>
	);
};

RadarChart.displayName = 'RadarChart';

export { RadarChart };
