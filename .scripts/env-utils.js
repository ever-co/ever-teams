/**
 * Shared utilities for environment variable detection and file operations
 */

const fs = require('node:fs');
const path = require('node:path');

// Detect environment mode
const detectEnvironment = () => {
	const nodeEnv = process.env.NODE_ENV;
	if (nodeEnv === 'production') return 'prod';
	if (nodeEnv === 'development') return 'dev';
	if (process.env.CI === 'true') return 'ci';
	return 'dev';
};

// Helper function to check file existence
const checkFileExists = (filePath) => {
	try {
		return fs.existsSync(filePath);
	} catch (error) {
		console.error(`Error checking file: ${error.message}`);
		return false;
	}
};

// Helper function to safely read file
const safeReadFile = (filePath) => {
	try {
		return fs.readFileSync(filePath, 'utf8');
	} catch (error) {
		console.error(`Error reading file: ${error.message}`);
		return null;
	}
};

// Detect and read environment variables file
const detectEnvFile = () => {
	const envFiles = ['apps/web/.env.local', 'apps/web/.env', 'apps/web/.env.sample'];

	for (const envFile of envFiles) {
		const fullPath = path.join(process.cwd(), envFile);
		if (checkFileExists(fullPath)) {
			console.log(`📄 Using environment file: ${envFile}`);
			return { path: fullPath, name: envFile };
		}
	}

	console.log('❌ No environment file found');
	console.log('Searched for: .env.local, .env, .env.sample in apps/web/\n');
	process.exit(1);
};

// Parse environment variables from content
const parseEnvVars = (envContent) => {
	const envVars = [];

	envContent.split('\n').forEach((line) => {
		line = line.trim();
		if (line && !line.startsWith('#') && line.includes('=')) {
			const varName = line.split('=')[0].trim();
			if (varName) {
				envVars.push(varName);
			}
		}
	});

	return envVars;
};

// Get environment variables with automatic detection
const getEnvVars = () => {
	const envFile = detectEnvFile();
	const envContent = safeReadFile(envFile.path);
	
	if (!envContent) {
		console.log(`❌ Unable to read ${envFile.name} file\n`);
		process.exit(1);
	}

	const envVars = parseEnvVars(envContent);
	console.log(`Variables found in ${envFile.name}: ${envVars.length}\n`);
	
	return { envVars, envFile };
};

module.exports = {
	detectEnvironment,
	checkFileExists,
	safeReadFile,
	detectEnvFile,
	parseEnvVars,
	getEnvVars
};
