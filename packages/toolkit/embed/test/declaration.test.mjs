// The package's TypeScript declaration: node --test test/*.test.mjs (from packages/toolkit/embed).
// TypeScript compiles a strict app against a copy of the package (its package.json, a stand-in element and the
// declaration the build writes), as an Angular, Vue or Svelte app with TypeScript resolves it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { DECLARATION_FILE, declarationPlugin } from '../vite.config.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.join(here, '..');
const ts = createRequire(import.meta.url)('typescript');

function emittedFiles() {
	const emitted = [];
	declarationPlugin.generateBundle.call({ emitFile: (file) => emitted.push(file) });
	return emitted;
}

function writeFile(file, text) {
	fs.mkdirSync(path.dirname(file), { recursive: true });
	fs.writeFileSync(file, text);
}

// The diagnostics of a strict app whose node_modules/@ever-teams/embed holds the package as npm installs it.
function compileApp(appSource, { withDeclaration = true } = {}) {
	const project = fs.mkdtempSync(path.join(os.tmpdir(), 'embed-declaration-'));
	try {
		const installed = path.join(project, 'node_modules', '@ever-teams', 'embed');
		const manifest = fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8');
		writeFile(path.join(installed, 'package.json'), manifest);
		writeFile(path.join(installed, 'dist', 'ever-teams-embed.js'), 'export {};\n');
		if (withDeclaration) {
			for (const file of emittedFiles()) {
				writeFile(path.join(installed, 'dist', file.fileName), file.source);
			}
		}
		const app = path.join(project, 'app.ts');
		writeFile(app, appSource);
		const program = ts.createProgram([app], {
			strict: true,
			noEmit: true,
			target: ts.ScriptTarget.ES2022,
			module: ts.ModuleKind.ESNext,
			moduleResolution: ts.ModuleResolutionKind.Bundler,
			lib: ['lib.es2022.d.ts', 'lib.dom.d.ts'],
			types: []
		});
		const diagnostics = ts.getPreEmitDiagnostics(program);
		return diagnostics.map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
	} finally {
		fs.rmSync(project, { recursive: true, force: true });
	}
}

// The names pick() collects in a source file, sorted.
function namesOf(file, pick) {
	const names = [];
	const visit = (node) => {
		pick(node, names);
		ts.forEachChild(node, visit);
	};
	const source = fs.readFileSync(file, 'utf8');
	const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.ES2022, true);
	visit(parsed);
	return names.sort();
}

const APP = `
import { EverTeamsTimerElement, TIMER_ELEMENT_NAME } from '@ever-teams/embed';
import type { EverTeamsTimerAttributes, EverTeamsTimerProps } from '@ever-teams/embed';

const created: EverTeamsTimerElement = document.createElement('ever-teams-timer');
const name: 'ever-teams-timer' = TIMER_ELEMENT_NAME;
const attributes: EverTeamsTimerAttributes = { 'api-url': 'https://api.example.com/api', 'color-scheme': 'dark', lang: 'fr' };
// @ts-expect-error a scheme the element does not know
const unknownScheme: EverTeamsTimerAttributes = { 'color-scheme': 'dim' };
const props: EverTeamsTimerProps = { apiUrl: 'https://api.example.com/api', colorScheme: 'system', lang: 'en' };
const noProps: EverTeamsTimerProps = {};
// @ts-expect-error a scheme the element does not know, under its camelCase name
const unknownSchemeProp: EverTeamsTimerProps = { colorScheme: 'dim' };
const loading: Promise<unknown> = import('@ever-teams/embed');
export { created, name, attributes, unknownScheme, props, noProps, unknownSchemeProp, loading };
`;

test('the build writes the declaration next to the element', () => {
	const emitted = emittedFiles();
	const declaration = fs.readFileSync(path.join(packageRoot, 'types', DECLARATION_FILE), 'utf8');
	assert.equal(emitted.length, 1);
	assert.equal(emitted[0].type, 'asset');
	assert.equal(emitted[0].fileName, DECLARATION_FILE);
	assert.equal(emitted[0].source, declaration);
});

test('a strict app imports the package and gets the element, its name and its attributes typed, also in camelCase', () => {
	assert.deepEqual(compileApp(APP), []);
});

test('without the declaration a strict app cannot import the package (TS7016)', () => {
	const diagnostics = compileApp(APP, { withDeclaration: false });
	const noDeclaration = "Could not find a declaration file for module '@ever-teams/embed'";
	const refused = diagnostics.some((message) => message.startsWith(noDeclaration));
	assert.ok(refused);
});

test('the declaration types every attribute the element observes, and no other', () => {
	const observed = namesOf(path.join(packageRoot, 'src', 'timer-element.tsx'), (node, names) => {
		const isObserved = ts.isPropertyDeclaration(node) && node.name.getText() === 'observedAttributes';
		if (!isObserved) {
			return;
		}
		for (const element of node.initializer.elements) {
			names.push(element.text);
		}
	});
	const typed = namesOf(path.join(packageRoot, 'types', DECLARATION_FILE), (node, names) => {
		const isAttributes = ts.isInterfaceDeclaration(node) && node.name.text === 'EverTeamsTimerAttributes';
		if (!isAttributes) {
			return;
		}
		for (const member of node.members) {
			names.push(member.name.text);
		}
	});
	assert.deepEqual(observed, ['api-url', 'color-scheme', 'lang']);
	assert.deepEqual(typed, observed);
});
