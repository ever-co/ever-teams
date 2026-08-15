import { createLogger } from '../config/logger.js';
import { ClientInfo } from './client-detector.js';

const logger = createLogger('MetaEnhancer');

/**
 * Tool response structure from MCP server
 */
export interface McpToolResponse {
	content: Array<{
		type: string;
		text?: string;
		data?: any;
		[key: string]: any;
	}>;
	isError?: boolean;
}

/**
 * Enhanced tool response with ChatGPT metadata
 */
export interface EnhancedToolResponse extends McpToolResponse {
	structuredContent?: any;
	_meta?: Record<string, any>;
}

/**
 * Metadata Enhancer
 *
 * Adds ChatGPT-specific metadata fields (_meta) to MCP responses.
 * These fields control UI rendering, widget behavior, and tool invocation
 * status in ChatGPT, following the OpenAI Apps SDK specification.
 *
 * Key _meta fields:
 * - openai/outputTemplate: URI to UI component for rich display
 * - openai/widgetPrefersBorder: Show border around widget
 * - openai/widgetDomain: Domain for security context
 * - openai/widgetCSP: Content Security Policy
 * - openai/locale: User's locale for internationalization
 * - openai/toolInvocation/invoking: Loading message
 * - openai/toolInvocation/invoked: Success message
 */
export class MetaEnhancer {
	/**
	 * Enhance MCP response with ChatGPT-specific metadata
	 */
	static enhanceToolResponse(
		toolName: string,
		mcpResponse: McpToolResponse,
		clientInfo: ClientInfo
	): EnhancedToolResponse {
		// If not ChatGPT client, return response as-is (no _meta)
		if (!clientInfo.isChatGPT) {
			logger.debug({
				toolName
			}, 'Non-ChatGPT client, skipping metadata enhancement');
			return mcpResponse;
		}

		logger.info({
			toolName,
			locale: clientInfo.locale
		}, 'Enhancing response with ChatGPT metadata');

		// Create base metadata
		const baseMeta = this.getBaseMetadata(clientInfo);

		// Add tool-specific metadata
		const toolMeta = this.getToolSpecificMetadata(toolName, mcpResponse);

		// Merge metadata
		const enhanced: EnhancedToolResponse = {
			...mcpResponse,
			_meta: {
				...baseMeta,
				...toolMeta
			}
		};

		// Extract structured content for component hydration
		enhanced.structuredContent = this.extractStructuredContent(
			mcpResponse,
			toolName
		);

		logger.debug({
			toolName,
			hasMeta: !!enhanced._meta,
			hasStructuredContent: !!enhanced.structuredContent
		}, 'Enhanced response');

		return enhanced;
	}

	/**
	 * Get base metadata applicable to all tools
	 */
	private static getBaseMetadata(clientInfo: ClientInfo): Record<string, any> {
		return {
			// Widget preferences
			'openai/widgetPrefersBorder': true,
			'openai/widgetDomain': 'ever.team',
			'openai/widgetCSP':
				"default-src 'self' https://ever.team https://*.gauzy.co; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",

			// Localization - echo user's locale
			'openai/locale': clientInfo.locale || 'en-US'
		};
	}

