import React, { forwardRef } from 'react';
import { TeamsModernTimer } from '@ever-teams/atoms';
import { ThemeUIProvider } from 'theme-ui';
import { TeamsProvider, defaultTheme } from '@ever-teams/atoms';
import { ITeamsModernTimerProps } from '../../../types';

export const ModernTeamsWrapper = forwardRef<HTMLDivElement, Partial<ITeamsModernTimerProps>>((props, ref) => {
	const defaultProps: ITeamsModernTimerProps = {
		separator: props.separator || ':',
		expandable: props.expandable ?? true,
		showProgress: props.showProgress || false,
		size: props.size || 'default',
		variant: props.variant || 'default',
		className: `modern-teams-wrapper ${props.variant === null ? 'border-2' : ''}`
	};

	return (
		<div ref={ref}>
			<ThemeUIProvider theme={defaultTheme}>
				<TeamsProvider>
					<TeamsModernTimer {...defaultProps} />
				</TeamsProvider>
			</ThemeUIProvider>
		</div>
	);
});

ModernTeamsWrapper.displayName = 'ModernTeamsWrapper';
