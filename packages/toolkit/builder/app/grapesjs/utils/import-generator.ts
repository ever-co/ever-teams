// @ts-nocheck
import { GrapesJSEditor, ImportGroup, GrapesComponent } from '../types';
import { COMPONENT_CATEGORIES } from '../constants/component-defaults';
import { componentConfigs } from '../components/components';

export const generateImportsByCategory = (editor: GrapesJSEditor): ImportGroup[] => {
	const importGroups: Record<string, ImportGroup> = {
		[COMPONENT_CATEGORIES.TIMER]: { components: [], inputs: [] },
		[COMPONENT_CATEGORIES.CHART]: { components: [], inputs: [] },
		[COMPONENT_CATEGORIES.DATE]: { components: [], inputs: [] },
		[COMPONENT_CATEGORIES.PROGRESS]: { components: [], inputs: [] },
		[COMPONENT_CATEGORIES.CARD]: { components: [], inputs: [] },
		[COMPONENT_CATEGORIES.OTHER]: { components: [], inputs: [] }
	};

	try {
		let componentsToProcess: GrapesComponent[] = [];

		// Get wrapper first as it's more reliable
		const wrapper = editor.DomComponents?.getWrapper();

		if (wrapper && typeof wrapper.components === 'function') {
			const components = wrapper.components();
			if (components?.models) {
				componentsToProcess = components.models;
			}
		}

		if (!componentsToProcess.length) {
			return [];
		}

		// Process components
		componentsToProcess.forEach((component: GrapesComponent) => {
			const type = component.get('type');

			// Find the category that contains the component config
			let foundConfig: any = null;
			let category: string | null = null;

			for (const [cat, configs] of Object.entries(componentConfigs)) {
				const config = configs.find((c) => c.type === type);
				if (config) {
					foundConfig = config;
					category = cat;
					break;
				}
			}

			if (foundConfig?.mapping && category) {
				if (!importGroups[category]) {
					importGroups[category] = { components: [], inputs: [] };
				}

				if (foundConfig.mapping.componentName) {
					importGroups[category].components.push(foundConfig.mapping.componentName);
				}

				// Only add inputs if the component actually uses them
				// if (foundConfig.mapping.inputs?.name && component.get('traits')?.length > 0) {
				//   importGroups[category].inputs.push(foundConfig.mapping.inputs.name);
				// }
			}
		});

		return Object.entries(importGroups)
			.filter(([_, group]) => group.components.length > 0 || group.inputs.length > 0)
			.map(([category, { components, inputs }]) => ({
				category,
				components,
				inputs
			}));
	} catch (error) {
		console.error('Error in generateImportsByCategory:', error);
		throw error;
	}
};
