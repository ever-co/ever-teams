#!/usr/bin/env node

import { ChatGPTAppServer } from './server/chatgpt-app-server.js';
import { config, validateConfig } from './config/environment.js';
import { logger } from './config/logger.js';

/**
 * Main entry point for the Ever-Teams ChatGPT App
 */
async function main() {
	try {
		// Validate configuration
		logger.info('Validating configuration...');
		validateConfig();

		// Create and start server
		logger.info('Starting ChatGPT App Server...');
		const server = new ChatGPTAppServer(config);
		await server.start();

		// Handle graceful shutdown
		setupShutdownHandlers(server);
	} catch (error) {
		logger.error({
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined
		}, 'Failed to start server');

		console.error('');
		console.error('❌ Failed to start ChatGPT App Server');
		console.error('');
		console.error(error instanceof Error ? error.message : String(error));
		console.error('');

		process.exit(1);
	}
}

/**
 * Setup handlers for graceful shutdown
 */
function setupShutdownHandlers(server: ChatGPTAppServer) {
	const shutdown = async (signal: string) => {
		logger.info(`Received ${signal}, shutting down gracefully...`);

		try {
			await server.stop();
			logger.info('Server stopped successfully');
			process.exit(0);
		} catch (error) {
			logger.error({
				error: error instanceof Error ? error.message : String(error)
			}, 'Error during shutdown');
			process.exit(1);
		}
	};

	// Handle different shutdown signals
	process.on('SIGTERM', () => shutdown('SIGTERM'));
	process.on('SIGINT', () => shutdown('SIGINT'));

	// Handle uncaught errors
	process.on('uncaughtException', (error: Error) => {
		logger.error({
			error: error.message,
			stack: error.stack
		}, 'Uncaught exception');
		process.exit(1);
	});

	process.on('unhandledRejection', (reason: any) => {
		logger.error({
			reason: String(reason)
		}, 'Unhandled rejection');
		process.exit(1);
	});
}

// Start the application
main();
