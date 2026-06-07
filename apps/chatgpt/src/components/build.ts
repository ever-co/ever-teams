#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

/**
 * Component Builder
 *
 * Builds standalone HTML components for ChatGPT rendering.
 * Each component is a self-contained HTML file with inline CSS and JavaScript.
 */

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const COMPONENTS_DIR = path.join(__dirname);
const OUTPUT_DIR = path.join(__dirname, '../../dist/components');

interface ComponentDefinition {
	name: string;
	sourceFile: string;
	outputFile: string;
	description: string;
}

const components: ComponentDefinition[] = [
	{
		name: 'timerWidget',
		sourceFile: 'TimerWidget.html',
		outputFile: 'timer-widget.html',
		description: 'Timer widget showing active timer status and time tracking'
	},
	{
		name: 'timeEntryCard',
		sourceFile: 'TimeEntryCard.html',
		outputFile: 'time-entry-card.html',
		description: 'Time entry card displaying completed time log details'
	},
	{
		name: 'projectCard',
		sourceFile: 'ProjectCard.html',
		outputFile: 'project-card.html',
		description: 'Project card showing project information and statistics'
	}
];

/**
 * Build all components
 */
async function buildComponents() {
	console.log('🚀 Building ChatGPT UI Components...\n');

	// Create output directory
	if (!fs.existsSync(OUTPUT_DIR)) {
		fs.mkdirSync(OUTPUT_DIR, { recursive: true });
		console.log(`✓ Created output directory: ${OUTPUT_DIR}\n`);
	}

	let successCount = 0;
	let errorCount = 0;

	for (const component of components) {
		try {
			console.log(`Building ${component.name}...`);

			const sourcePath = path.join(COMPONENTS_DIR, component.sourceFile);
			const outputPath = path.join(OUTPUT_DIR, component.outputFile);

			// Check if source file exists
			if (!fs.existsSync(sourcePath)) {
				console.error(`  ✗ Source file not found: ${sourcePath}`);
				errorCount++;
				continue;
			}

			// Read source file
			const htmlContent = fs.readFileSync(sourcePath, 'utf-8');

			// Minify HTML (basic - remove extra whitespace and comments)
			const minified = minifyHTML(htmlContent);

			// Write output file
			fs.writeFileSync(outputPath, minified, 'utf-8');

			const size = (fs.statSync(outputPath).size / 1024).toFixed(2);
			console.log(`  ✓ Built: ${component.outputFile} (${size} KB)`);

			successCount++;
		} catch (error) {
			console.error(`  ✗ Error building ${component.name}:`, error);
			errorCount++;
		}
	}

	// Generate component registry
	try {
		console.log('\nGenerating component registry...');
		generateRegistry(components);
		console.log('  ✓ Component registry generated');
	} catch (error) {
		console.error('  ✗ Error generating registry:', error);
		errorCount++;
	}

	console.log('\n' + '='.repeat(50));
	console.log(`✅ Build Complete!`);
	console.log(`   Success: ${successCount} components`);
	if (errorCount > 0) {
		console.log(`   ❌ Errors: ${errorCount}`);
	}
	console.log('='.repeat(50) + '\n');

	process.exit(errorCount > 0 ? 1 : 0);
}

/**
 * Basic HTML minification
 */
function minifyHTML(html: string): string {
	// Remove comments, looping until stable so nested/overlapping
	// markers (e.g. '<!--<!-- -->') cannot leave a residual '<!--'.
	let result = html;
	let previous: string;
	do {
		previous = result;
		result = result.replace(/<!--[\s\S]*?-->/g, '');
	} while (result !== previous);

	return result
		// Remove extra whitespace between tags
		.replace(/>\s+</g, '><')
		// Remove leading/trailing whitespace
		.trim();
}

/**
 * Generate TypeScript registry file
 */
function generateRegistry(components: ComponentDefinition[]) {
	const registryPath = path.join(__dirname, '../server/component-registry.ts');

	let registryContent = `/**
 * Component Registry
 *
 * Auto-generated file. Do not edit manually.
 * Generated on: ${new Date().toISOString()}
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
		throw new Error(\`Component file not found: \${filename}\`);
	}

	return fs.readFileSync(filePath, 'utf-8');
}

/**
 * Component registry
 */
export const componentRegistry: Record<string, ComponentMetadata> = {
`;

	// Add each component to registry
	for (const component of components) {
		registryContent += `	'${component.name}': {
		name: '${component.name}',
		uri: 'component://${component.name}',
		mimeType: 'text/html+skybridge',
		description: '${component.description}',
		get content() {
			return loadComponent('${component.outputFile}');
		}
	},
`;
	}

	registryContent += `};

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
`;

	fs.writeFileSync(registryPath, registryContent, 'utf-8');
}

// Run the builder
buildComponents().catch((error) => {
	console.error('Fatal error:', error);
	process.exit(1);
});
