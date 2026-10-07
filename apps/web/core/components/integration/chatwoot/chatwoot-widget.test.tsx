/**
 * @jest-environment jsdom
 */
/**
 * The Chatwoot widget loads from Chatwoot Cloud unless NEXT_PUBLIC_CHATWOOT_BASE_URL — read from the
 * RUNTIME env, so a published Docker image can point at a self-hosted Chatwoot — overrides it.
 */
import React from 'react';
import { render } from '@testing-library/react';
import ChatwootWidget from './index';

const GLOBAL = '__EVER_TEAMS_RUNTIME_ENV__';
const ORIGINAL_ENV = process.env;
let mockWebsiteToken: string | undefined;

jest.mock('@/core/constants/config/constants', () => ({
	CHATWOOT_API_KEY: {
		get value() {
			return mockWebsiteToken;
		}
	}
}));

function sdkScript(): HTMLScriptElement | undefined {
	return Array.from(document.getElementsByTagName('script')).find((script) => script.src.endsWith('/sdk.js'));
}

/** Renders the widget, fires the SDK script's onload and returns what the SDK was started with. */
function renderWidget() {
	render(<ChatwootWidget />);
	const script = sdkScript();
	const run = jest.fn();
	window.chatwootSDK = { run };
	script?.onload?.(new Event('load'));
	return { src: script?.src, run };
}

beforeEach(() => {
	process.env = { ...ORIGINAL_ENV };
	delete process.env.NEXT_PUBLIC_CHATWOOT_BASE_URL;
	(globalThis as Record<string, unknown>)[GLOBAL] = {};
	mockWebsiteToken = 'website-token';
	// The widget inserts its SDK before the first <script> of the document.
	document.head.innerHTML = '<script id="first-script"></script>';
});

afterAll(() => {
	process.env = ORIGINAL_ENV;
	delete (globalThis as Record<string, unknown>)[GLOBAL];
});

describe('ChatwootWidget base URL', () => {
	it('loads Chatwoot Cloud by default', () => {
		const { src, run } = renderWidget();

		expect(src).toBe('https://app.chatwoot.com/packs/js/sdk.js');
		expect(run).toHaveBeenCalledWith({ websiteToken: 'website-token', baseUrl: 'https://app.chatwoot.com' });
	});

	it('loads a self-hosted Chatwoot from the runtime env, even over a build-time value', () => {
		process.env.NEXT_PUBLIC_CHATWOOT_BASE_URL = 'https://baked.example.org';
		(globalThis as Record<string, unknown>)[GLOBAL] = {
			NEXT_PUBLIC_CHATWOOT_BASE_URL: 'https://chat.example.org/'
		};

		const { src, run } = renderWidget();

		expect(src).toBe('https://chat.example.org/packs/js/sdk.js');
		expect(run).toHaveBeenCalledWith({ websiteToken: 'website-token', baseUrl: 'https://chat.example.org' });
	});

	it('falls back to the build-time value when the runtime env does not set it', () => {
		process.env.NEXT_PUBLIC_CHATWOOT_BASE_URL = 'https://baked.example.org';

		expect(renderWidget().src).toBe('https://baked.example.org/packs/js/sdk.js');
	});

	it('treats a blank value as unset', () => {
		(globalThis as Record<string, unknown>)[GLOBAL] = { NEXT_PUBLIC_CHATWOOT_BASE_URL: '   ' };

		expect(renderWidget().src).toBe('https://app.chatwoot.com/packs/js/sdk.js');
	});

	it('loads nothing without a website token', () => {
		mockWebsiteToken = undefined;
		(globalThis as Record<string, unknown>)[GLOBAL] = { NEXT_PUBLIC_CHATWOOT_BASE_URL: 'https://chat.example.org' };

		render(<ChatwootWidget />);

		expect(sdkScript()).toBeUndefined();
	});
});
