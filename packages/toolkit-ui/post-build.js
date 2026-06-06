import { readFile, writeFile } from 'fs/promises';
import { resolve } from 'path';

// Define paths
const distFilePath = resolve('dist/index.es.js');
const cssPath = './index.es.css'; // Relative path to the CSS file

async function prependCSSImport() {
	try {
		// Read the existing file content
		const fileContent = await readFile(distFilePath, 'utf8');

		// Check if the import statement already exists
		if (!fileContent.startsWith(`import '${cssPath}';`)) {
			// Prepend the import statement
			const updatedContent = `import '${cssPath}';\n${fileContent}`;
			await writeFile(distFilePath, updatedContent, 'utf8');
			console.log(`CSS import prepended to ${distFilePath}`);
		} else {
			console.log('CSS import already exists at the top.');
		}
	} catch (error) {
		console.error(`Failed to prepend CSS import: ${error.message}`);
	}
}

// Run the function
prependCSSImport();
