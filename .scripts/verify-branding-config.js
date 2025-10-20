#!/usr/bin/env node

/**
 * Branding Configuration Verification Script
 * Verifies that all environment variables are properly configured
 */

const fs = require('fs');
const path = require('path');

// List of required branding environment variables
const REQUIRED_BRANDING_VARS = [
	'APP_NAME',
	'NEXT_PUBLIC_APP_NAME',
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
	'NEXT_PUBLIC_SITE_NAME',
	'NEXT_PUBLIC_SITE_TITLE',
	'NEXT_PUBLIC_SITE_DESCRIPTION',
	'NEXT_PUBLIC_SITE_KEYWORDS',
	'NEXT_PUBLIC_WEB_APP_URL',
	'NEXT_PUBLIC_TWITTER_USERNAME',
	'NEXT_PUBLIC_IMAGES_HOSTS'
];

// Detect environment mode
const detectEnvironment = () => {
	const nodeEnv = process.env.NODE_ENV;
	if (nodeEnv === 'production') return 'prod';
	if (nodeEnv === 'development') return 'dev';

	// Check for common environment indicators
	if (process.env.CI === 'true') return 'ci';

	// Default to dev if not specified
	return 'dev';
};

const ENV_MODE = detectEnvironment();

console.log('BRANDING CONFIGURATION VERIFICATION\n');
console.log(`Environment Mode: ${ENV_MODE.toUpperCase()}\n`);

let hasErrors = false;
let hasWarnings = false;

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
		console.error(`   Error reading file: ${error.message}`);
		return null;
	}
};

// 1. Check .env.sample
console.log('1. Checking apps/web/.env.sample...');
const envSamplePath = path.join(process.cwd(), 'apps/web/.env.sample');

if (checkFileExists(envSamplePath)) {
	const envSampleContent = safeReadFile(envSamplePath);

	if (envSampleContent !== null) {
		const missingInSample = REQUIRED_BRANDING_VARS.filter((varName) => !envSampleContent.includes(`${varName}=`));

		if (missingInSample.length === 0) {
			console.log('   ✅ All variables are present');
		} else {
			console.log('   ❌ Missing variables:');
			missingInSample.forEach((varName) => console.log(`      - ${varName}`));
			hasErrors = true;
		}
	} else {
		hasErrors = true;
	}
} else {
	console.log('   ❌ File not found');
	console.log('   This file is required as a template for environment variables');
	hasErrors = true;
}

// 2. Check .env.local
console.log('\n2. Checking apps/web/.env.local...');
const envLocalPath = path.join(process.cwd(), 'apps/web/.env.local');

if (checkFileExists(envLocalPath)) {
	const envLocalContent = safeReadFile(envLocalPath);

	if (envLocalContent !== null) {
		const missingInLocal = REQUIRED_BRANDING_VARS.filter((varName) => !envLocalContent.includes(`${varName}=`));

		if (missingInLocal.length === 0) {
			console.log('   ✅ All variables are present');
		} else {
			console.log('   ❌ Missing variables:');
			missingInLocal.forEach((varName) => console.log(`      - ${varName}`));
			hasWarnings = true;
		}
	} else {
		hasWarnings = true;
	}
} else {
	console.log('   File not found (optional for local development)');
	console.log('   You may need to create this file from .env.sample');
	hasWarnings = true;
}

// 3. Check K8s manifests
console.log('\n3. Checking K8s manifests...');
const k8sFiles = [
	'.deploy/k8s/k8s-manifest.dev.yaml',
	'.deploy/k8s/k8s-manifest.prod.yaml',
	'.deploy/k8s/k8s-manifest.stage.yaml'
];

k8sFiles.forEach((filePath) => {
	const fullPath = path.join(process.cwd(), filePath);
	console.log(`   Checking ${filePath}...`);

	if (checkFileExists(fullPath)) {
		const content = safeReadFile(fullPath);

		if (content !== null) {
			const missingVars = REQUIRED_BRANDING_VARS.filter((varName) => !content.includes(`- name: ${varName}`));

			if (missingVars.length === 0) {
				console.log(`      ✅ All variables are present`);
			} else {
				console.log(`      ❌ Missing variables:`);
				missingVars.forEach((varName) => console.log(`         - ${varName}`));
				hasErrors = true;
			}
		} else {
			hasErrors = true;
		}
	} else {
		console.log(`      File not found`);
		console.log(`      This manifest may not be needed for ${ENV_MODE} environment`);
		hasWarnings = true;
	}
});

// 4. Check GitHub Actions workflows
console.log('\n4. Checking GitHub Actions workflows...');
const workflowFiles = [
	'.github/workflows/deploy-do-dev.yml',
	'.github/workflows/deploy-do-prod.yml',
	'.github/workflows/deploy-do-stage.yml'
];

workflowFiles.forEach((filePath) => {
	const fullPath = path.join(process.cwd(), filePath);
	console.log(`   Checking ${filePath}...`);

	if (checkFileExists(fullPath)) {
		const content = safeReadFile(fullPath);

		if (content !== null) {
			const missingVars = REQUIRED_BRANDING_VARS.filter(
				(varName) => !content.includes(`${varName}: "\${{ secrets.${varName} }}"`)
			);

			if (missingVars.length === 0) {
				console.log(`      ✅ All variables are present`);
			} else {
				console.log(`      ❌ Missing variables:`);
				missingVars.forEach((varName) => console.log(`         - ${varName}`));
				hasErrors = true;
			}
		} else {
			hasErrors = true;
		}
	} else {
		console.log(`      File not found`);
		console.log(`      This workflow may not be configured yet`);
		hasWarnings = true;
	}
});

// 5. Check next.config.js
console.log('\n5. Checking apps/web/next.config.js...');
const nextConfigPath = path.join(process.cwd(), 'apps/web/next.config.js');

if (checkFileExists(nextConfigPath)) {
	const content = safeReadFile(nextConfigPath);

	if (content !== null) {
		const hasParseFunction = content.includes('parseImagesHosts');
		const hasAllowedHosts = content.includes('allowedImageHosts');
		const hasEnvVar = content.includes('NEXT_PUBLIC_IMAGES_HOSTS');

		if (hasParseFunction && hasAllowedHosts && hasEnvVar) {
			console.log('   ✅ Image hosts configuration properly externalized');
		} else {
			console.log('   ❌ Issues detected:');
			if (!hasParseFunction) {
				console.log('      - Missing parseImagesHosts function');
				hasErrors = true;
			}
			if (!hasAllowedHosts) {
				console.log('      - Missing allowedImageHosts variable');
				hasErrors = true;
			}
			if (!hasEnvVar) {
				console.log('      - Missing NEXT_PUBLIC_IMAGES_HOSTS reference');
				hasErrors = true;
			}
		}
	} else {
		hasErrors = true;
	}
} else {
	console.log('   ❌ File not found');
	console.log('   This is a critical configuration file for Next.js');
	hasErrors = true;
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('VERIFICATION SUMMARY\n');

if (hasErrors) {
	console.log('❌ Errors detected - please fix the issues above');
	process.exit(1);
} else if (hasWarnings) {
	console.log('⚠️  Warnings detected - review the issues above');
	console.log('✅ No critical errors found');
	process.exit(0);
} else {
	console.log('✅ All checks passed successfully!');
	process.exit(0);
}
