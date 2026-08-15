import { ComponentDefinition } from '../../../types';
import { barChartVerticalConfig } from './config';
import { GrapesModel } from '../../../types';

export const barChartVerticalModel: ComponentDefinition['model'] = {
	defaults: {
		...barChartVerticalConfig.defaults,
		attributes: {
			...barChartVerticalConfig.defaults.attributes,
			'data-type': 'bar-horizontal'
		}
	},
	init(this: GrapesModel) {
		const updateView = () => {
			const attributes = {
				'data-type': 'bar-horizontal'
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
