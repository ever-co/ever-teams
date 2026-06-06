import React, { forwardRef } from 'react';
import { TeamsButton } from '@ever-teams/atoms';
import { ThemeUIProvider } from 'theme-ui';
import { TeamsProvider, defaultTheme } from '@ever-teams/atoms';
import { ITeamsTimerButtonProps } from '../../../types';

export const TeamsTimerButton = forwardRef<HTMLDivElement, Partial<ITeamsTimerButtonProps>>((props, ref) => {
	const defaultProps = {
		size: props.size || 'default',
		variant: props.variant || 'default',
		style: props.style,
		className: `teams-timer-button ${props.variant === 'bordered' ? 'border-2' : ''}`
	};

	return (
		<div ref={ref}>
			<ThemeUIProvider theme={defaultTheme}>
				<TeamsProvider>
					<TeamsButton
						isRunning={false}
						startTimer={() => Promise.resolve()}
						stopTimer={() => Promise.resolve()}
						timerLoading={false}
						{...defaultProps}
					/>
				</TeamsProvider>
			</ThemeUIProvider>
		</div>
	);
});

TeamsTimerButton.displayName = 'TeamsTimerButton';
