/**
 * Component Registry
 *
 * Auto-generated file. Do not edit manually.
 * Generated on: 2026-04-07T22:25:33.635Z
 *
 * This registry maps component names to their compiled HTML content.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

export interface ComponentMetadata {
	name: string;
	uri: string;
	mimeType: string;
	description: string;
	content: string;
}

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const COMPONENTS_DIR = path.join(__dirname, '../../dist/components');

/**
 * Load component HTML content
 */
function loadComponent(filename: string): string {
	const filePath = path.join(COMPONENTS_DIR, filename);

	if (!fs.existsSync(filePath)) {
		throw new Error(`Component file not found: ${filename}`);
	}

	return fs.readFileSync(filePath, 'utf-8');
}

/**
 * Component registry
 */
export const componentRegistry: Record<string, ComponentMetadata> = {
	'timerWidget': {
		name: 'timerWidget',
		uri: 'component://timerWidget',
		mimeType: 'text/html+skybridge',
		description: 'Timer widget showing active timer status and time tracking',
		get content() {
			return loadComponent('timer-widget.html');
		}
	},
	'timeEntryCard': {
		name: 'timeEntryCard',
		uri: 'component://timeEntryCard',
		mimeType: 'text/html+skybridge',
		description: 'Time entry card displaying completed time log details',
		get content() {
			return loadComponent('time-entry-card.html');
		}
	},
	'projectCard': {
		name: 'projectCard',
		uri: 'component://projectCard',
		mimeType: 'text/html+skybridge',
		description: 'Project card showing project information and statistics',
		get content() {
			return loadComponent('project-card.html');
		}
	},
};

/**
 * Get component by name
 */
export function getComponent(name: string): ComponentMetadata | undefined {
	return componentRegistry[name];
}

/**
 * Get all components
 */
export function getAllComponents(): ComponentMetadata[] {
	return Object.values(componentRegistry);
}

/**
 * Check if component exists
 */
export function hasComponent(name: string): boolean {
	return name in componentRegistry;
}

/**
 * Get component URI
 */
export function getComponentUri(name: string): string | undefined {
	return componentRegistry[name]?.uri;
}
