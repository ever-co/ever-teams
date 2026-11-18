export type TimerColorScheme = 'system' | 'light' | 'dark';
export type TimerLanguage = 'en' | 'fr';

export interface TimerSnippetOptions {
	apiUrl: string;
	colorScheme: TimerColorScheme;
	lang: TimerLanguage;
}

export const DEFAULT_API_URL = 'https://api.ever.team/api';

// Where the snippet expects the files of the dist/ folder of @ever-teams/embed on the person's own site.
export const TIMER_SCRIPT_PATH = '/ever-teams/ever-teams-embed.js';

const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '"': '&quot;', '<': '&lt;', '>': '&gt;' };

function escapeAttribute(value: string): string {
	return value.replace(/[&"<>]/g, (character) => HTML_ESCAPES[character]);
}

// The element's attributes: the API address always, the others only when they differ from the element's defaults.
export function timerAttributes(options: TimerSnippetOptions): Record<string, string> {
	const apiUrl = options.apiUrl.trim() || DEFAULT_API_URL;
	const attributes: Record<string, string> = { 'api-url': apiUrl };
	if (options.colorScheme !== 'system') {
		attributes['color-scheme'] = options.colorScheme;
	}
	if (options.lang !== 'en') {
		attributes.lang = options.lang;
	}
	return attributes;
}

// The attributes of the builder's preview: the settings of the snippet, against the builder's own API. The preview
// runs in the builder's page, which holds the person's builder session: it never sends that to an address they typed.
export function previewAttributes(
	options: TimerSnippetOptions,
	builderApiUrl: string | undefined
): Record<string, string> {
	return timerAttributes({ ...options, apiUrl: builderApiUrl ?? DEFAULT_API_URL });
}

// The two lines a person pastes where the timer goes.
export function timerSnippet(options: TimerSnippetOptions): string {
	const written = Object.entries(timerAttributes(options)).map(
		([name, value]) => ` ${name}="${escapeAttribute(value)}"`
	);
	const script = `<script type="module" src="${TIMER_SCRIPT_PATH}"></script>`;
	const element = `<ever-teams-timer${written.join('')}></ever-teams-timer>`;
	return `${script}\n${element}`;
}
