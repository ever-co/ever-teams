import { ComponentDefinition } from '../../../types';
import { radialChartConfig } from './config';
import { GrapesModel } from '../../../types';

export const radialChartModel: ComponentDefinition['model'] = {
	defaults: {
		...radialChartConfig.defaults,
		attributes: {
			...radialChartConfig.defaults.attributes,
			'data-type': 'radial'
		}
	},
	init(this: GrapesModel) {
		const updateView = () => {
			const attributes = {
				'data-type': 'radial'
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

		['data'].forEach((prop) => {
			this.on(`change:${prop}`, updateView);
		});
	},
	handleChanges() {}
};
