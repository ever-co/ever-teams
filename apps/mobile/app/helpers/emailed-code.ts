/**
 * The codes Gauzy sends by e-mail (sign-in, invitation, e-mail verification, e-mail change) have 8 characters since
 * ever-co/ever-gauzy#9506; a self-hosted server older than that still sends 6.
 */
export const EMAILED_CODE_LENGTH = 8;
const EARLIER_EMAILED_CODE_LENGTH = 6;

/** A code of either length can be sent: the server answers whether it is the right one. */
export function isCompleteEmailedCode(code: string | null | undefined): boolean {
	const length = code?.trim().length ?? 0;
	const currentLength = length === EMAILED_CODE_LENGTH;
	const earlierLength = length === EARLIER_EMAILED_CODE_LENGTH;
	return currentLength || earlierLength;
}

/** What a code field keeps of a typed or pasted text: no spaces, and no more characters than it has cells. */
export function normalizeEmailedCode(text: string | null | undefined, cellCount = EMAILED_CODE_LENGTH): string {
	return (text ?? '').replace(/\s/g, '').slice(0, cellCount);
}

/** The code in a pasted text, upper-cased, when it is a whole code that fits the cells; null otherwise. */
export function pastedEmailedCode(text: string | null | undefined, cellCount = EMAILED_CODE_LENGTH): string | null {
	const code = text?.trim() ?? '';
	if (!isCompleteEmailedCode(code) || code.length > cellCount || !/^[0-9a-zA-Z]+$/.test(code)) {
		return null;
	}
	return code.toUpperCase();
}
