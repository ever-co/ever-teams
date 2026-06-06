import { ITeamsModernTimerProps } from '../../app/grapesjs/types';

// Define supported component types and their props
type SupportedComponents = {
	TeamsModernTimer: ITeamsModernTimerProps;
};

interface ParsedComponent<T extends keyof SupportedComponents> {
	type: T;
	props: Partial<SupportedComponents[T]>;
}

// Module-level constant to avoid recreation on every call
const supportedTypeMap: Record<keyof SupportedComponents, true> = { TeamsModernTimer: true };

function parseValue(value: string): boolean | number | string {
	if (value === 'true') return true;
	if (value === 'false') return false;
	const num = Number(value);
	return value.trim() !== '' && !Number.isNaN(num) ? num : value;
}

export const parseComponent = (element: HTMLElement): ParsedComponent<keyof SupportedComponents> | null => {
	const componentType = element.getAttribute('data-component');
	const timerType = element.getAttribute('data-timer-modern');

	let type = componentType;
	if (timerType === 'BasicModernTimer') {
		type = 'TeamsModernTimer';
	}

	if (!type) return null;

	if (!(type in supportedTypeMap)) {
		return null;
	}

	const props = Array.from(element.attributes)
		.filter((attr) => attr.name.startsWith('data-'))
		.reduce(
			(acc, attr) => {
				const propName = attr.name.replace('data-', '');

				if (propName === 'component' || propName === 'timer-modern') return acc;

				acc[propName] = parseValue(attr.value);
				return acc;
			},
			{} as Record<string, any>
		);

	return {
		type: type as keyof SupportedComponents,
		props: props as Partial<SupportedComponents[keyof SupportedComponents]>
	};
};

export const componentToJSX = <T extends keyof SupportedComponents>(component: ParsedComponent<T>): string => {
	const { type, props } = component;

	const propsArray = Object.entries(props).map(([key, value]) => {
		const camelKey = key.replace(/-([a-z])/g, (g) => g[1].toUpperCase());

		if (typeof value === 'boolean' || typeof value === 'number') {
			return `${camelKey}={${value}}`;
		}
		const escaped = String(value).replace(/"/g, '&quot;').replace(/{/g, '&#123;').replace(/}/g, '&#125;');
		return `${camelKey}="${escaped}"`;
	});

	const hasProps = propsArray.length > 0;
	return hasProps ? `<${type} ${propsArray.join(' ')} />` : `<${type} />`;
};

// Helper function to process HTML and convert components
export const processComponents = (html: string): string => {
	const parser = new DOMParser();
	const doc = parser.parseFromString(html, 'text/html');

	const componentElements = doc.querySelectorAll('[data-component], [data-timer-modern]');
	const jsxReplacements: { placeholder: string; jsx: string }[] = [];

	componentElements.forEach((el, index) => {
		const parsed = parseComponent(el as HTMLElement);

		if (parsed) {
			const jsx = componentToJSX(parsed);
			const placeholder = `__JSX_COMPONENT_${index}_${Math.random().toString(36).slice(2)}__`;
			jsxReplacements.push({ placeholder, jsx });
			el.outerHTML = placeholder;
		}
	});

	// Get innerHTML first
	let result = doc.body.innerHTML;

	// Then replace placeholders with actual JSX
	jsxReplacements.forEach(({ placeholder, jsx }) => {
		result = result.replace(placeholder, jsx);
	});

	return result;
};
