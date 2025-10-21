#!/usr/bin/env node

/**
 * Script to verify that all variables from .env.local are in Docker files
 */

const path = require('node:path');
const YAML = require('yaml');
const { detectEnvironment, checkFileExists, safeReadFile, getEnvVars } = require('./env-utils.js');

console.log('DOCKER VARIABLES VERIFICATION\n');

const ENV_MODE = detectEnvironment();
console.log(`Environment Mode: ${ENV_MODE.toUpperCase()}\n`);

// Get environment variables using shared utility
const { envVars, envFile } = getEnvVars();

let hasErrors = false;
const fileResults = [];

// 2. Check Dockerfile
console.log('CHECKING DOCKERFILE:');
const dockerfilePath = path.join(process.cwd(), 'Dockerfile');

if (checkFileExists(dockerfilePath)) {
	const content = safeReadFile(dockerfilePath);

	if (content !== null) {
		// Only check build-time variables (NEXT_PUBLIC_ and specific build vars)
		const buildTimeVars = envVars.filter(
			(varName) =>
				varName.startsWith('NEXT_PUBLIC_') ||
				varName.startsWith('NEXT_') ||
				[
					'APP_NAME',
					'APP_SIGNATURE',
					'APP_LOGO_URL',
					'APP_LINK',
					'APP_SLOGAN_TEXT',
					'COMPANY_NAME',
					'COMPANY_LINK',
					'TERMS_LINK',
					'PRIVACY_POLICY_LINK',
					'MAIN_PICTURE',
					'MAIN_PICTURE_DARK',
					'NODE_ENV',
					'DEMO'
				].includes(varName)
		);

		const missingInDockerfile = buildTimeVars.filter((varName) => {
			const argPattern = new RegExp(`^\\s*ARG\\s+${varName}\\b`, 'm');
			const envPattern = new RegExp(`^\\s*ENV\\s+${varName}\\b`, 'm');
			return !(argPattern.test(content) || envPattern.test(content));
		});

		if (missingInDockerfile.length === 0) {
			console.log(
				`   ✅ All build-time variables present in Dockerfile (${buildTimeVars.length}/${envVars.length} checked)`
			);
			fileResults.push({ file: 'Dockerfile', missing: 0, status: 'ok' });
		} else {
			console.log(`   ❌ Missing build-time variables in Dockerfile (${missingInDockerfile.length}):`);
			missingInDockerfile.forEach((varName) => {
				console.log(`      - ${varName}`);
			});
			fileResults.push({
				file: 'Dockerfile',
				missing: missingInDockerfile.length,
				status: 'error',
				vars: missingInDockerfile
			});
			hasErrors = true;
		}
	} else {
		hasErrors = true;
	}
} else {
	console.log('   ❌ Dockerfile not found');
	console.log('   This is a critical file for Docker builds');
	hasErrors = true;
}

// 3. Check docker-compose files
console.log('\nCHECKING DOCKER-COMPOSE FILES:');
const dockerComposeFiles = ['docker-compose.yml', 'docker-compose.build.yml', 'docker-compose.demo.yml'];

dockerComposeFiles.forEach((fileName) => {
	const filePath = path.join(process.cwd(), fileName);
	console.log(`\n   ${fileName}:`);

	if (checkFileExists(filePath)) {
		const content = safeReadFile(filePath);

		if (content !== null) {
			let missing = [];
			try {
				const doc = YAML.parse(content);
				const envNames = new Set();
				const services = doc?.services || {};

				// Extract environment variables from all services
				for (const service of Object.values(services)) {
					// Check environment section
					const env = service?.environment;
					if (Array.isArray(env)) {
						env.forEach((e) => {
							const varName = String(e).split('=')[0].trim();
							if (varName) envNames.add(varName);
						});
					} else if (env && typeof env === 'object') {
						Object.keys(env).forEach((k) => envNames.add(k));
					}

					// Check build.args section
					const args = service?.build?.args;
					if (Array.isArray(args)) {
						args.forEach((a) => {
							const varName = String(a).split('=')[0].trim();
							if (varName) envNames.add(varName);
						});
					} else if (args && typeof args === 'object') {
						Object.keys(args).forEach((k) => envNames.add(k));
					}
				}

				missing = envVars.filter((v) => !envNames.has(v));
			} catch (error) {
				console.log('      ⚠️  Could not parse YAML; falling back to naive search');
				missing = envVars.filter(
					(varName) => !content.includes(`${varName}:`) && !content.includes(`${varName} `)
				);
			}

			if (missing.length === 0) {
				console.log(`      ✅ All variables present`);
				fileResults.push({ file: fileName, missing: 0, status: 'ok' });
			} else {
				console.log(`      ❌ Missing variables (${missing.length}):`);
				missing.forEach((varName) => {
					console.log(`         - ${varName}`);
				});
				fileResults.push({ file: fileName, missing: missing.length, status: 'error', vars: missing });
				hasErrors = true;
			}
		} else {
			hasErrors = true;
		}
	} else {
		console.log(`      File not found`);
		console.log(`      This file may be optional depending on your Docker setup`);
	}
});

// 4. Global summary
console.log('\n' + '='.repeat(60));
console.log('DOCKER SUMMARY:');
console.log(`Total variables in ${envFile.name}: ${envVars.length}`);

const totalMissing = fileResults.reduce((sum, result) => sum + (result.missing || 0), 0);

console.log('\nFile Status:');
fileResults.forEach((result) => {
	if (result.status === 'ok') {
		console.log(`✅ ${result.file}: All variables present`);
	} else if (result.status === 'error') {
		console.log(`❌ ${result.file}: ${result.missing} missing variables`);
	}
});

// Exit with appropriate code
console.log('\n' + '='.repeat(60));
if (hasErrors) {
	console.log(`❌ ${totalMissing} missing variables detected in Docker files`);
	console.log('Please update Docker configurations to include all environment variables\n');
	process.exit(1);
} else {
	console.log('✅ All variables are properly configured in Docker files\n');
	process.exit(0);
}
