import React from 'react';
import { renderReactComponentDynamic } from '../../../render';
import { TeamsButton } from '@ever-teams/atoms';
import { ThemeUIProvider } from 'theme-ui';
import { TeamsProvider, defaultTheme } from '@ever-teams/atoms';
import { ComponentView, ComponentModel } from '../../../types';

export const teamsTimerButtonView: Partial<ComponentView> = {
	tagName: 'div',

	onRender({ el, model }: { el: HTMLElement; model: ComponentModel }) {
		if (!el) return;

		const container = document.createElement('div');
		container.className = 'teams-timer-button-container';
		el.innerHTML = '';
		el.appendChild(container);

		// Add data attributes for export parsing
		el.setAttribute('data-component', 'TeamsButton');
		el.setAttribute('data-size', model.get('size') || 'default');
		el.setAttribute('data-variant', model.get('variant') || 'default');

		const props = {
			size: model.get<'default' | 'sm' | 'lg'>('size') || 'default',
			variant: model.get<'default' | 'bordered'>('variant') || 'default',
			className: `teams-timer-button ${model.get('variant') === 'bordered' ? 'border-2' : ''}`
		};

		renderReactComponentDynamic(
			<ThemeUIProvider theme={defaultTheme}>
				<TeamsProvider>
					<TeamsButton
						isRunning={false}
						startTimer={() => Promise.resolve()}
						stopTimer={() => Promise.resolve()}
						timerLoading={false}
						{...props}
					/>
				</TeamsProvider>
			</ThemeUIProvider>,
			container
		);
	}
};
