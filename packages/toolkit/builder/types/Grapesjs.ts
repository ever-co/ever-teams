export interface GrapesJSEditor {
	DomComponents: {
		getType: (id: string) => ComponentType | undefined;
		addType: (id: string, config: ComponentConfig) => void;
		removeType: (id: string) => void;
		getWrapper: () => {
			components: () => {
				models: any[];
			};
		};
		getComponents: () => any[];
	};
	getHtml: () => string;
	getCss: () => string;
	getJs: () => string;
	getProjectData?: () => any;
	toJSON?: () => any;
	Commands: {
		add: (name: string, command: any) => void;
	};
	Modal: {
		open: (options: { title: string; content: HTMLElement }) => void;
		getContent: () => HTMLElement | null;
	};
	on: (event: string, callback: Function) => void;
	off: (event: string, callback: Function) => void;
	[key: string]: any;
}

export interface ComponentConfig {
	model: ComponentModel;
	view: ComponentView;
}

export interface ComponentType {
	model: ComponentModel;
	view: ComponentView;
}

export interface ComponentModel {
	get(arg0: string): unknown;
	view: any;
	defaults: ComponentDefaults;
	init?: () => void;
	handleChanges?: () => void;
}

export interface ComponentDefaults {
	tagName: string;
	attributes: Record<string, string>;
	draggable: boolean | string;
	droppable: boolean;
	editable?: boolean;
	copyable?: boolean;
	hoverable?: boolean;
	removable?: boolean;
	traits?: TraitConfig[];
}

export interface ComponentView {
	onRender: ({ el, model }: RenderParams) => void;
	listenToEvents?: (el: HTMLElement) => void;
}

export interface TraitConfig {
	type: 'text' | 'number' | 'checkbox' | 'select' | 'boolean';
	label: string;
	name: string;
	changeProp?: number;
	options?: TraitOption[];
	defaultValue?: any;
	required?: boolean;
}

export interface TraitOption {
	id: string | number;
	name: string;
	value?: string;
}

export interface RenderParams {
	el: HTMLElement;
	model: ComponentModel;
}
