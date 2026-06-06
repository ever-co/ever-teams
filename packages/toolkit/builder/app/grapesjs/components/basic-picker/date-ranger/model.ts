import { ComponentDefinition } from '../../../types';
import { basicDateRangerConfig } from './config';
import { GrapesModel } from '../../../types';

export const dateRangerModel: ComponentDefinition['model'] = {
	defaults: {
		...basicDateRangerConfig.defaults,
		attributes: {
			...basicDateRangerConfig.defaults.attributes
		}
	},
	init(this: GrapesModel) {
		const updateView = () => {
			const view = this.getView();
			if (view) {
				view.onRender({ el: view.el, model: this });
			}
		};

		// Add any properties that need to trigger view updates
		['startDate', 'endDate'].forEach((prop) => {
			this.on(`change:${prop}`, updateView);
		});
	},
	handleChanges() {}
};
