import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env.local') });
dotenv.config({ path: path.join(__dirname, '../../.env') });

export interface AppConfig {
	// Server configuration
	port: number;
	host: string;
	publicUrl: string | undefined;

	// Existing infrastructure URLs
	mcpServerUrl: string;
	oauthServerUrl: string;

	// ChatGPT App credentials
	chatgptAppId: string | undefined;
	chatgptAppSecret: string | undefined;

	// CORS configuration
	allowedOrigins: string[];

	// Environment
	environment: string;
	isDevelopment: boolean;
	isProduction: boolean;

	// Logging
	logLevel: string;

	// Security
	sessionSecret: string;

	// ChatGPT widget metadata (`openai/widgetDomain` / `openai/widgetCSP`, see MetaEnhancer)
	widgetDomain: string;
	widgetCsp: string;
}

/**
 * Widget metadata of Ever's hosted deployment - the values used when the runtime env does not override them.
 * A self-hosted image sets CHATGPT_WIDGET_DOMAIN (and optionally CHATGPT_WIDGET_CSP) at runtime instead of
 * advertising Ever's domain.
 */
export const DEFAULT_CHATGPT_WIDGET_DOMAIN = 'ever.team';
export const DEFAULT_CHATGPT_WIDGET_CSP_SOURCES: readonly string[] = ['https://ever.team', 'https://*.gauzy.co'];

/**
 * Build the widget Content Security Policy allowing `'self'` plus the given sources
 * (the default sources produce exactly the policy the app always shipped with).
 */
export function buildWidgetCsp(sources: readonly string[]): string {
	return `default-src ${["'self'", ...sources].join(' ')}; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';`;
}

/**
 * Resolve the widget domain and CSP from the environment (read at runtime by the Node process, so a published
 * image is configured with `docker run -e ...`):
 * - CHATGPT_WIDGET_DOMAIN: the domain advertised as `openai/widgetDomain` (default: `ever.team`);
 * - CHATGPT_WIDGET_CSP: the full widget policy. When unset it allows `'self'` and the configured widget domain
 *   (served over https unless the value carries its own scheme), or Ever's hosts when no domain is configured.
 * Empty values count as unset.
 */
export function resolveWidgetConfig(
	env: NodeJS.ProcessEnv = process.env
): Pick<AppConfig, 'widgetDomain' | 'widgetCsp'> {
	const widgetDomain = env.CHATGPT_WIDGET_DOMAIN?.trim();
	const widgetCsp = env.CHATGPT_WIDGET_CSP?.trim();
	const widgetOrigin =
		widgetDomain && (/^[a-z][a-z\d+.-]*:\/\//i.test(widgetDomain) ? widgetDomain : `https://${widgetDomain}`);

	return {
		widgetDomain: widgetDomain || DEFAULT_CHATGPT_WIDGET_DOMAIN,
		widgetCsp: widgetCsp || buildWidgetCsp(widgetOrigin ? [widgetOrigin] : DEFAULT_CHATGPT_WIDGET_CSP_SOURCES)
	};
}

/**
 * Application configuration loaded from environment variables
 */
export const config: AppConfig = {
	// Server configuration
	port: parseInt(process.env.CHATGPT_APP_PORT || '3004', 10),
	host: process.env.CHATGPT_APP_HOST || 'localhost',
	publicUrl: process.env.PUBLIC_URL,

	// Existing infrastructure URLs
	mcpServerUrl: process.env.MCP_SERVER_URL || 'https://mcp.ever.team',
	oauthServerUrl: process.env.OAUTH_SERVER_URL || 'https://mcpauth.ever.team',

	// ChatGPT App credentials (from OpenAI Developer Platform)
	chatgptAppId: process.env.CHATGPT_APP_ID,
	chatgptAppSecret: process.env.CHATGPT_APP_SECRET,

	// CORS configuration
	allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || [
		'https://chat.openai.com',
		'https://chatgpt.com'
	],

	// Environment
	environment: process.env.NODE_ENV || 'development',
	isDevelopment: process.env.NODE_ENV !== 'production',
	isProduction: process.env.NODE_ENV === 'production',

	// Logging
	logLevel: process.env.LOG_LEVEL || 'info',

	// Security
	sessionSecret: process.env.SESSION_SECRET || 'default-secret-change-in-production',

	// ChatGPT widget metadata (CHATGPT_WIDGET_DOMAIN / CHATGPT_WIDGET_CSP)
	...resolveWidgetConfig(process.env)
};

/**
 * Validate required configuration
 */
export function validateConfig(): void {
	const required: Array<keyof AppConfig> = ['mcpServerUrl', 'oauthServerUrl'];

	const missing = required.filter((key) => !config[key]);

	if (missing.length > 0) {
		throw new Error(`Missing required configuration: ${missing.join(', ')}`);
	}

	if (config.isProduction) {
		// Additional production checks
		if (!config.chatgptAppId || !config.chatgptAppSecret) {
			console.warn('WARNING: ChatGPT App credentials not configured');
		}

		if (config.sessionSecret === 'default-secret-change-in-production') {
			throw new Error('SESSION_SECRET must be set in production');
		}
	}
}
