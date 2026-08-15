import { ComponentDefinition } from '../../../types';
import { basicDatePickerConfig } from './config';
import { GrapesModel } from '../../../types';

export const datePickerModel: ComponentDefinition['model'] = {
	defaults: {
		...basicDatePickerConfig.defaults,
		attributes: {
			...basicDatePickerConfig.defaults.attributes,
			'data-icon': 'true',
			'data-placeholder': 'Pick a date'
		}
	},
	init(this: GrapesModel) {
		if (!this.get('icon')) this.set('icon', true);
		if (!this.get('placeholder')) this.set('placeholder', 'Pick a date');

		const updateView = () => {
			// Update attributes
			const attributes = {
				'data-icon': String(this.get('icon') || true),
				'data-placeholder': this.get('placeholder') || 'Pick a date'
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

		['icon', 'placeholder'].forEach((prop) => {
			this.on(`change:${prop}`, updateView);
		});
	},
	handleChanges() {}
};
