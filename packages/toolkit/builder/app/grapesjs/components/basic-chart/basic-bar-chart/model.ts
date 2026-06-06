import { ComponentDefinition } from '../../../types';
import { barChartConfig } from './config';
import { GrapesModel } from '../../../types';

export const barChartModel: ComponentDefinition['model'] = {
	defaults: {
		...barChartConfig.defaults,
		attributes: {
			...barChartConfig.defaults.attributes,
			'data-type': 'bar'
		}
	},
	init(this: GrapesModel) {
		const validateData = (data: any[]) => {
			if (!Array.isArray(data)) return [];
			return data
				.map((item) => ({
					x: item?.x || '',
					y: isNaN(Number(item?.y)) ? 0 : Number(item?.y)
				}))
				.filter((item) => item.x !== '');
		};

		const updateView = () => {
			// Update attributes
			const attributes = {
				'data-type': 'bar'
			};

			// Validate data before setting
			const currentData = this.get('data');
			const validatedData = validateData(currentData);

			if (validatedData.length === 0) {
				console.warn('Invalid or empty data received for bar chart');
			}

			this.set('data', validatedData);
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
