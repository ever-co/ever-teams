#!/usr/bin/env node

/**
 * Script to compare environment files and find missing variables
 */

const fs = require('node:fs');
const path = require('node:path');

// Function to extract variables from a file
function extractVars(filePath) {
	try {
		const content = fs.readFileSync(filePath, 'utf8');
		const vars = new Set();
		content.split('\n').forEach((line) => {
			line = line.trim();
			if (line && !line.startsWith('#') && line.includes('=')) {
				const varName = line.split('=')[0].trim();
				if (varName) vars.add(varName);
			}
		});
		return vars;
	} catch (error) {
		console.log(`❌ Error reading ${filePath}: ${error.message}`);
		return new Set();
	}
}

console.log('🔍 COMPARING ENVIRONMENT FILES\n');

// Extract variables from each file
const localVars = extractVars('apps/web/.env.local');
const sampleVars = extractVars('apps/web/.env.sample');
const envVars = extractVars('apps/web/.env');

console.log(`📄 Variables in .env.local: ${localVars.size}`);
console.log(`📄 Variables in .env.sample: ${sampleVars.size}`);
console.log(`📄 Variables in .env: ${envVars.size}\n`);

// Find variables in .env.local but missing in .env.sample
const missingInSample = [...localVars].filter((v) => !sampleVars.has(v));

// Find variables in .env.sample but missing in .env.local
const missingInLocal = [...sampleVars].filter((v) => !localVars.has(v));

// Find variables in .env.local but missing in .env
const missingInEnv = [...localVars].filter((v) => !envVars.has(v));

// Find variables in .env but missing in .env.local
const missingInLocalFromEnv = [...envVars].filter((v) => !localVars.has(v));

console.log('🔴 Variables in .env.local but MISSING in .env.sample:');
console.log('='.repeat(60));
if (missingInSample.length === 0) {
	console.log('✅ No missing variables');
} else {
	missingInSample.sort().forEach((v) => console.log(`   ${v}`));
}
console.log(`\nTotal: ${missingInSample.length} variables missing in .env.sample\n`);

console.log('🔵 Variables in .env.sample but MISSING in .env.local:');
console.log('='.repeat(60));
if (missingInLocal.length === 0) {
	console.log('✅ No missing variables');
} else {
	missingInLocal.sort().forEach((v) => console.log(`   ${v}`));
}
console.log(`\nTotal: ${missingInLocal.length} variables missing in .env.local\n`);

console.log('🟡 Variables in .env.local but MISSING in .env:');
console.log('='.repeat(60));
if (missingInEnv.length === 0) {
	console.log('✅ No missing variables');
} else {
	missingInEnv.sort().forEach((v) => console.log(`   ${v}`));
}
console.log(`\nTotal: ${missingInEnv.length} variables missing in .env\n`);

console.log('🟢 Variables in .env but MISSING in .env.local:');
console.log('='.repeat(60));
if (missingInLocalFromEnv.length === 0) {
	console.log('✅ No missing variables');
} else {
	missingInLocalFromEnv.sort().forEach((v) => console.log(`   ${v}`));
}
console.log(`\nTotal: ${missingInLocalFromEnv.length} variables missing in .env.local\n`);

// Generate the missing variables for .env.sample
if (missingInSample.length > 0) {
	console.log('📋 VARIABLES TO ADD TO .env.sample:');
	console.log('='.repeat(60));
	missingInSample.sort().forEach((v) => {
		console.log(`${v}=`);
	});
	console.log('');
}

// Generate the missing variables for .env
if (missingInEnv.length > 0) {
	console.log('📋 VARIABLES TO ADD TO .env:');
	console.log('='.repeat(60));
	missingInEnv.sort().forEach((v) => {
		console.log(`${v}=`);
	});
	console.log('');
}

console.log('🎯 COMPARISON COMPLETED\n');
