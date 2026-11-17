// The Radix Portals wrapped with withKitContainer keep their props: node --test test/*.test.mjs
// (from packages/toolkit-ui).
// Type-checks the five components that wrap one, with the package's own compiler options.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const ts = require('typescript');

test('dialogs, alert dialogs, popovers, menus and selects pass their children to the wrapped Portal', () => {
	const configPath = path.join(here, '..', 'tsconfig.json');
	const config = ts.readConfigFile(configPath, ts.sys.readFile);
	// Only Node's ambient types: a missing @types entry of the workspace would otherwise stop the semantic check.
	const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, path.dirname(configPath), {
		noEmit: true,
		types: ['node']
	});
	const components = path.join(here, '..', 'src', 'lib', 'components');
	const consumers = ['alert-dialog.tsx', 'dialog/dialog.tsx', 'menu-bar.tsx', 'popover.tsx', 'select/select.tsx'].map(
		(file) => path.join(components, file)
	);
	const program = ts.createProgram(consumers, parsed.options);
	const errors = consumers.flatMap((file) =>
		program
			.getSemanticDiagnostics(program.getSourceFile(file))
			.map((d) => `${path.basename(file)}: ${ts.flattenDiagnosticMessageText(d.messageText, ' ')}`)
	);

	assert.deepEqual(errors, []);
});
