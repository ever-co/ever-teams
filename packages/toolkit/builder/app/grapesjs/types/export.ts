import { Theme } from 'theme-ui';
import { GrapesJSEditor } from './editor';
import { ExportedTrait } from './traits';

export interface UseExportProps {
	editor: GrapesJSEditor | null;
	theme: Theme;
	colorMode?: 'light' | 'dark';
}

export interface ExportedComponent {
	type: string;
	attributes: Record<string, string>;
	traits: ExportedTrait[];
	styles: Record<string, string>;
	content: string;
	mapping?: any;
}

export interface ImportGroup {
	components: string[];
	inputs: string[];
}

export interface ExportData {
	version: string;
	components: ExportedComponent[];
	imports: {
		components: string[];
		inputs: string[];
	};
	styles: string;
	theme: any;
}
