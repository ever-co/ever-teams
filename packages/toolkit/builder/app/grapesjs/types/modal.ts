import { Theme } from 'theme-ui';

export interface TabConfig {
	label: string;
	code: string;
	language: string;
}

export interface TabsProps {
	tabs: TabConfig[];
	colors: Record<string, string>;
	isDark: boolean;
	formatCode: (code: string, language: string) => HTMLElement;
}

export interface PreviewContainerProps {
	colors: Record<string, string>;
	isDark: boolean;
}

export interface CreateExportModalProps {
	html: string;
	css: string;
	js: string;
	theme: Theme;
	colorMode: 'light' | 'dark';
	formatCode: (code: string, language: string) => HTMLElement;
	handleExportJSON: () => void;
	handleExportNextJS: () => void | Promise<void>;
}

export interface ExportModalContent extends HTMLDivElement {
	updateContent?: (content: { html: string; css: string; js: string }) => void;
}

export interface ExportButtonsProps {
	colors: Record<string, string>;
	isDark: boolean;
	handleExportJSON: () => void;
	handleExportNextJS: () => void | Promise<void>;
}

export interface ModalConfig {
	title?: string;
	content: string | HTMLElement;
	attributes?: Record<string, any>;
}
