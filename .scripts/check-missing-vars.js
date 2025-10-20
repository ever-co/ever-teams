#!/usr/bin/env node

/**
 * Script to check which variables from .env.local are missing in deployments
 */

const fs = require('node:fs');
const path = require('node:path');

console.log('ANALYSIS OF MISSING VARIABLES IN DEPLOYMENTS\n');

// Detect environment mode
const detectEnvironment = () => {
	const nodeEnv = process.env.NODE_ENV;
	if (nodeEnv === 'production') return 'prod';
	if (nodeEnv === 'development') return 'dev';
	if (process.env.CI === 'true') return 'ci';
	return 'dev';
};

const ENV_MODE = detectEnvironment();
console.log(`Environment Mode: ${ENV_MODE.toUpperCase()}\n`);

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

// 1. Read all variables from .env.local
const envLocalPath = path.join(process.cwd(), 'apps/web/.env.local');

if (!checkFileExists(envLocalPath)) {
	console.log('❌ File .env.local not found');
	console.log('This file is required to compare with deployment configurations\n');
	process.exit(1);
}

const envLocalContent = safeReadFile(envLocalPath);
if (!envLocalContent) {
	console.log('❌ Unable to read .env.local file\n');
	process.exit(1);
}

const envLocalVars = [];

// Parse variables (ignore comments and empty lines)
envLocalContent.split('\n').forEach((line) => {
	line = line.trim();
	if (line && !line.startsWith('#') && line.includes('=')) {
		const varName = line.split('=')[0].trim();
		if (varName) {
			envLocalVars.push(varName);
		}
	}
});

console.log(`Variables found in .env.local: ${envLocalVars.length}`);
console.log('Variables:', envLocalVars.join(', '));

// 2. Check K8s manifests
console.log('\nCHECKING K8S MANIFESTS:');
const k8sFiles = [
	'.deploy/k8s/k8s-manifest.dev.yaml',
	'.deploy/k8s/k8s-manifest.prod.yaml',
	'.deploy/k8s/k8s-manifest.stage.yaml'
];

const missingInK8s = new Set();

k8sFiles.forEach((filePath) => {
	const fullPath = path.join(process.cwd(), filePath);
	console.log(`\n   ${filePath}:`);

	if (checkFileExists(fullPath)) {
		const content = safeReadFile(fullPath);

		if (content !== null) {
			const missing = envLocalVars.filter((varName) => !content.includes(`- name: ${varName}`));

			if (missing.length === 0) {
				console.log(`      ✅ All variables present`);
			} else {
				console.log(`      ❌ Missing variables (${missing.length}):`);
				missing.forEach((varName) => {
					console.log(`         - ${varName}`);
					missingInK8s.add(varName);
				});
			}
		}
	} else {
		console.log(`      File not found`);
		console.log(`      This manifest may not be needed for ${ENV_MODE} environment`);
	}
});

// 3. Check GitHub Actions
console.log('\nCHECKING GITHUB ACTIONS:');
const workflowFiles = [
	'.github/workflows/deploy-do-dev.yml',
	'.github/workflows/deploy-do-prod.yml',
	'.github/workflows/deploy-do-stage.yml'
];

const missingInGHA = new Set();

workflowFiles.forEach((filePath) => {
	const fullPath = path.join(process.cwd(), filePath);
	console.log(`\n   ${filePath}:`);

	if (checkFileExists(fullPath)) {
		const content = safeReadFile(fullPath);

		if (content !== null) {
			const missing = envLocalVars.filter(
				(varName) => !content.includes(`${varName}: "\${{ secrets.${varName} }}"`)
			);

			if (missing.length === 0) {
				console.log(`      ✅ All variables present`);
			} else {
				console.log(`      ❌ Missing variables (${missing.length}):`);
				missing.forEach((varName) => {
					console.log(`         - ${varName}`);
					missingInGHA.add(varName);
				});
			}
		}
	} else {
		console.log(`      File not found`);
		console.log(`      This workflow may not be configured yet`);
	}
});

// 4. Global summary
console.log('\n' + '='.repeat(60));
console.log('GLOBAL SUMMARY:');
console.log(`Total variables in .env.local: ${envLocalVars.length}`);
console.log(`Variables missing in K8s: ${missingInK8s.size}`);
console.log(`Variables missing in GitHub Actions: ${missingInGHA.size}`);

if (missingInK8s.size > 0) {
	console.log('\n❌ VARIABLES MISSING IN K8S:');
	Array.from(missingInK8s)
		.sort()
		.forEach((varName) => {
			console.log(`   - ${varName}`);
		});
}

if (missingInGHA.size > 0) {
	console.log('\n❌ VARIABLES MISSING IN GITHUB ACTIONS:');
	Array.from(missingInGHA)
		.sort()
		.forEach((varName) => {
			console.log(`   - ${varName}`);
		});
}

// 5. Common missing variables
const commonMissing = Array.from(missingInK8s).filter((varName) => missingInGHA.has(varName));
if (commonMissing.length > 0) {
	console.log('\n⚠️  VARIABLES MISSING EVERYWHERE:');
	commonMissing.sort().forEach((varName) => {
		console.log(`   - ${varName}`);
	});
	console.log('\nThese variables need to be added to all deployment configurations');
}

// Exit with appropriate code
console.log('\n' + '='.repeat(60));
if (missingInK8s.size > 0 || missingInGHA.size > 0) {
	console.log('❌ Missing variables detected - please update deployment configurations\n');
	process.exit(1);
} else {
	console.log('✅ All variables are properly configured in deployments\n');
	process.exit(0);
}
