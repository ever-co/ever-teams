#!/usr/bin/env node

/**
 * Script to verify that all variables from .env.local are in Docker files
 */

const path = require('node:path');
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
		const missingInDockerfile = envVars.filter((varName) => !content.includes(`ARG ${varName}`));

		if (missingInDockerfile.length === 0) {
			console.log('   ✅ All variables present in Dockerfile');
			fileResults.push({ file: 'Dockerfile', missing: 0, status: 'ok' });
		} else {
			console.log(`   ❌ Missing variables in Dockerfile (${missingInDockerfile.length}):`);
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
			const missing = envVars.filter(
				(varName) => !content.includes(`${varName}:`) && !content.includes(`${varName} `)
			);

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
