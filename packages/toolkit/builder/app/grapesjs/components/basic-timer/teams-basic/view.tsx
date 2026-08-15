import React from 'react';
import { renderReactComponentDynamic } from '../../../render';
import { TeamsBasicWrapper } from './component';
import { ComponentView, ComponentModel } from '../../../types';

type BackgroundType = 'primary' | 'secondary' | 'destructive';
type RoundedType = 'none' | 'small' | 'medium' | 'large';
type ColorType = 'primary' | 'secondary' | 'destructive';
type BorderType = 'none' | 'thick' | 'thin';

export const teamsBasicView: Partial<ComponentView> = {
	tagName: 'div',

	onRender({ el, model }: { el: HTMLElement; model: ComponentModel }) {
		if (!el) return;

		const container = document.createElement('div');
		container.className = 'basic-ever-container';
		el.innerHTML = '';
		el.appendChild(container);

		// Add data attributes for export parsing
		el.setAttribute('data-component', 'TeamsEssentialTimer');
		el.setAttribute('data-progress', String(model.get('progress') || false));
		el.setAttribute('data-background', model.get('background') || 'primary');
		el.setAttribute('data-rounded', model.get('rounded') || 'large');
		el.setAttribute('data-color', model.get('color') || 'secondary');
		el.setAttribute('data-icon', String(model.get('icon') || false));
		el.setAttribute('data-border', model.get('border') || 'thick');
		el.setAttribute('data-readonly', String(model.get('readonly') || false));

		const props = {
			readonly: Boolean(model.get<boolean>('readonly')),
			progress: Boolean(model.get<boolean>('progress')),
			background: model.get<BackgroundType>('background') || 'primary',
			rounded: model.get<RoundedType>('rounded') || 'large',
			color: model.get<ColorType>('color') || 'secondary',
			icon: Boolean(model.get<boolean>('icon')),
			border: model.get<BorderType>('border') || 'thick'
		};

		renderReactComponentDynamic(<TeamsBasicWrapper {...props} />, container);
	}
};
