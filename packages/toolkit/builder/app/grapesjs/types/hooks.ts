import { Theme } from 'theme-ui';
import { GrapesJSEditor } from './editor';
import { ComponentDefaults, RenderParams } from './components';
import { MutableRefObject } from 'react';

export interface BlockComponent {
	id: string;
	label: string;
	content: string;
	category: string;
	image?: string;
	media?: string;
}

export interface EditorConfig {
	height: string;
	width: string;
	container: string;
	fromElement: boolean;
	storageManager: boolean | object;
	plugins: string[];
	pluginOpts: Record<string, any>;
	canvas: {
		styles: string[];
		scripts: string[];
	};
	assetManager: {
		assets: any[];
		upload: boolean;
	};
	styleManager: {
		sectors: any[];
	};
	deviceManager: {
		devices: Array<{
			name: string;
			width: string;
		}>;
		device: string;
	};
	theme?: Theme;
	colorMode?: 'light' | 'dark';
}

export interface UseGrapesJSProps {
	containerId: string;
	blockComponents?: BlockComponent[];
	config?: Partial<EditorConfig>;
	projectId?: string;
	onSave?: () => void | Promise<void>;
}

export interface UseComponentRegistrationProps {
	editor: GrapesJSEditor | null;
	config: ComponentRegistrationConfig;
	theme: Theme;
}

export interface ComponentRegistrationConfig {
	type: string;
	label: string;
	category: string;
	content: string;
	image?: string;
	defaults: ComponentDefaults;
	handleRender?: (params: RenderParams) => void;
}

export interface UseGrapesJSThemingProps {
	editor: GrapesJSEditor;
	theme: Theme;
	colorMode?: 'light' | 'dark';
}

export interface UseGrapesJSReturn {
	editor: GrapesJSEditor | null;
	theme: Theme;
	editorRef: MutableRefObject<GrapesJSEditor | null>;
	history: {
		undo: () => void;
		redo: () => void;
		canUndo: () => boolean | undefined;
		canRedo: () => boolean | undefined;
		getStack: () => any[] | undefined;
	};
}

export interface UseCommandsProps {
	editor: GrapesJSEditor | null;
	theme: Theme;
	colorMode?: 'light' | 'dark';
}

export interface UseEditorProps {
	containerId: string;
	blockComponents?: BlockComponent[];
	theme?: Theme;
	config?: Record<string, any>;
}

export interface UseThemeProps {
	editor: GrapesJSEditor | null;
	theme: Theme;
	colorMode?: 'light' | 'dark';
}

export interface UseHistoryProps {
	editor: GrapesJSEditor | null;
	config?: {
		maxStackSize?: number;
		debounceTime?: number;
	};
}

export interface HistoryItem {
	type: string;
	component?: {
		type: string;
		[key: string]: any;
	};
	[key: string]: any;
}

export interface HistoryManager {
	undo: () => boolean;
	redo: () => boolean;
	hasUndo: () => boolean;
	hasRedo: () => boolean;
	getStack: () => HistoryItem[];
	setConfig: (config: any) => void;
}
