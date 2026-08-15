import type { DestinationStream, Logger as PinoLogger } from 'pino';
import logtail from '@logtail/pino';
import pino from 'pino';
import pretty from 'pino-pretty';
import { config } from './environment.js';

// Check if we have Logtail token for production logging
const LOGTAIL_SOURCE_TOKEN = process.env.LOGTAIL_SOURCE_TOKEN;

let stream: DestinationStream;

// Create pino stream with optional Logtail integration
if (LOGTAIL_SOURCE_TOKEN) {
	// Initialize Logtail stream for production logging
	stream = pino.multistream([
		await logtail({
			sourceToken: LOGTAIL_SOURCE_TOKEN,
			options: {
				sendLogsToBetterStack: true
			}
		}),
		{
			stream: pretty({ colorize: true })
		}
	]);
} else {
	// Development mode: use pretty print only
	stream = pretty({
		colorize: true
	});
}

/**
 * Pino logger instance for the application
 */
export const logger = pino(
	{
		level: config.logLevel,
		base: { service: 'chatgpt-app' }
	},
	stream
);

/**
 * Create a child logger with a specific context
 */
export function createLogger(context: string): PinoLogger {
	return logger.child({ context });
}
