import { ComponentDefinition } from '../../../types';
import { teamsBasicConfig } from './config';
import { GrapesModel } from '../../../types';

export const teamsBasicModel: ComponentDefinition['model'] = {
	defaults: {
		...teamsBasicConfig.defaults,
		attributes: {
			...teamsBasicConfig.defaults.attributes,
			'data-progress': 'false',
			'data-background': 'primary',
			'data-rounded': 'large',
			'data-color': 'secondary',
			'data-icon': 'false',
			'data-border': 'thick'
		}
	},
	init(this: GrapesModel) {
		if (!this.get('progress')) this.set('progress', false);
		if (!this.get('background')) this.set('background', 'primary');
		if (!this.get('rounded')) this.set('rounded', 'large');
		if (!this.get('color')) this.set('color', 'secondary');
		if (!this.get('icon')) this.set('icon', false);
		if (!this.get('border')) this.set('border', 'thick');

		const updateView = () => {
			// Update attributes
			const attributes = {
				'data-progress': String(this.get('progress') || false),
				'data-background': this.get('background') || 'primary',
				'data-rounded': this.get('rounded') || 'large',
				'data-color': this.get('color') || 'secondary',
				'data-icon': String(this.get('icon') || false),
				'data-border': this.get('border') || 'thick',
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

		['readonly', 'progress', 'background', 'rounded', 'color', 'icon', 'border'].forEach((prop) => {
			this.on(`change:${prop}`, updateView);
		});
	},
	handleChanges() {}
};
