/**
 * Test-only capture of what the code under test writes to the console (never part of the app). Each call is
 * formatted the way Node prints it, with every nesting level expanded, so a token anywhere inside a logged
 * object is in the text. `String(arg)` would print an object as "[object Object]" and hide the token.
 */
import { formatWithOptions } from 'node:util';

export function captureConsole(): { text: () => string } {
	const lines: string[] = [];
	for (const method of ['log', 'info', 'warn', 'error', 'debug'] as const) {
		jest.spyOn(console, method).mockImplementation((...args: unknown[]) => {
			lines.push(formatWithOptions({ depth: Infinity }, ...args));
		});
	}
	return { text: () => lines.join('\n') };
}
