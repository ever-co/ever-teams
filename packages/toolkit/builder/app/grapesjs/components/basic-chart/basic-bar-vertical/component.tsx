import React, { forwardRef } from 'react';
import { TeamsChart } from '@ever-teams/atoms';
import { IChartProps } from '@ever-teams/toolkit-types';
import { ThemeUIProvider } from 'theme-ui';
import { TeamsProvider, defaultTheme } from '@ever-teams/atoms';
import { ChartType } from '../../../types';

export const BasicBarVertical = forwardRef<HTMLDivElement, Partial<IChartProps>>((props, ref) => {
	const defaultProps = {
		type: 'bar-horizontal' as ChartType,
		data: props.data || []
	};

	return (
		<div ref={ref}>
			<ThemeUIProvider theme={defaultTheme}>
				<TeamsProvider>
					<TeamsChart {...defaultProps} />
				</TeamsProvider>
			</ThemeUIProvider>
		</div>
	);
});

BasicBarVertical.displayName = 'BasicBarVertical';
