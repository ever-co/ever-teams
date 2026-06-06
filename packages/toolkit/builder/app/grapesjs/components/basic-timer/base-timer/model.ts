import { ComponentDefinition } from '../../../types';
import { timerConfig } from './config';
import { GrapesModel } from '../../../types';

export const timerModel: ComponentDefinition['model'] = {
	defaults: {
		...timerConfig.defaults,
		attributes: {
			...timerConfig.defaults.attributes,
			'data-border': 'thick',
			'data-background': 'primary',
			'data-color': 'secondary',
			'data-rounded': 'large',
			'data-icon': 'false'
		}
	},
	init(this: GrapesModel) {
		if (!this.get('border')) this.set('border', 'thick');
		if (!this.get('background')) this.set('background', 'primary');
		if (!this.get('color')) this.set('color', 'secondary');
		if (!this.get('rounded')) this.set('rounded', 'large');
		if (!this.get('icon')) this.set('icon', false);

		const updateView = () => {
			// Update attributes
			const attributes = {
				'data-border': this.get('border') || 'thick',
				'data-background': this.get('background') || 'primary',
				'data-color': this.get('color') || 'secondary',
				'data-rounded': this.get('rounded') || 'large',
				'data-icon': String(this.get('icon') || false),
				'data-readonly': String(this.get('readonly') || false)
			};

			this.set('attributes', {
				...this.get('attributes'),
				...attributes
			});

			// Update view
			const view = this.getView();
			if (view) {
				view.onRender({ el: view.el, model: this });
			}
		};

		['readonly', 'border', 'background', 'color', 'rounded', 'icon'].forEach((prop) => {
			this.on(`change:${prop}`, updateView);
		});
	},
	handleChanges() {}
};
