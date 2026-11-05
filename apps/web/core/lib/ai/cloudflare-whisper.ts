import { APICallError, type TranscriptionModelV4, type TranscriptionModelV4CallOptions } from '@ai-sdk/provider';

const WHISPER_TURBO_MODEL = '@cf/openai/whisper-large-v3-turbo';

interface CloudflareWhisperSegment {
	start?: number;
	end?: number;
	text?: string;
	no_speech_prob?: number;
	avg_logprob?: number;
}

interface CloudflareWhisperBody {
	success?: boolean;
	result?: {
		text?: string;
		segments?: CloudflareWhisperSegment[];
		transcription_info?: { language?: string; duration?: number };
	};
}

function headersOf(response: Response) {
	const headers: Record<string, string> = {};
	response.headers.forEach((value, key) => {
		headers[key] = value;
	});
	return headers;
}

function audioAsBase64(audio: Uint8Array | string) {
	if (typeof audio === 'string') {
		return audio;
	}
	return Buffer.from(audio).toString('base64');
}

function languageOf(options: TranscriptionModelV4CallOptions) {
	const cloudflareOptions = options.providerOptions?.cloudflare;
	const language = cloudflareOptions?.language;
	if (typeof language === 'string') {
		return language;
	}
	return undefined;
}

/**
 * Workers AI Whisper through its REST API. The Workers AI provider package is deprecated and its replacement ships
 * inside a 10 MB package, so the model is this small object; it throws the SDK's `APICallError`, which lets the
 * chain classify its failures like any other provider's.
 */
export function createCloudflareWhisper({
	accountBaseURL,
	apiToken
}: Readonly<{ accountBaseURL: string; apiToken: string }>): TranscriptionModelV4 {
	const url = `${accountBaseURL}/run/${WHISPER_TURBO_MODEL}`;
	return {
		specificationVersion: 'v4',
		provider: 'cloudflare-workers-ai',
		modelId: WHISPER_TURBO_MODEL,
		async doGenerate(options) {
			const requestBody = {
				audio: audioAsBase64(options.audio),
				language: languageOf(options),
				task: 'transcribe'
			};
			const response = await fetch(url, {
				method: 'POST',
				headers: { authorization: `Bearer ${apiToken}`, 'content-type': 'application/json' },
				body: JSON.stringify(requestBody),
				signal: options.abortSignal
			});
			const responseHeaders = headersOf(response);
			const responseText = await response.text();
			if (!response.ok) {
				throw new APICallError({
					message: `Workers AI answered ${response.status}`,
					url,
					requestBodyValues: { model: WHISPER_TURBO_MODEL },
					statusCode: response.status,
					responseHeaders,
					responseBody: responseText
				});
			}
			const body = JSON.parse(responseText) as CloudflareWhisperBody;
			const result = body.result ?? {};
			const segments = (result.segments ?? []).map((segment) => ({
				text: segment.text ?? '',
				startSecond: segment.start ?? 0,
				endSecond: segment.end ?? 0
			}));
			return {
				text: result.text ?? '',
				segments,
				language: result.transcription_info?.language,
				durationInSeconds: result.transcription_info?.duration,
				warnings: [],
				response: {
					timestamp: new Date(),
					modelId: WHISPER_TURBO_MODEL,
					headers: responseHeaders,
					body: { segments: result.segments ?? [] }
				}
			};
		}
	};
}
