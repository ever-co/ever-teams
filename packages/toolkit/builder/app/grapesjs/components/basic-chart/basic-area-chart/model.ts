import { ComponentDefinition } from '../../../types';
import { areaChartConfig } from './config';
import { GrapesModel } from '../../..//types';

export const areaChartModel: ComponentDefinition['model'] = {
	defaults: {
		...areaChartConfig.defaults,
		attributes: {
			...areaChartConfig.defaults.attributes,
			'data-type': 'area'
		}
	},
	init(this: GrapesModel) {
		const updateView = () => {
			// Update attributes
			const attributes = {
				'data-type': 'area'
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

		['data'].forEach((prop) => {
			this.on(`change:${prop}`, updateView);
		});
	},
	handleChanges() {}
};
