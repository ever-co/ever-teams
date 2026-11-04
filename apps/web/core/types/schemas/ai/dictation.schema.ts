export const DICTATION_ERROR_CODES = [
	'invalid_request',
	'not_configured',
	'unsupported_format',
	'too_large',
	'too_short',
	'no_speech',
	'rate_limited',
	'provider_unavailable'
] as const;

export type TDictationErrorCode = (typeof DICTATION_ERROR_CODES)[number];

/** Whether this deployment holds a speech-to-text provider; the microphone shows only when it does. */
export type TDictationAvailability = {
	available: boolean;
};
