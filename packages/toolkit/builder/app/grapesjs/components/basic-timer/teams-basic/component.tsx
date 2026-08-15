import React, { forwardRef } from 'react';
import { TeamsEssentialTimer } from '@ever-teams/atoms';
import { ThemeUIProvider } from 'theme-ui';
import { TeamsProvider, defaultTheme } from '@ever-teams/atoms';
import { ITeamsEssentialTimerProps } from '../../../types';

export const TeamsBasicWrapper = forwardRef<HTMLDivElement, Partial<ITeamsEssentialTimerProps>>((props, ref) => {
	const defaultProps: ITeamsEssentialTimerProps = {
		readonly: props.readonly || false,
		progress: props.progress || false,
		background: props.background || 'primary',
		rounded: props.rounded || 'large',
		color: props.color || 'secondary',
		icon: props.icon || false,
		border: props.border || 'thick',
		className: 'basic-teams-wrapper'
	};

	return (
		<div ref={ref}>
			<ThemeUIProvider theme={defaultTheme}>
				<TeamsProvider>
					<TeamsEssentialTimer {...defaultProps} />
				</TeamsProvider>
			</ThemeUIProvider>
		</div>
	);
});

TeamsBasicWrapper.displayName = 'TeamsEssentialTimerWrapper';
