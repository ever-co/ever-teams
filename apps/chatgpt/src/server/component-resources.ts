import { Request, Response } from 'express';
import { createRequire } from 'node:module';
import { createLogger } from '../config/logger.js';

// This package is ESM ("type": "module"), where the CommonJS `require` is not
// defined. Recreate it so the built component registry can be loaded synchronously.
const require = createRequire(import.meta.url);

const logger = createLogger('ComponentResources');

export interface ComponentResource {
	uri: string;
	name: string;
	mimeType: string;
	description: string;
	content: string;
}

/**
 * Component Resources Handler
 *
 * Serves UI components as HTML resources to ChatGPT.
 * Components are registered with URIs like "component://timerWidget"
 * and can be referenced in _meta fields.
 */
export class ComponentResourcesHandler {
	private components: Map<string, ComponentResource> = new Map();

	constructor() {
		this.registerComponents();
	}

	/**
	 * Register all available components
	 */
	private registerComponents(): void {
		try {
			// Try to load from registry (after build)
			// eslint-disable-next-line @typescript-eslint/no-var-requires
			const { componentRegistry } = require('./component-registry');

			for (const [name, metadata] of Object.entries(componentRegistry)) {
				this.components.set(name, metadata as ComponentResource);
				logger.info({ uri: (metadata as ComponentResource).uri }, `Registered component: ${name}`);
			}

			logger.info(`Total components registered: ${this.components.size}`);
		} catch (error) {
			logger.warn({
				error: error instanceof Error ? error.message : String(error)
			}, 'Component registry not found. Components not built yet?');

			// Register fallback inline components for development
			this.registerFallbackComponents();
		}
	}

	/**
	 * Register fallback components for development
	 */
	private registerFallbackComponents(): void {
		// Simple fallback timer widget
		this.components.set('timerWidget', {
			uri: 'component://timerWidget',
			name: 'Timer Widget',
			mimeType: 'text/html+skybridge',
			description: 'Timer widget showing active timer status',
			content: this.getInlineFallbackHTML('Timer Widget', 'Timer data will appear here')
		});

		this.components.set('timeEntryCard', {
			uri: 'component://timeEntryCard',
			name: 'Time Entry Card',
			mimeType: 'text/html+skybridge',
			description: 'Time entry card displaying completed time log',
			content: this.getInlineFallbackHTML('Time Entry', 'Time entry data will appear here')
		});

		this.components.set('projectCard', {
			uri: 'component://projectCard',
			name: 'Project Card',
			mimeType: 'text/html+skybridge',
			description: 'Project card showing project information',
			content: this.getInlineFallbackHTML('Project', 'Project data will appear here')
		});

		logger.info('Registered fallback components for development');
	}

	/**
	 * Get simple fallback HTML for development
	 */
	private getInlineFallbackHTML(title: string, message: string): string {
		return `<!DOCTYPE html>
<html>
<head>
	<style>
		body { font-family: system-ui; padding: 20px; text-align: center; }
		.container { border: 2px solid #A11DB1; border-radius: 12px; padding: 24px; background: linear-gradient(135deg, rgba(56,38,166,0.05) 0%, rgba(161,29,177,0.05) 100%); }
		h2 { background: linear-gradient(135deg, #3826A6 0%, #A11DB1 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
	</style>
</head>
<body>
	<div class="container">
		<h2>${title}</h2>
		<p>${message}</p>
		<small>Build components with: yarn build:components</small>
	</div>
</body>
</html>`;
	}

	/**
	 * Get component by name
	 */
	getComponent(name: string): ComponentResource | undefined {
		return this.components.get(name);
	}

	/**
	 * Get component by URI
	 */
	getComponentByUri(uri: string): ComponentResource | undefined {
		// URI format: component://componentName
		const match = uri.match(/^component:\/\/(.+)$/);
		if (!match) {
			return undefined;
		}

		const componentName = match[1];
		return this.components.get(componentName);
	}

	/**
	 * Get all components
	 */
	getAllComponents(): ComponentResource[] {
		return Array.from(this.components.values());
	}

	/**
	 * List all component URIs
	 */
	listComponentUris(): string[] {
		return Array.from(this.components.values()).map((c) => c.uri);
	}

	/**
	 * Check if component exists
	 */
	hasComponent(name: string): boolean {
		return this.components.has(name);
	}

	/**
	 * Handle resource list request
	 */
	handleResourceList(): any {
		const resources = this.getAllComponents().map((component) => ({
			uri: component.uri,
			name: component.name,
			mimeType: component.mimeType,
			description: component.description
		}));

		logger.debug({
			count: resources.length
		}, 'Listing resources');

		return {
			resources
		};
	}

	/**
	 * Handle resource read request
	 */
	handleResourceRead(uri: string): any {
		const component = this.getComponentByUri(uri);

		if (!component) {
			throw new Error(`Resource not found: ${uri}`);
		}

		logger.debug({
			uri,
			name: component.name
		}, 'Reading resource');

		return {
			contents: [
				{
					uri: component.uri,
					mimeType: component.mimeType,
					text: component.content
				}
			]
		};
	}

	/**
	 * Handle HTTP resource endpoint
	 */
	handleHttpResourceRequest(req: Request, res: Response): void {
		try {
			const { uri } = req.query;

			if (!uri || typeof uri !== 'string') {
				res.status(400).json({
					error: 'Missing or invalid uri parameter'
				});
				return;
			}

			const component = this.getComponentByUri(uri);

			if (!component) {
				res.status(404).json({
					error: 'Resource not found',
					uri
				});
				return;
			}

			// Return HTML content
			res.setHeader('Content-Type', 'text/html; charset=utf-8');
			res.send(component.content);
		} catch (error) {
			logger.error({
				error: error instanceof Error ? error.message : String(error)
			}, 'Error handling resource request');

			res.status(500).json({
				error: 'Internal server error',
				message: error instanceof Error ? error.message : 'Unknown error'
			});
		}
	}
}
