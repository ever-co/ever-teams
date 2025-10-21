#!/usr/bin/env node

/**
 * Script to update all translation files to replace hardcoded "Ever Teams" with dynamic placeholders
 * Usage: node tools/scripts/update-translations.js
 */

const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '../../apps/web/locales');
const TRANSLATIONS_TO_UPDATE = [
	{ key: '"TITLE": "Ever Teams"', replacement: '"TITLE": "{appName}"' },
	{ key: '"OPT_IN_UPDATES": "Opt-in to receive updates and news about Ever Teams."', replacement: '"OPT_IN_UPDATES": "Opt-in to receive updates and news about {appName}."' },
	{ key: '"HEADING_TITLE": "Log In to Ever Teams"', replacement: '"HEADING_TITLE": "Log In to {appName}"' },
	{ key: '"COPY_RIGHT2": "Ever Teams"', replacement: '"COPY_RIGHT2": "{appName}"' },
	{ key: '"WELCOME_TEAMS": "Bienvenue sur Ever Teams"', replacement: '"WELCOME_TEAMS": "Bienvenue sur {appName}"' },
	{ key: '"WELCOME_TEAMS": "Welcome to Ever Teams"', replacement: '"WELCOME_TEAMS": "Welcome to {appName}"' },
	// Add more patterns as needed for other languages
];

function updateTranslationFile(filePath) {
	console.log(`Updating ${filePath}...`);
	
	let content = fs.readFileSync(filePath, 'utf8');
	let updated = false;
	
	TRANSLATIONS_TO_UPDATE.forEach(({ key, replacement }) => {
		if (content.includes(key)) {
			content = content.replace(new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replacement);
			updated = true;
			console.log(`  ✓ Replaced: ${key}`);
		}
	});
	
	// Generic replacement for any remaining "Ever Teams" occurrences
	const everTeamsRegex = /"([^"]*Ever Teams[^"]*)"/g;
	const matches = content.match(everTeamsRegex);
	if (matches) {
		matches.forEach(match => {
			const newMatch = match.replace(/Ever Teams/g, '{appName}');
			if (match !== newMatch) {
				content = content.replace(match, newMatch);
				updated = true;
				console.log(`  ✓ Generic replacement: ${match} → ${newMatch}`);
			}
		});
	}
	
	if (updated) {
		fs.writeFileSync(filePath, content, 'utf8');
		console.log(`  ✅ Updated ${filePath}`);
	} else {
		console.log(`  ℹ️  No changes needed for ${filePath}`);
	}
}

function main() {
	console.log('🚀 Starting translation files update...\n');
	
	if (!fs.existsSync(LOCALES_DIR)) {
		console.error(`❌ Locales directory not found: ${LOCALES_DIR}`);
		process.exit(1);
	}
	
	const files = fs.readdirSync(LOCALES_DIR)
		.filter(file => file.endsWith('.json'))
		.map(file => path.join(LOCALES_DIR, file));
	
	console.log(`Found ${files.length} translation files to process:\n`);
	
	files.forEach(updateTranslationFile);
	
	console.log('\n✅ Translation files update completed!');
	console.log('\n📝 Next steps:');
	console.log('1. Test the application with different APP_NAME values');
	console.log('2. Verify that all UI elements show the correct branding');
	console.log('3. Update any remaining hardcoded references manually');
}

if (require.main === module) {
	main();
}

module.exports = { updateTranslationFile, TRANSLATIONS_TO_UPDATE };
