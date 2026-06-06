// @ts-nocheck
import { GrapesComponent } from '../types';
import { componentConfigs } from '../components/components';

const getTraitType = (traitType: string): string => {
	switch (traitType) {
		case 'number':
			return 'number';
		case 'checkbox':
			return 'boolean';
		case 'select':
			return 'string';
		default:
			return 'string';
	}
};

export const generateTypesDefinition = (componentsToProcess: GrapesComponent[]): string => {
	const processedTypes = new Set<string>();
	const typeDefinitions: string[] = [];
	const moduleDeclarations: string[] = [];
	const usedInputs = new Set<string>();

	componentsToProcess.forEach((component) => {
		const type = component.get('type');
		const traits = component.get('traits') || [];

		// Find component config
		let foundConfig = null;
		for (const [_, configs] of Object.entries(componentConfigs)) {
			const config = configs.find((c) => c.type === type);
			if (config) {
				foundConfig = config;
				break;
			}
		}

		if (foundConfig?.mapping && !processedTypes.has(type)) {
			processedTypes.add(type);
			const componentName = foundConfig.mapping.componentName;

			// Generate interface with 'I' prefix
			const interfaceName = `I${componentName}Props`;
			const propsInterface = `export interface ${interfaceName} {
${traits
	.map((trait: any) => {
		const name = trait.get('name');
		const type = trait.get('type');
		const required = trait.get('required');
		return `  ${name}${required ? '' : '?'}: ${getTraitType(type)};`;
	})
	.join('\n')}
}`;

			typeDefinitions.push(propsInterface);
		}
	});

	// Generate module declaration with all components and their used inputs
	const moduleDeclaration = `declare module '@ever-teams/atoms' {
	${Array.from(processedTypes)
		.map((type) => {
			const config = Object.values(componentConfigs)
				.flat()
				.find((c) => c.type === type);
			const componentName = config?.mapping.componentName;
			return `export interface ${componentName}Props extends I${componentName}Props {}
export function ${componentName}(props: I${componentName}Props): JSX.Element;`;
		})
		.join('\n\n  ')}

	${Array.from(usedInputs)
		.map(
			(inputName) => `export interface ${inputName}Props {
    value: any;
    onChange: (value: any) => void;
    label?: string;
    required?: boolean;
  }
  export function ${inputName}(props: ${inputName}Props): JSX.Element;`
		)
		.join('\n\n  ')}
}`;

	moduleDeclarations.push(moduleDeclaration);

	return `// Generated types for Teams components
import { ReactNode } from 'react';

${typeDefinitions.join('\n\n')}

${moduleDeclarations.join('\n\n')}
`;
};
