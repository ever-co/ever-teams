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
	sessionSecret: process.env.SESSION_SECRET || 'default-secret-change-in-production'
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
