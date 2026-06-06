import React, { forwardRef } from 'react';
import { TeamsBasicTimer as BaseTimer } from '@ever-teams/atoms';
import { TeamsBasicTimerProps } from '@ever-teams/atoms';
import { ThemeUIProvider } from 'theme-ui';
import { TeamsProvider, defaultTheme } from '@ever-teams/atoms';

export const TeamsBasicTimer = forwardRef<HTMLDivElement, TeamsBasicTimerProps>((props, ref) => {
	return (
		<div ref={ref}>
			<ThemeUIProvider theme={defaultTheme}>
				<TeamsProvider>
					<BaseTimer {...props} />
				</TeamsProvider>
			</ThemeUIProvider>
		</div>
	);
});

TeamsBasicTimer.displayName = 'TeamsBasicTimer';
