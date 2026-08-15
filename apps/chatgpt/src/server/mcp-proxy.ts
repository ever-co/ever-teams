import axios, { AxiosInstance, AxiosError } from 'axios';
import { createLogger } from '../config/logger.js';

const logger = createLogger('McpProxy');

/**
 * MCP JSON-RPC request structure
 */
export interface McpRequest {
	jsonrpc: '2.0';
	id: string | number;
	method: string;
	params?: any;
}

/**
 * MCP JSON-RPC response structure
 */
export interface McpResponse {
	jsonrpc: '2.0';
	id: string | number;
	result?: any;
	error?: {
		code: number;
		message: string;
		data?: any;
	};
}

/**
 * MCP Tool definition
 */
export interface McpTool {
	name: string;
	description: string;
	inputSchema: {
		type: string;
		properties?: Record<string, any>;
		required?: string[];
	};
}

/**
 * MCP Proxy Client
 *
 * Forwards MCP requests to the existing mcp.gauzy.co server
 * and returns the responses. This acts as a transparent proxy
 * that can be enhanced with ChatGPT-specific metadata.
 */
export class McpProxy {
	private client: AxiosInstance;
	private mcpServerUrl: string;

	constructor(mcpServerUrl: string) {
		this.mcpServerUrl = mcpServerUrl;

		// Create axios instance for MCP server communication
		this.client = axios.create({
			baseURL: mcpServerUrl,
			timeout: 30000, // 30 seconds
			headers: {
				'Content-Type': 'application/json',
				'Accept': 'application/json'
			}
		});

		// Add request interceptor for logging
		this.client.interceptors.request.use(
			(config) => {
				logger.debug({
					method: config.method,
					url: config.url,
					data: config.data
				}, 'MCP Request');
				return config;
			},
			(error) => {
				logger.error({ error: error.message }, 'MCP Request Error');
				return Promise.reject(error);
			}
		);

		// Add response interceptor for logging
		this.client.interceptors.response.use(
			(response) => {
				logger.debug({
					status: response.status,
					data: response.data
				}, 'MCP Response');
				return response;
			},
			(error) => {
				logger.error({
					status: error.response?.status,
					data: error.response?.data,
					message: error.message
				}, 'MCP Response Error');
				return Promise.reject(error);
			}
		);

		logger.info({ mcpServerUrl }, 'MCP Proxy initialized');
	}

	/**
	 * Forward a generic MCP request to the server
	 */
	async forwardRequest(
		method: string,
		params: any = {},
		authToken?: string
	): Promise<any> {
		try {
			const headers: Record<string, string> = {};

			// Forward OAuth Bearer token if present
			if (authToken) {
				headers['Authorization'] = `Bearer ${authToken}`;
			}

			const request: McpRequest = {
				jsonrpc: '2.0',
				id: Date.now(),
				method,
				params
			};

			logger.info({
				method,
				hasAuth: !!authToken
			}, 'Forwarding MCP request');

			const response = await this.client.post<McpResponse>('/sse', request, {
				headers
			});

			// Check for JSON-RPC error in response
			if (response.data.error) {
				throw new Error(
					`MCP Server Error: ${response.data.error.message} (code: ${response.data.error.code})`
				);
			}

			return response.data.result;
		} catch (error) {
			this.handleError(error, method);
		}
	}

	/**
	 * Initialize MCP connection
	 */
	async initialize(clientInfo: {
		name: string;
		version: string;
	}): Promise<any> {
		return this.forwardRequest('initialize', {
			protocolVersion: '2024-11-05',
			capabilities: {},
			clientInfo
		});
	}

	/**
	 * List available tools from MCP server
	 */
	async listTools(authToken?: string): Promise<{ tools: McpTool[] }> {
		const result = await this.forwardRequest('tools/list', {}, authToken);
		return result;
	}

	/**
	 * Call a specific tool on the MCP server
	 */
	async callTool(
		toolName: string,
		args: any,
		authToken?: string
	): Promise<any> {
		return this.forwardRequest(
			'tools/call',
			{
				name: toolName,
				arguments: args
			},
			authToken
		);
	}

	/**
	 * List available prompts from MCP server
	 */
	async listPrompts(authToken?: string): Promise<any> {
		return this.forwardRequest('prompts/list', {}, authToken);
	}

	/**
	 * Get a specific prompt
	 */
	async getPrompt(
		promptName: string,
		args: any,
		authToken?: string
	): Promise<any> {
		return this.forwardRequest(
			'prompts/get',
			{
				name: promptName,
				arguments: args
			},
			authToken
		);
	}

	/**
	 * List available resources from MCP server
	 */
	async listResources(authToken?: string): Promise<any> {
		return this.forwardRequest('resources/list', {}, authToken);
	}

	/**
	 * Read a specific resource
	 */
	async readResource(
		resourceUri: string,
		authToken?: string
	): Promise<any> {
		return this.forwardRequest(
			'resources/read',
			{
				uri: resourceUri
			},
			authToken
		);
	}

	/**
	 * Subscribe to resource updates
	 */
	async subscribeToResource(
		resourceUri: string,
		authToken?: string
	): Promise<any> {
		return this.forwardRequest(
			'resources/subscribe',
			{
				uri: resourceUri
			},
			authToken
		);
	}

	/**
	 * Unsubscribe from resource updates
	 */
	async unsubscribeFromResource(
		resourceUri: string,
		authToken?: string
	): Promise<any> {
		return this.forwardRequest(
			'resources/unsubscribe',
			{
				uri: resourceUri
			},
			authToken
		);
	}

	/**
	 * Handle errors from MCP server
	 */
	private handleError(error: unknown, method: string): never {
		if (axios.isAxiosError(error)) {
			const axiosError = error as AxiosError;

			if (axiosError.response) {
				// Server responded with error status
				const status = axiosError.response.status;
				const data = axiosError.response.data;

				logger.error({
					method,
					status,
					data
				}, 'MCP Server HTTP Error');

				if (status === 401) {
					throw new Error('Authentication failed. Please provide valid credentials.');
				} else if (status === 403) {
					throw new Error('Insufficient permissions to access this resource.');
				} else if (status === 404) {
					throw new Error('MCP endpoint not found. Please check server URL.');
				} else if (status >= 500) {
					throw new Error('MCP Server error. Please try again later.');
				}

				throw new Error(
					`MCP Server error (${status}): ${JSON.stringify(data)}`
				);
			} else if (axiosError.request) {
				// Request made but no response received
				logger.error({ method }, 'MCP Server No Response');
				throw new Error(
					'MCP Server is not responding. Please check network connection.'
				);
			}
		}

		// Generic error
		logger.error({
			method,
			error: error instanceof Error ? error.message : String(error)
		}, 'MCP Proxy Error');

		throw new Error(
			`Failed to forward request to MCP server: ${error instanceof Error ? error.message : 'Unknown error'}`
		);
	}

	/**
	 * Check if MCP server is healthy
	 */
	async healthCheck(): Promise<boolean> {
		try {
			// Try to call a simple method to check connectivity
			await this.forwardRequest('ping', {});
			return true;
		} catch (error) {
			logger.warn({
				error: error instanceof Error ? error.message : String(error)
			}, 'MCP Server health check failed');
			return false;
		}
	}

	/**
	 * Get MCP server URL
	 */
	getServerUrl(): string {
		return this.mcpServerUrl;
	}
}
