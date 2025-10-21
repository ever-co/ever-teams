#!/usr/bin/env node

/**
 * Script to test branding externalization
 * Tests that all hardcoded "Ever Teams" references have been replaced with environment variables
 * Usage: node tools/scripts/test-branding.js
 */

const fs = require('node:fs');
const path = require('node:path');

const SEARCH_DIRECTORIES = ['apps/web/app', 'apps/web/core', 'apps/web/locales', 'packages/constants/src'];

const EXCLUDED_PATTERNS = [
	'node_modules',
	'.git',
	'dist',
	'build',
	'.next',
	'coverage',
	'logs',
	'tools/scripts', // Exclude our own scripts
	'README.md',
	'CHANGELOG.md',
	'LICENSE'
];

const HARDCODED_PATTERNS = [
	/["']Ever Teams["']/g,
	/Ever Teams(?![\w-])/g // Match "Ever Teams" not followed by word characters or hyphens
];

function shouldExcludeFile(filePath) {
	return EXCLUDED_PATTERNS.some((pattern) => filePath.includes(pattern));
}

function searchInFile(filePath) {
	try {
		const content = fs.readFileSync(filePath, 'utf8');
		const issues = [];

		HARDCODED_PATTERNS.forEach((pattern, index) => {
			let match;
			while ((match = pattern.exec(content)) !== null) {
				const lines = content.substring(0, match.index).split('\n');
				const lineNumber = lines.length;
				const lineContent = lines[lines.length - 1] + content.substring(match.index).split('\n')[0];

				issues.push({
					pattern: pattern.source,
					match: match[0],
					line: lineNumber,
					content: lineContent.trim(),
					file: filePath
				});
			}
		});

		return issues;
	} catch (error) {
		console.warn(`Warning: Could not read file ${filePath}: ${error.message}`);
		return [];
	}
}

function searchInDirectory(dirPath) {
	const issues = [];

	try {
		const items = fs.readdirSync(dirPath);

		for (const item of items) {
			const itemPath = path.join(dirPath, item);

			if (shouldExcludeFile(itemPath)) {
				continue;
			}

			const stat = fs.statSync(itemPath);

			if (stat.isDirectory()) {
				issues.push(...searchInDirectory(itemPath));
			} else if (
				stat.isFile() &&
				(item.endsWith('.ts') ||
					item.endsWith('.tsx') ||
					item.endsWith('.js') ||
					item.endsWith('.jsx') ||
					item.endsWith('.json'))
			) {
				issues.push(...searchInFile(itemPath));
			}
		}
	} catch (error) {
		console.warn(`Warning: Could not read directory ${dirPath}: ${error.message}`);
	}

	return issues;
}

function main() {
	console.log('🔍 Searching for hardcoded "Ever Teams" references...\n');

	const allIssues = [];

	SEARCH_DIRECTORIES.forEach((dir) => {
		const fullPath = path.join(__dirname, '../../', dir);
		if (fs.existsSync(fullPath)) {
			console.log(`Searching in ${dir}...`);
			const issues = searchInDirectory(fullPath);
			allIssues.push(...issues);
		} else {
			console.warn(`Warning: Directory ${dir} does not exist`);
		}
	});

	console.log(`\n📊 Search completed. Found ${allIssues.length} potential issues.\n`);

	if (allIssues.length === 0) {
		console.log('✅ Great! No hardcoded "Ever Teams" references found.');
		console.log('🎉 Branding externalization appears to be complete!');
		return;
	}

	// Group issues by file
	const issuesByFile = {};
	allIssues.forEach((issue) => {
		if (!issuesByFile[issue.file]) {
			issuesByFile[issue.file] = [];
		}
		issuesByFile[issue.file].push(issue);
	});

	console.log('❌ Found hardcoded references that need to be updated:\n');

	Object.keys(issuesByFile).forEach((file) => {
		console.log(`📄 ${file}:`);
		issuesByFile[file].forEach((issue) => {
			console.log(`   Line ${issue.line}: ${issue.content}`);
			console.log(`   Pattern: ${issue.pattern}`);
			console.log(`   Match: "${issue.match}"`);
			console.log('');
		});
	});

	console.log('🔧 Next steps:');
	console.log('1. Replace hardcoded strings with environment variables');
	console.log('2. Use process.env.APP_NAME || "Ever Teams" pattern');
	console.log('3. For translations, use {appName} placeholders');
	console.log('4. Run this script again to verify fixes');

	process.exit(1);
}

if (require.main === module) {
	main();
}

module.exports = { searchInFile, searchInDirectory, HARDCODED_PATTERNS };
