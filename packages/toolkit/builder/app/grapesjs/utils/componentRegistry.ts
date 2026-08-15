import { Theme } from 'theme-ui';
import { GrapesJSEditor, BlockComponent } from '../types';
import { ComponentConfig, ComponentModel, RenderParams, ComponentTypeDefinition } from '../types';
import { GrapesJSError } from './error-handler';
import { validateEditorInstance } from './error-handler';
import { GrapesJSErrorType } from '../constants/error-types';

const validateComponentConfig = (config: ComponentConfig): void => {
	if (!config.type || !config.label || !config.category || !config.content) {
		throw new GrapesJSError(
			GrapesJSErrorType.INVALID_CONFIG,
			config.type || 'unknown',
			'Missing required component configuration'
		);
	}
};

const registerComponentModel = (editor: GrapesJSEditor, config: ComponentConfig, theme: Theme): void => {
	const componentDefinition: ComponentTypeDefinition = {
		defaults: config.defaults,
		model: {
			attributes: {} as Record<string, unknown>,
			get<T>(property: string): T {
				if (!this.attributes) {
					this.attributes = {};
				}
				return this.attributes[property] as T;
			},
			set(property: string | Record<string, any>, value?: any) {
				if (!this.attributes) {
					this.attributes = {};
				}
				if (typeof property === 'string') {
					this.attributes[property] = value;
				} else {
					this.attributes = { ...this.attributes, ...property };
				}
			},
			init() {
				if (!this.attributes) {
					this.attributes = {};
				}
				setupTraitChangeListeners(this as ComponentModel, config);
			},
			handleChanges() {
				triggerComponentChanges(this as ComponentModel);
			},
			on(event: string, callback: () => void) {
				// Implementation handled by GrapesJS
			},
			trigger(event: string) {
				// Implementation handled by GrapesJS
			}
		},
		view: {
			onRender({ el, model }: RenderParams) {
				handleComponentRender({ el, model, config, theme });
			}
		}
	};

	editor.DomComponents.addType(config.type, componentDefinition);
};

const setupTraitChangeListeners = (model: ComponentModel, config: ComponentConfig): void => {
	const traitNames = config.defaults.traits?.map((t) => t.name).join(' ');
	if (traitNames) {
		model.on(`change:${traitNames}`, () => {
			if (typeof model.handleChanges === 'function') {
				model.handleChanges();
			}
		});
	}
};

const triggerComponentChanges = (model: ComponentModel): void => {
	model.trigger('change:components');
	model.trigger('change');
};

const handleComponentRender = ({
	el,
	model,
	config,
	theme
}: {
	el: HTMLElement;
	model: ComponentModel;
	config: ComponentConfig;
	theme: Theme;
}): void => {
	if (!el) {
		throw new GrapesJSError(GrapesJSErrorType.RENDERING, config.type, 'Element not found for rendering');
	}
	config.handleRender?.({ el, model, theme });
};

const registerBlockComponent = (editor: GrapesJSEditor, config: ComponentConfig): void => {
	// Create block configuration using the BlockComponent interface
	const blockConfig: BlockComponent = {
		id: config.type,
		label: config.label,
		category: config.category,
		content: config.content,
		image: config.image
	};

	// Register the block
	editor.BlockManager.add(blockConfig.id, {
		label: blockConfig.label,
		category: blockConfig.category,
		content: blockConfig.content,
		media: blockConfig.image
			? `<img class="bg-cover" src="${blockConfig.image}" alt="${blockConfig.label}"/>`
			: undefined
	});
};

export const registerComponent = (editor: GrapesJSEditor, config: ComponentConfig, theme: Theme): void => {
	try {
		validateEditorInstance(editor, config.type);
		validateComponentConfig(config);

		const existingComponent = editor.DomComponents.getType(config.type);
		if (existingComponent) {
			throw new GrapesJSError(
				GrapesJSErrorType.COMPONENT_REGISTRATION,
				config.type,
				'Component already registered'
			);
		}

		registerComponentModel(editor, config, theme);
		registerBlockComponent(editor, config);
	} catch (error) {
		if (error instanceof GrapesJSError) {
			throw error;
		}
		throw new GrapesJSError(GrapesJSErrorType.UNKNOWN, config.type, `Unexpected error: ${error}`);
	}
};

export const unregisterComponent = (editor: GrapesJSEditor, componentType: string): void => {
	try {
		validateEditorInstance(editor, componentType);

		if (editor.DomComponents.getType(componentType)) {
			editor.DomComponents.removeType(componentType);
		}

		const block = editor.BlockManager.get(componentType);
		if (block) {
			editor.BlockManager.remove(componentType);
		}
	} catch (error) {
		throw new GrapesJSError(
			GrapesJSErrorType.COMPONENT_REMOVAL,
			componentType,
			`Failed to unregister component: ${error}`
		);
	}
};
