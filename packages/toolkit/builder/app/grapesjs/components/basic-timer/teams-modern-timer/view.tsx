import React from 'react';
import { renderReactComponentDynamic } from '../../../render';
import { ModernTeamsWrapper } from './component';
import { ComponentView, ComponentModel } from '../../../types';

export const modernTimerView: Partial<ComponentView> = {
	tagName: 'div',

	onRender({ el, model }: { el: HTMLElement; model: ComponentModel }) {
		if (!el) return;

		const container = document.createElement('div');
		container.className = 'modern-ever-container';
		el.innerHTML = '';
		el.appendChild(container);

		const variant = model.get<'default' | 'bordered'>('variant');
		const size = model.get<'default' | 'sm'>('size') || 'default';
		const expandable = model.get<boolean>('expandable') ?? true;
		const showProgress = Boolean(model.get<boolean>('showProgress'));

		// Add data attributes for export parsing
		el.setAttribute('data-component', 'TeamsModernTimer');
		el.setAttribute('data-variant', variant || 'default');
		el.setAttribute('data-size', size);
		el.setAttribute('data-expandable', String(expandable));
		el.setAttribute('data-show-progress', String(showProgress));

		const props = {
			readonly: Boolean(model.get<boolean>('readonly')),
			separator: model.get<string>('separator') || ':',
			expandable,
			showProgress,
			size,
			variant: variant === 'bordered' ? null : ('default' as const),
			className: `modern-teams-wrapper ${variant === 'bordered' ? 'border-2' : ''}`
		};

		renderReactComponentDynamic(<ModernTeamsWrapper {...props} />, container);
	}
};
