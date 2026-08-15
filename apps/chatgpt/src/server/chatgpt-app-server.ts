import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { McpProxy, McpRequest, McpResponse } from './mcp-proxy.js';
import { ClientDetector, ClientInfo } from '../middleware/client-detector.js';
import { MetaEnhancer } from '../middleware/meta-enhancer.js';
import { ComponentResourcesHandler } from './component-resources.js';
import { createLogger } from '../config/logger.js';
import { AppConfig } from '../config/environment.js';

const logger = createLogger('ChatGPTAppServer');

/**
 * ChatGPT App Server
 *
 * Main server that:
 * 1. Receives requests from ChatGPT
 * 2. Detects if request is from ChatGPT (vs other MCP clients)
 * 3. Forwards requests to existing mcp.gauzy.co server
 * 4. Enhances responses with ChatGPT-specific metadata (_meta fields)
 * 5. Returns enhanced responses to ChatGPT
 *
 * This server acts as an intelligent middleware between ChatGPT
 * and your existing MCP infrastructure, without modifying the
 * underlying MCP server.
 */
export class ChatGPTAppServer {
	private app: express.Application;
	private mcpProxy: McpProxy;
	private componentResources: ComponentResourcesHandler;
	private config: AppConfig;

	constructor(config: AppConfig) {
		this.config = config;
		this.app = express();
		this.mcpProxy = new McpProxy(config.mcpServerUrl);
		this.componentResources = new ComponentResourcesHandler();

		this.setupMiddleware();
		this.setupRoutes();
		this.setupErrorHandling();
	}

	/**
	 * Setup Express middleware
	 */
	private setupMiddleware(): void {
		// Security headers
		this.app.use(
			helmet({
				contentSecurityPolicy: {
					directives: {
						defaultSrc: ["'self'"],
						scriptSrc: ["'self'", "'unsafe-inline'"],
						styleSrc: ["'self'", "'unsafe-inline'"],
						connectSrc: ["'self'", this.config.mcpServerUrl, this.config.oauthServerUrl]
					}
				}
			})
		);

		// CORS configuration
		this.app.use(
			cors({
				origin: (origin, callback) => {
					// Allow requests with no origin (like mobile apps, Postman, etc.)
					if (!origin) {
						return callback(null, true);
					}

					// Check if origin is allowed
					if (ClientDetector.isOriginAllowed(
						{ headers: { origin } } as Request,
						this.config.allowedOrigins
					)) {
						callback(null, true);
					} else {
						callback(new Error('Not allowed by CORS'));
					}
				},
				credentials: true,
				methods: ['GET', 'POST', 'OPTIONS'],
				allowedHeaders: ['Content-Type', 'Authorization', 'X-Client-Type', 'X-Locale']
			})
		);

		// Body parsing
		this.app.use(express.json({ limit: '10mb' }));
		this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

		// Request logging
		this.app.use((req: Request, _res: Response, next: NextFunction) => {
			const metadata = ClientDetector.getRequestMetadata(req);
			logger.info(metadata, 'Incoming request');
			next();
		});
	}

	/**
	 * Create a minimal, dependency-free in-memory fixed-window rate limiter.
	 *
	 * Keys requests by client IP and allows up to `max` requests per `windowMs`.
	 * When the limit is exceeded, responds with HTTP 429 and a JSON-RPC error.
	 * Stale buckets are pruned lazily to keep memory bounded. This is intended
	 * as a basic safeguard for the authenticated /mcp proxy endpoint and is not
	 * a substitute for an edge/CDN rate limiter in production.
	 */
	private createRateLimiter(
		options: { windowMs?: number; max?: number } = {}
	): (req: Request, res: Response, next: NextFunction) => void {
		const windowMs = options.windowMs ?? 60_000;
		const max = options.max ?? 60;
		const hits = new Map<string, { count: number; resetAt: number }>();

		return (req: Request, res: Response, next: NextFunction): void => {
			const now = Date.now();
			const key = req.ip ?? req.socket.remoteAddress ?? 'unknown';

			// Lazily prune expired buckets to bound memory usage.
			if (hits.size > 10_000) {
				for (const [k, v] of hits) {
					if (v.resetAt <= now) {
						hits.delete(k);
					}
				}
			}

			const entry = hits.get(key);
			if (!entry || entry.resetAt <= now) {
				hits.set(key, { count: 1, resetAt: now + windowMs });
				next();
				return;
			}

			if (entry.count >= max) {
				const retryAfterSec = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
				res.setHeader('Retry-After', String(retryAfterSec));
				res.status(429).json({
					jsonrpc: '2.0',
					id: req.body?.id ?? null,
					error: {
						code: -32029,
						message: 'Too many requests'
					}
				});
				return;
			}

			entry.count += 1;
			next();
		};
	}