	/**
	 * Get tool-specific metadata
	 */
	private static getToolSpecificMetadata(
		toolName: string,
		response: McpToolResponse
	): Record<string, any> {
		const meta: Record<string, any> = {};

		// Timer-related tools
		if (toolName === 'start_timer') {
			meta['openai/outputTemplate'] = 'component://timerWidget';
			meta['openai/toolInvocation/invoking'] = 'Starting timer...';
			meta['openai/toolInvocation/invoked'] = 'Timer started successfully';
		} else if (toolName === 'stop_timer') {
			meta['openai/outputTemplate'] = 'component://timerWidget';
			meta['openai/toolInvocation/invoking'] = 'Stopping timer...';
			meta['openai/toolInvocation/invoked'] = 'Timer stopped successfully';
		} else if (toolName === 'timer_status') {
			meta['openai/outputTemplate'] = 'component://timerWidget';
			meta['openai/toolInvocation/invoking'] = 'Checking timer status...';
			meta['openai/toolInvocation/invoked'] = 'Timer status retrieved';
		}

		// Project-related tools
		else if (toolName.includes('project')) {
			meta['openai/toolInvocation/invoking'] = 'Processing project request...';
			meta['openai/toolInvocation/invoked'] = 'Project operation completed';

			if (toolName === 'create_project') {
				meta['openai/outputTemplate'] = 'component://projectCard';
			} else if (toolName === 'get_projects') {
				meta['openai/outputTemplate'] = 'component://projectList';
			}
		}

		// Task-related tools
		else if (toolName.includes('task')) {
			meta['openai/toolInvocation/invoking'] = 'Processing task request...';
			meta['openai/toolInvocation/invoked'] = 'Task operation completed';

			if (toolName === 'create_task') {
				meta['openai/outputTemplate'] = 'component://taskCard';
			} else if (toolName === 'get_tasks') {
				meta['openai/outputTemplate'] = 'component://taskList';
			}
		}

		// Report-related tools
		else if (toolName.includes('report')) {
			meta['openai/outputTemplate'] = 'component://reportView';
			meta['openai/toolInvocation/invoking'] = 'Generating report...';
			meta['openai/toolInvocation/invoked'] = 'Report generated successfully';
		}

		// Employee-related tools
		else if (toolName.includes('employee')) {
			meta['openai/toolInvocation/invoking'] = 'Processing employee request...';
			meta['openai/toolInvocation/invoked'] = 'Employee operation completed';
		}

		// Authentication tools
		else if (toolName === 'login') {
			meta['openai/toolInvocation/invoking'] = 'Logging in...';
			meta['openai/toolInvocation/invoked'] = 'Logged in successfully';
		} else if (toolName === 'logout') {
			meta['openai/toolInvocation/invoking'] = 'Logging out...';
			meta['openai/toolInvocation/invoked'] = 'Logged out successfully';
		}

		// Generic fallback
		else {
			meta['openai/toolInvocation/invoking'] = 'Processing request...';
			meta['openai/toolInvocation/invoked'] = response.isError
				? 'Request failed'
				: 'Request completed';
		}

		return meta;
	}

	/**
	 * Extract structured content from MCP response for component hydration
	 */
	private static extractStructuredContent(
		response: McpToolResponse,
		toolName: string
	): any {
		try {
			// If response has structured data in content
			if (response.content && response.content.length > 0) {
				const firstContent = response.content[0];

				// Try to parse JSON from text content
				if (firstContent.type === 'text' && firstContent.text) {
					try {
						return JSON.parse(firstContent.text);
					} catch {
						// Not JSON, return as-is
						return { text: firstContent.text };
					}
				}

				// If content has data field
				if (firstContent.data) {
					return firstContent.data;
				}
			}

			// Fallback to entire response
			return response;
		} catch (error) {
			logger.warn({
				toolName,
				error: error instanceof Error ? error.message : String(error)
			}, 'Failed to extract structured content');
			return response;
		}
	}

	/**
	 * Enhance list of tools with metadata
	 */
	static enhanceToolsList(
		tools: any[],
		clientInfo: ClientInfo
	): any[] {
		// If not ChatGPT client, return tools as-is
		if (!clientInfo.isChatGPT) {
			return tools;
		}

		// Add ChatGPT-specific metadata to tool definitions
		return tools.map((tool) => ({
			...tool,
			_meta: {
				'openai/locale': clientInfo.locale
			}
		}));
	}

	/**
	 * Check if a tool supports UI components
	 */
	static toolSupportsComponents(toolName: string): boolean {
		const componentTools = [
			'start_timer',
			'stop_timer',
			'timer_status',
			'create_project',
			'get_projects',
			'create_task',
			'get_tasks',
			'generate_report'
		];

		return componentTools.includes(toolName);
	}

	/**
	 * Get component URI for a tool
	 */
	static getComponentUri(toolName: string): string | undefined {
		const componentMap: Record<string, string> = {
			start_timer: 'component://timerWidget',
			stop_timer: 'component://timerWidget',
			timer_status: 'component://timerWidget',
			create_project: 'component://projectCard',
			get_projects: 'component://projectList',
			create_task: 'component://taskCard',
			get_tasks: 'component://taskList',
			generate_report: 'component://reportView'
		};

		return componentMap[toolName];
	}
}
