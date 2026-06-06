import { Request } from 'express';
import { createLogger } from '../config/logger.js';

const logger = createLogger('ClientDetector');

/**
 * Client information extracted from request
 */
export interface ClientInfo {
	userAgent: string | undefined;
	clientType: string | undefined;
	isChatGPT: boolean;
	origin: string | undefined;
	locale: string;
	appVersion: string | undefined;
}

/**
 * Client Detector
 *
 * Detects if incoming requests are from ChatGPT or other MCP clients.
 * This allows us to conditionally add ChatGPT-specific metadata (_meta fields)
 * only when the request is from ChatGPT, keeping responses clean for other clients.
 */
export class ClientDetector {
	/**
	 * Detect if the request is from ChatGPT
	 *
	 * ChatGPT includes specific identifiers in:
	 * - User-Agent header (e.g., "ChatGPT/1.0" or "OpenAI-Apps")
	 * - Custom headers (e.g., "X-OpenAI-Request", "X-Client-Type")
	 * - Origin header (e.g., "https://chat.openai.com" or "https://chatgpt.com")
	 */
	static isChatGPTRequest(req: Request): boolean {
		const userAgentHeader = req.headers['user-agent'];
		const userAgent = Array.isArray(userAgentHeader)
			? userAgentHeader.join(' ').toLowerCase()
			: (userAgentHeader || '').toLowerCase();

		const clientTypeHeader = req.headers['x-client-type'];
		const clientType = Array.isArray(clientTypeHeader)
			? clientTypeHeader.join(' ').toLowerCase()
			: (clientTypeHeader || '').toLowerCase();

		const originHeader = req.headers['origin'];
		const origin = Array.isArray(originHeader)
			? originHeader.join(' ').toLowerCase()
			: (originHeader || '').toLowerCase();

		const refererHeader = req.headers['referer'];
		const referer = Array.isArray(refererHeader)
			? refererHeader.join(' ').toLowerCase()
			: (refererHeader || '').toLowerCase();

		// Check for ChatGPT-specific identifiers
		const isChatGPT =
			// User-Agent contains ChatGPT or OpenAI
			userAgent.includes('chatgpt') ||
			userAgent.includes('openai') ||
			userAgent.includes('openai-apps') ||
			// Client type header
			clientType === 'chatgpt' ||
			clientType === 'openai' ||
			// OpenAI-specific request header
			req.headers['x-openai-request'] !== undefined ||
			req.headers['x-openai-app-id'] !== undefined ||
			// Origin is from OpenAI domains
			origin.includes('chat.openai.com') ||
			origin.includes('chatgpt.com') ||
			origin.includes('openai.com') ||
			// Referer is from OpenAI domains
			referer.includes('chat.openai.com') ||
			referer.includes('chatgpt.com');

		logger.debug({
			userAgent,
			clientType,
			origin,
			isChatGPT
		}, 'Client detection');

		return isChatGPT;
	}

	/**
	 * Extract full client information from request
	 */
	static getClientInfo(req: Request): ClientInfo {
		const isChatGPT = this.isChatGPTRequest(req);
		const locale = this.extractLocale(req);

		const clientInfo: ClientInfo = {
			userAgent: req.headers['user-agent'],
			clientType: req.headers['x-client-type'] as string | undefined,
			isChatGPT,
			origin: req.headers['origin'] as string | undefined,
			locale,
			appVersion: req.headers['x-app-version'] as string | undefined
		};

		if (isChatGPT) {
			logger.info({
				origin: clientInfo.origin,
				locale: clientInfo.locale
			}, 'ChatGPT client detected');
		}

		return clientInfo;
	}

	/**
	 * Extract locale from request headers
	 *
	 * Priority:
	 * 1. X-Locale header (if set by client)
	 * 2. Accept-Language header
	 * 3. Default to 'en-US'
	 */
	static extractLocale(req: Request): string {
		// Check custom locale header
		const customLocale = req.headers['x-locale'];
		if (customLocale) {
			return String(customLocale);
		}

		// Parse Accept-Language header
		const acceptLanguage = req.headers['accept-language'];
		if (acceptLanguage) {
			// Accept-Language format: "en-US,en;q=0.9,es;q=0.8"
			// We take the first (highest priority) language
			const languages = String(acceptLanguage).split(',');
			if (languages.length > 0) {
				const primaryLanguage = languages[0].split(';')[0].trim();
				return primaryLanguage;
			}
		}

		// Default locale
		return 'en-US';
	}

	/**
	 * Check if the request origin is allowed
	 */
	static isOriginAllowed(req: Request, allowedOrigins: string[]): boolean {
		const origin = req.headers['origin'];

		if (!origin) {
			// No origin header, allow (e.g., server-to-server requests)
			return true;
		}

		// Check if origin matches allowed list
		const isAllowed =
			allowedOrigins.includes('*') ||
			allowedOrigins.some((allowed) => {
				if (allowed === '*') return true;
				if (allowed.endsWith('*')) {
					// Wildcard subdomain matching
					const domain = allowed.slice(0, -1);
					return origin.includes(domain);
				}
				return origin === allowed;
			});

		if (!isAllowed) {
			logger.warn({ origin, allowedOrigins }, 'Origin not allowed');
		}

		return isAllowed;
	}

	/**
	 * Extract authentication token from request
	 */
	static extractAuthToken(req: Request): string | undefined {
		const authHeader = req.headers['authorization'];

		if (!authHeader) {
			return undefined;
		}

		// Check for Bearer token
		if (authHeader.startsWith('Bearer ')) {
			return authHeader.substring(7);
		}

		// Check for Basic auth (less common for OAuth)
		if (authHeader.startsWith('Basic ')) {
			logger.warn('Basic authentication not supported, use Bearer token');
			return undefined;
		}

		return undefined;
	}

	/**
	 * Get request metadata for logging
	 */
	static getRequestMetadata(req: Request): Record<string, any> {
		return {
			method: req.method,
			path: req.path,
			userAgent: req.headers['user-agent'],
			origin: req.headers['origin'],
			referer: req.headers['referer'],
			ip: req.ip,
			clientInfo: this.getClientInfo(req)
		};
	}
}