	/**
	 * Setup Express routes
	 */
	private setupRoutes(): void {
		// Health check endpoint
		this.app.get('/health', this.handleHealthCheck.bind(this));

		// OAuth discovery endpoint (for ChatGPT to discover OAuth configuration)
		this.app.get('/.well-known/oauth-authorization-server', this.handleOAuthDiscovery.bind(this));

		// MCP endpoint (main proxy endpoint) - rate limited to mitigate abuse
		this.app.post('/mcp', this.createRateLimiter(), this.handleMcpRequest.bind(this));

		// OAuth callback endpoint
		this.app.get('/oauth2/callback', this.handleOAuthCallback.bind(this));

		// OAuth authorization endpoint (redirects to OAuth server)
		this.app.get('/oauth2/authorize', this.handleOAuthAuthorize.bind(this));

		// Server info endpoint
		this.app.get('/info', this.handleServerInfo.bind(this));

		// Resources endpoint (HTML components)
		this.app.get('/resources', (req, res) => {
			this.componentResources.handleHttpResourceRequest(req, res);
		});

		// 404 handler
		this.app.use((req: Request, res: Response) => {
			res.status(404).json({
				error: 'Not Found',
				message: `Endpoint ${req.method} ${req.path} not found`
			});
		});
	}

	/**
	 * Setup error handling
	 */
	private setupErrorHandling(): void {
		this.app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
			logger.error({
				error: err.message,
				stack: err.stack,
				path: req.path,
				method: req.method
			}, 'Request error');

			res.status(500).json({
				error: 'Internal Server Error',
				message: this.config.isDevelopment ? err.message : 'An error occurred'
			});
		});
	}

	/**
	 * Handle health check
	 */
	private async handleHealthCheck(_req: Request, res: Response): Promise<void> {
		try {
			// Check if MCP server is healthy
			const mcpHealthy = await this.mcpProxy.healthCheck();

			res.json({
				status: 'ok',
				service: 'ever-teams-chatgpt-app',
				version: '0.1.0',
				timestamp: new Date().toISOString(),
				mcp: {
					url: this.mcpProxy.getServerUrl(),
					healthy: mcpHealthy
				},
				oauth: {
					url: this.config.oauthServerUrl
				}
			});
		} catch (error) {
			res.status(503).json({
				status: 'error',
				service: 'ever-teams-chatgpt-app',
				error: error instanceof Error ? error.message : 'Unknown error'
			});
		}
	}

	/**
	 * Handle MCP requests (main endpoint)
	 */
	private async handleMcpRequest(req: Request, res: Response): Promise<void> {
		try {
			// Extract request data
			const mcpRequest: McpRequest = req.body;
			const { method, params } = mcpRequest;

			// Get client information
			const clientInfo: ClientInfo = ClientDetector.getClientInfo(req);

			// Extract authentication token
			const authToken = ClientDetector.extractAuthToken(req);

			logger.info({
				method,
				isChatGPT: clientInfo.isChatGPT,
				hasAuth: !!authToken
			}, 'Processing MCP request');

			// Forward request to MCP server
			let mcpResponse: any;

			if (method === 'tools/list') {
				// List available tools
				mcpResponse = await this.mcpProxy.listTools(authToken);

				// Enhance tools list if ChatGPT client
				if (clientInfo.isChatGPT) {
					mcpResponse.tools = MetaEnhancer.enhanceToolsList(
						mcpResponse.tools,
						clientInfo
					);
				}
			} else if (method === 'tools/call') {
				// Validate params for malformed JSON-RPC requests
				if (!params || typeof params !== 'object' || typeof params.name !== 'string') {
					const invalidParamsResponse: McpResponse = {
						jsonrpc: '2.0',
						id: mcpRequest.id ?? null,
						error: {
							code: -32602,
							message: 'Invalid params: "name" is required for tools/call'
						}
					};
					res.status(400).json(invalidParamsResponse);
					return;
				}

				// Call a specific tool
				const toolName = params.name;
				const toolArgs = params.arguments || {};

				mcpResponse = await this.mcpProxy.callTool(
					toolName,
					toolArgs,
					authToken
				);

				// Enhance tool response if ChatGPT client
				if (clientInfo.isChatGPT) {
					mcpResponse = MetaEnhancer.enhanceToolResponse(
						toolName,
						mcpResponse,
						clientInfo
					);
				}
			} else if (method === 'initialize') {
				// Initialize MCP connection
				mcpResponse = await this.mcpProxy.initialize(params.clientInfo);
			} else if (method === 'prompts/list') {
				// List prompts
				mcpResponse = await this.mcpProxy.listPrompts(authToken);
			} else if (method === 'prompts/get') {
				// Get a prompt
				mcpResponse = await this.mcpProxy.getPrompt(
					params.name,
					params.arguments,
					authToken
				);
			} else if (method === 'resources/list') {
				// List resources - include both local components and MCP server resources
				const localResources = this.componentResources.handleResourceList();

				try {
					// Also get resources from MCP server
					const mcpResources = await this.mcpProxy.listResources(authToken);

					// Combine resources
					mcpResponse = {
						resources: [
							...localResources.resources,
							...(mcpResources.resources || [])
						]
					};
				} catch (error) {
					// If MCP server fails, just return local resources
					logger.warn({
						error: error instanceof Error ? error.message : String(error)
					}, 'Failed to list MCP resources, returning only local components');
					mcpResponse = localResources;
				}
			} else if (method === 'resources/read') {
				// Read a resource - check if it's a local component first
				const resourceUri = params.uri;

				if (resourceUri && resourceUri.startsWith('component://')) {
					// Local component resource
					mcpResponse = this.componentResources.handleResourceRead(resourceUri);
				} else {
					// MCP server resource
					mcpResponse = await this.mcpProxy.readResource(resourceUri, authToken);
				}
			} else {
				// Generic forward for any other method
				mcpResponse = await this.mcpProxy.forwardRequest(
					method,
					params,
					authToken
				);
			}

			// Return JSON-RPC response
			const response: McpResponse = {
				jsonrpc: '2.0',
				id: mcpRequest.id,
				result: mcpResponse
			};

			logger.info({
				method,
				success: true
			}, 'MCP request completed');

			res.json(response);
		} catch (error) {
			logger.error({
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined
			}, 'MCP request failed');

			// Return JSON-RPC error response
			const errorResponse: McpResponse = {
				jsonrpc: '2.0',
				id: req.body.id || null,
				error: {
					code: -32603,
					message: error instanceof Error ? error.message : 'Internal error',
					data: this.config.isDevelopment && error instanceof Error
						? { stack: error.stack }
						: undefined
				}
			};

			res.status(500).json(errorResponse);
		}
	}

	/**
	 * Handle OAuth authorization (redirect to OAuth server)
	 */
	private handleOAuthAuthorize(req: Request, res: Response): void {
		try {
			// Build OAuth authorization URL
			const authUrl = new URL(`${this.config.oauthServerUrl}/oauth2/authorize`);

			// Forward all query parameters
			Object.entries(req.query).forEach(([key, value]) => {
				authUrl.searchParams.set(key, String(value));
			});

			logger.info({
				url: authUrl.toString()
			}, 'Redirecting to OAuth server');

			res.redirect(authUrl.toString());
		} catch (error) {
			logger.error({
				error: error instanceof Error ? error.message : String(error)
			}, 'OAuth authorize error');

			res.status(500).json({
				error: 'OAuth authorization failed',
				message: error instanceof Error ? error.message : 'Unknown error'
			});
		}
	}

	/**
	 * Handle OAuth callback (from OAuth server)
	 */
	private handleOAuthCallback(req: Request, res: Response): void {
		try {
			const { code, state, error } = req.query;

			if (error) {
				logger.error({ error }, 'OAuth callback error');
				res.status(400).json({
					error: 'OAuth authorization failed',
					details: error
				});
				return;
			}

			if (!code) {
				res.status(400).json({
					error: 'Missing authorization code'
				});
				return;
			}

			logger.info({
				hasCode: !!code,
				hasState: !!state
			}, 'OAuth callback received');

			// In a full implementation, you would exchange the code for tokens here
			// For now, return success
			res.json({
				success: true,
				message: 'Authorization successful',
				code
			});
		} catch (error) {
			logger.error({
				error: error instanceof Error ? error.message : String(error)
			}, 'OAuth callback error');

			res.status(500).json({
				error: 'OAuth callback failed',
				message: error instanceof Error ? error.message : 'Unknown error'
			});
		}
	}

	/**
	 * Handle OAuth discovery (well-known endpoint)
	 * Returns OAuth server metadata for ChatGPT to discover configuration
	 */
	private handleOAuthDiscovery(_req: Request, res: Response): void {
		try {
			// Return OAuth 2.0 Authorization Server Metadata
			// https://www.rfc-editor.org/rfc/rfc8414.html
			// IMPORTANT: issuer must match the actual OAuth server that issues tokens
			res.json({
				issuer: this.config.oauthServerUrl,
				authorization_endpoint: `${this.config.oauthServerUrl}/oauth2/authorize`,
				token_endpoint: `${this.config.oauthServerUrl}/oauth2/token`,
				jwks_uri: `${this.config.oauthServerUrl}/.well-known/jwks.json`,
				token_endpoint_auth_methods_supported: ['client_secret_post', 'client_secret_basic'],
				grant_types_supported: ['authorization_code', 'refresh_token', 'client_credentials'],
				response_types_supported: ['code'],
				scopes_supported: ['openid', 'profile', 'email', 'mcp.read', 'mcp.write', 'mcp.admin'],
				code_challenge_methods_supported: ['S256', 'plain']
			});

			logger.info({
				issuer: this.config.oauthServerUrl
			}, 'OAuth discovery metadata returned');
		} catch (error) {
			logger.error({
				error: error instanceof Error ? error.message : String(error)
			}, 'OAuth discovery error');

			res.status(500).json({
				error: 'Failed to retrieve OAuth configuration',
				message: error instanceof Error ? error.message : 'Unknown error'
			});
		}
	}

	/**
	 * Handle server info request
	 */
	private handleServerInfo(_req: Request, res: Response): void {
		res.json({
			name: 'Ever-Teams ChatGPT App',
			version: '0.1.0',
			description: 'Middleware for ChatGPT integration with MCP Server',
			mcp: {
				server: this.config.mcpServerUrl,
				protocol: 'MCP'
			},
			oauth: {
				server: this.config.oauthServerUrl
			},
			environment: this.config.environment
		});
	}

	/**
	 * Start the server
	 */
	async start(): Promise<void> {
		return new Promise((resolve) => {
			this.app.listen(this.config.port, this.config.host, () => {
				logger.info({
					host: this.config.host,
					port: this.config.port,
					environment: this.config.environment,
					mcpServer: this.config.mcpServerUrl,
					oauthServer: this.config.oauthServerUrl
				}, 'ChatGPT App Server started');

				console.log('');
				console.log('🚀 Ever-Teams ChatGPT App Server');
				console.log('================================');
				console.log(`🌐 Server: http://${this.config.host}:${this.config.port}`);
				console.log(`🔧 MCP Server: ${this.config.mcpServerUrl}`);
				console.log(`🔐 OAuth Server: ${this.config.oauthServerUrl}`);
				console.log(`📊 Environment: ${this.config.environment}`);
				console.log('================================');
				console.log('');
				console.log('Endpoints:');
				console.log(`  GET  /health         - Health check`);
				console.log(`  POST /mcp            - MCP proxy endpoint`);
				console.log(`  GET  /oauth/authorize - OAuth authorization`);
				console.log(`  GET  /oauth/callback  - OAuth callback`);
				console.log(`  GET  /info           - Server information`);
				console.log('');

				resolve();
			});
		});
	}

	/**
	 * Stop the server
	 */
	async stop(): Promise<void> {
		logger.info('Stopping ChatGPT App Server');
		// Add graceful shutdown logic if needed
	}

	/**
	 * Get Express app instance
	 */
	getApp(): express.Application {
		return this.app;
	}
}
