import { Theme } from 'theme-ui';
import { GrapesJSEditor } from './editor';
import { ExportData } from './export';

export interface AutosaveData extends ExportData {
	timestamp: number;
	projectId: string;
	lastModified: number;
}

export interface UseAutosaveProps {
	editor: GrapesJSEditor | null;
	projectId: string;
	debounceTime?: number;
	theme: Theme;
	colorMode?: 'light' | 'dark';
}

export const AUTOSAVE_DEFAULTS = {
	DEBOUNCE_TIME: 2000,
	BACKUP_INTERVAL: 300000, // 5 minutes
	STORAGE_KEY: 'grapesjs-autosave'
};
