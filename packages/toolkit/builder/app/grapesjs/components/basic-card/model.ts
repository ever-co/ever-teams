import { ComponentDefinition } from '../../types';
import { cardConfig } from './config';
import { GrapesModel } from '../../types';

export const cardModel: ComponentDefinition['model'] = {
	defaults: {
		...cardConfig.defaults,
		attributes: {
			...cardConfig.defaults.attributes,
			'data-component': 'BasicCard'
		}
	},
	init(this: GrapesModel) {
		// Initialize any specific logic for the card model
	},
	handleChanges() {
		// Handle changes specific to the card model
	}
};
