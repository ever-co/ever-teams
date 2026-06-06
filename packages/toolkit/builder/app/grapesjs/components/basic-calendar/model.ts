import { ComponentDefinition } from '../../types';
import { basicCalendarConfig } from './config';
import { GrapesModel } from '../../types';

export const calendarModel: ComponentDefinition['model'] = {
	defaults: {
		...basicCalendarConfig.defaults,
		attributes: {
			...basicCalendarConfig.defaults.attributes,
			'data-show-outside-days': 'true'
		}
	},
	init(this: GrapesModel) {
		if (!this.get('showOutsideDays')) this.set('showOutsideDays', true);

		const updateView = () => {
			const attributes = {
				'data-show-outside-days': String(this.get('showOutsideDays') || false)
			};

			this.set('attributes', {
				...this.get('attributes'),
				...attributes
			});

			const view = this.getView();
			if (view) {
				view.onRender({ el: view.el, model: this });
			}
		};

		['showOutsideDays'].forEach((prop) => {
			this.on(`change:${prop}`, updateView);
		});
	},
	handleChanges() {}
};
