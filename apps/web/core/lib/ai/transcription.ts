import type { SharedV4ProviderOptions } from '@ai-sdk/provider';
import { experimental_transcribe as transcribe } from 'ai';
import { firstAnswer, UnusableAnswerError, type ChainBudget, type ChainLink } from './provider-chain';
import { freeTranscriptionLinks, paidTranscriptionLinks, type TranscriptionLink } from './server-providers';

const TRANSCRIPTION_BUDGET: ChainBudget = {
	attemptMs: 20_000,
	totalMs: 30_000,
	minRemainingMs: 5_000,
	paidAttemptMs: 60_000
};

const NO_SPEECH_THRESHOLD = 0.6;
const LOW_CONFIDENCE_THRESHOLD = -1;

/** Any URL: the audio never leaves memory, the custom download below hands its bytes to the SDK. */
const IN_MEMORY_AUDIO_URL = new URL('https://dictation.invalid/audio');

export interface DictationAudio {
	bytes: Uint8Array;
	mediaType: string;
}

export interface DictationResult {
	text: string;
	isSilent: boolean;
}

interface WhisperSegment {
	no_speech_prob?: number;
	avg_logprob?: number;
}

function segmentsOfBody(body: unknown): WhisperSegment[] {
	if (typeof body !== 'object' || body === null) {
		return [];
	}
	const segments = (body as { segments?: unknown }).segments;
	if (!Array.isArray(segments)) {
		return [];
	}
	return segments as WhisperSegment[];
}

function isSilentSegment(segment: WhisperSegment) {
	const noSpeech = segment.no_speech_prob ?? 0;
	const logProb = segment.avg_logprob ?? 0;
	const isProbablyNoSpeech = noSpeech > NO_SPEECH_THRESHOLD;
	const isLowConfidence = logProb < LOW_CONFIDENCE_THRESHOLD;
	return isProbablyNoSpeech && isLowConfidence;
}

/** Whisper writes a short phrase over silence: a recording is silent when every segment says so. */
function isSilentWhisperResult(body: unknown) {
	const segments = segmentsOfBody(body);
	if (segments.length === 0) {
		return false;
	}
	return segments.every(isSilentSegment);
}

/**
 * The language is detected from the speech, never taken from the interface: people of one team dictate in their
 * own language. Deepgram defaults to English unless asked to detect it.
 */
function providerOptionsFor(link: TranscriptionLink): SharedV4ProviderOptions {
	if (link.isWhisper) {
		return { groq: { responseFormat: 'verbose_json' } };
	}
	return { deepgram: { detectLanguage: true, smartFormat: true } };
}

/** The provider's raw answer: the SDK does not type it, but keeps it, and Whisper's silence scores live there. */
function rawBodyOf(response: unknown) {
	if (typeof response !== 'object' || response === null) {
		return undefined;
	}
	return (response as { body?: unknown }).body;
}

function transcriptionLinkRunner(link: TranscriptionLink, audio: DictationAudio): ChainLink<DictationResult> {
	return {
		id: link.id,
		group: link.group,
		run: async (signal) => {
			const result = await transcribe({
				model: link.model,
				audio: IN_MEMORY_AUDIO_URL,
				download: () => Promise.resolve({ data: audio.bytes, mediaType: audio.mediaType }),
				providerOptions: providerOptionsFor(link),
				abortSignal: signal,
				maxRetries: 0
			});
			const body = rawBodyOf(result.responses[0]);
			const isSilent = link.isWhisper && isSilentWhisperResult(body);
			const text = result.text.trim();
			if (isSilent) {
				return { text: '', isSilent: true };
			}
			if (!text) {
				throw new UnusableAnswerError('The transcription was empty.');
			}
			return { text, isSilent: false };
		}
	};
}

/**
 * The dictation of one recording through the free speech-to-text chain, then the paid path. When a free Whisper
 * hears only silence, the paid model has the final word; without one, the recording reads as silent.
 */
export async function transcribeDictation(audio: DictationAudio, signal: AbortSignal): Promise<DictationResult | null> {
	const freeLinks = freeTranscriptionLinks().map((link) => transcriptionLinkRunner(link, audio));
	const paidLinks = paidTranscriptionLinks().map((link) => transcriptionLinkRunner(link, audio));
	const freeResult = await firstAnswer(freeLinks, [], TRANSCRIPTION_BUDGET, signal);
	const isSilentFree = Boolean(freeResult?.isSilent);
	if (freeResult && !isSilentFree) {
		return freeResult;
	}
	const paidResult = await firstAnswer([], paidLinks, TRANSCRIPTION_BUDGET, signal);
	if (paidResult) {
		return paidResult;
	}
	return freeResult;
}
