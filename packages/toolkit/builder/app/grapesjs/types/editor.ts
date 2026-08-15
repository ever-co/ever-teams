import { Theme } from 'theme-ui';
import { EditorConfig } from './hooks';

import {
	ComponentConfig,
	ComponentDefaults,
	ComponentModel,
	ComponentTypeDefinition,
	ComponentView,
	RenderParams,
	ComponentMapping
} from './components';
import { ModalConfig } from './modal';

export interface GrapesJSEditor {
	DomComponents: DomComponentsManager;
	BlockManager: BlockManager;
	Css: StyleManager;
	Canvas: Canvas;
	Modal: ModalManager;
	Commands: CommandManager;
	Panels: PanelManager;
	getHtml: () => string;
	getCss: () => string;
	getJs: () => string;
	getComponents: () => Component[];
	getWrapper: () => Component;
	getConfig: () => EditorConfig;
	setDevice: (device: string) => void;
	refresh: () => void;
	addStyle: (styles: string) => void;
	removeStyle: (selector: string) => void;
	on: (event: string | string[], callback: Function) => void;
	off: (event: string | string[], callback: Function) => void;
	once: (event: string | string[], callback: Function) => void;
	loadProjectData?: (data: any) => void;
	setComponents: (components: any[]) => void;
	setStyle: (style: any) => void;
	UndoManager?: {
		setConfig?: (config: {
			trackSelection?: boolean;
			maximumStackLength?: number;
			customTypes?: Record<
				string,
				{
					merge?: boolean;
					timeout?: number;
				}
			>;
		}) => void;
		undo: () => boolean;
		redo: () => boolean;
		hasUndo: () => boolean;
		hasRedo: () => boolean;
		getStack: () => any[];
	};
	Notifications?: {
		add: (message: string, options?: { timeout?: number; type?: string }) => void;
	};
	Keymaps: {
		add: (name: string, keys: string) => void;
	};
	runCommand: (command: string) => void;
}

export interface Component {
	get: (property: string) => any;
	set: (property: string | object, value?: any) => void;
	toHTML: () => string;
	getAttributes: () => Record<string, string>;
	getStyle: () => Record<string, string>;
	getType: () => string;
	addClass: (className: string) => void;
	removeClass: (className: string) => void;
	components(): ComponentCollection;
}

export interface GrapesComponent extends Component {
	get(attr: string): any;
	components(): ComponentCollection;
}

export interface ComponentCollection {
	models: GrapesComponent[];
	length: number;
	_byId: Record<string, GrapesComponent>;
	[key: string]: any;
}

export interface ComponentType {
	model: ComponentModel;
	view: ComponentView;
	defaults?: {
		mapping?: ComponentMapping;
		[key: string]: any;
	};
}

export interface DomComponentsManager {
	getType: (id: string) => ComponentModel | undefined;
	addType: (id: string, definition: ComponentTypeDefinition) => void;
	removeType: (id: string) => void;
	getComponents: () => Component[] | ComponentCollection;
	getWrapper: () => GrapesComponent | null;
}

export interface CommandManager {
	add: (name: string, command: CommandConfig) => void;
	run: (name: string) => void;
	stop: (name: string) => void;
}

export interface CommandConfig {
	getState?: () => boolean;
	run: (editor?: GrapesJSEditor) => void;
	stop?: () => void;
}

export interface ModalManager {
	open: (config: ModalConfig) => void;
	close: () => void;
	setContent: (content: string | HTMLElement) => void;
	getContent: () => string | HTMLElement | null;
}

export interface BlockManager {
	add: (id: string, config: GrapesJSBlockConfig) => void;
	get: (id: string) => any;
	remove: (id: string) => void;
}

export interface BlockConfig {
	type: string;
	label: string;
	category: string;
	content: string;
	media?: string;
}

export interface Block extends BlockConfig {
	id: string;
	render: () => HTMLElement;
}

export interface CSSRule {
	selectorsToString: () => string;
	toJSON: () => object;
	get: (property: string) => any;
}

export interface StyleManager {
	addRules: (rules: string | CSSRule[]) => void;
	getAll: () => CSSRule[];
	remove: (rule: CSSRule) => void;
}

export interface Canvas {
	getDocument: () => Document;
	getWindow: () => Window;
	getBody: () => HTMLElement;
	getFrame: () => HTMLIFrameElement;
}

export interface PanelManager {
	getPanels: () => Panel[];
}

export interface Panel {
	set: (property: string, value: boolean) => void;
}

export interface GrapesJSBlockConfig {
	label: string;
	category: string;
	content: string;
	media?: string;
}

export interface CSSFormattingResult {
	globalStyles: string;
	moduleStyles: string;
}
