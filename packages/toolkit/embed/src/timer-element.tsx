import createCache, { type EmotionCache } from '@emotion/cache';
import { CacheProvider } from '@emotion/react';
import { createRoot, type Root } from 'react-dom/client';
import { TeamsBasicTimer, TeamsLoginDialog, TeamsProvider } from '@ever-teams/atoms';
import kitStylesheet from '@ever-teams/atoms/styles.css?inline';
import { registerKitProperties, splitKitStyles } from './kit-styles';

export const TIMER_ELEMENT_NAME = 'ever-teams-timer';

// :host stops what the page's rules pass down by inheritance (letter spacing, line height, colors...), except the
// font, which the widgets take from the page as the React kit does.
const HOST_STYLES = ':host{all:initial;display:block;font-family:inherit}:host([hidden]){display:none}';

const kitStyles = splitKitStyles(kitStylesheet);

type ColorScheme = 'light' | 'dark' | 'system';

function colorSchemeOf(value: string | null): ColorScheme {
	if (value === 'light') {
		return value;
	}
	if (value === 'dark') {
		return value;
	}
	return 'system';
}

// Without api-url the kit keeps its own default API address.
function configOf(apiUrl: string | null) {
	if (apiUrl) {
		return { apiUrl };
	}
	return {};
}

/**
 * <ever-teams-timer api-url="https://api.ever.team/api">: the kit's sign-in and basic timer, rendered by React in the
 * element's own shadow root with the kit's stylesheet. Attributes: api-url, color-scheme (light, dark, system) and
 * lang. Removing the element stops its timer display and its requests.
 */
export class EverTeamsTimerElement extends HTMLElement {
	static observedAttributes = ['api-url', 'color-scheme', 'lang'];

	private root: Root | null = null;
	private cache: EmotionCache | null = null;

	connectedCallback() {
		const shadow = this.shadowRoot ?? this.attachShadow({ mode: 'open' });
		registerKitProperties(document, kitStyles.page);
		const style = document.createElement('style');
		style.textContent = HOST_STYLES + kitStyles.shadow;
		const mount = document.createElement('div');
		shadow.replaceChildren(style, mount);
		// theme-ui writes its styles through emotion, into the document head by default: here, into the shadow root.
		this.cache = createCache({ key: 'ever-teams', container: shadow });
		this.root = createRoot(mount);
		this.render();
	}

	disconnectedCallback() {
		this.root?.unmount();
		this.root = null;
		this.shadowRoot?.replaceChildren();
	}

	attributeChangedCallback() {
		this.render();
	}

	private render() {
		if (!this.root || !this.cache) {
			return;
		}
		const lang = this.getAttribute('lang') ?? undefined;
		this.root.render(
			<CacheProvider value={this.cache}>
				<TeamsProvider
					config={configOf(this.getAttribute('api-url'))}
					scopedStyles
					colorScheme={colorSchemeOf(this.getAttribute('color-scheme'))}
					lang={lang}
				>
					<TeamsLoginDialog />
					<TeamsBasicTimer />
				</TeamsProvider>
			</CacheProvider>
		);
	}
}
