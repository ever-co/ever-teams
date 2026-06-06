import { ExportedComponent, ExportData } from '../types/export';
import { ExportedTrait } from '../types/traits';

export const enhancedExportComponents = (editor: any) => {
	if (!editor) return null;

	const components = editor.getComponents();
	const uniqueComponents = new Set<string>();
	const uniqueInputs = new Set<string>();

	const exportData = {
		version: '1.0.0',
		components: components.map((comp: any) => {
			const type = comp.get('type');
			const componentConfig = editor.DomComponents.getType(type)?.config;

			if (componentConfig?.mapping) {
				uniqueComponents.add(componentConfig.mapping.componentName);
				if (componentConfig.mapping.inputs) {
					uniqueInputs.add(componentConfig.mapping.inputs.name);
				}
			}

			const traits = comp.get('traits').map((trait: any) => ({
				type: trait.get('type'),
				label: trait.get('label'),
				name: trait.get('name'),
				value: comp.get(trait.get('name')),
				options: trait.get('options')
			}));

			return {
				type,
				attributes: comp.get('attributes'),
				traits,
				styles: comp.get('style'),
				content: comp.toHTML(),
				mapping: componentConfig?.mapping
			};
		}),
		imports: {
			components: Array.from(uniqueComponents),
			inputs: Array.from(uniqueInputs)
		},
		styles: editor.getCss(),
		theme: editor.getStyle()
	};

	return exportData;
};
