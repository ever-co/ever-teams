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
