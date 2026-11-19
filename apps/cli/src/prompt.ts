import { PromptInput } from './io.js';
import { Refusal } from './refusals.js';

const ENTER = new Set(['\r', '\n', '\u0004']);
const ERASE = new Set(['\u007f', '\b']);
const INTERRUPT = '\u0003';

function bytesOf(chunk: unknown): Buffer {
	if (Buffer.isBuffer(chunk)) {
		return chunk;
	}
	return Buffer.from(String(chunk), 'utf8');
}

/** Everything piped in, without the spaces and line ends around it. */
export async function readPiped(input: PromptInput): Promise<string> {
	const chunks: Buffer[] = [];
	for await (const chunk of input) {
		chunks.push(bytesOf(chunk));
	}
	const text = Buffer.concat(chunks).toString('utf8');
	return text.trim();
}

function nextTyped(typed: string, char: string): string {
	if (ERASE.has(char)) {
		return typed.slice(0, -1);
	}
	const isControl = char < ' ';
	if (isControl) {
		return typed;
	}
	return typed + char;
}

/**
 * A line typed in the terminal, never shown: the terminal does not echo it while it is typed. Ctrl+C cancels, and an
 * input that ends, closes or fails before Enter is a cancelled sign-in too. Each way out gives the terminal back.
 */
export function readHidden(input: PromptInput, write: (text: string) => void, question: string): Promise<string> {
	write(question);
	return new Promise((resolve, reject) => {
		let typed = '';
		let finished = false;

		function finish(): void {
			if (finished) {
				return;
			}
			finished = true;
			input.off('data', onData);
			input.off('end', onEnd);
			input.off('close', onEnd);
			input.off('error', onError);
			input.setRawMode?.(false);
			input.pause();
			write('\n');
		}

		function cancel(message: string): void {
			finish();
			reject(new Refusal('CANCELLED', message));
		}

		function onEnd(): void {
			cancel('Sign-in cancelled: the input ended before Enter, and nothing was stored.');
		}

		function onError(error: Error): void {
			cancel(`Sign-in cancelled: the input failed (${error.message}), and nothing was stored.`);
		}

		function onData(chunk: string): void {
			for (const char of chunk) {
				if (ENTER.has(char)) {
					finish();
					resolve(typed.trim());
					return;
				}
				if (char === INTERRUPT) {
					cancel('Sign-in cancelled: nothing was stored.');
					return;
				}
				typed = nextTyped(typed, char);
			}
		}

		input.setRawMode?.(true);
		input.setEncoding('utf8');
		input.on('data', onData);
		input.on('end', onEnd);
		input.on('close', onEnd);
		input.on('error', onError);
		input.resume();
	});
}
