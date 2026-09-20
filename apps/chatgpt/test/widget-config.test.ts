/**
 * The published image (ghcr.io/ever-co/ever-teams-chatgpt-*) must be self-hostable: the widget metadata the
 * app advertises to ChatGPT (`openai/widgetDomain`, `openai/widgetCSP`) comes from the runtime env, and keeps
 * the values Ever's hosted deployment always used when that env is not set.
 *
 * Run with `yarn workspace @ever-teams/chatgpt test` (Node's built-in test runner through tsx).
 */
import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';

// Keep the pino logger quiet; set before the modules below read the env.
process.env.LOG_LEVEL = 'silent';

const { config, resolveWidgetConfig, buildWidgetCsp, DEFAULT_CHATGPT_WIDGET_DOMAIN } =
	await import('../src/config/environment.js');
const { MetaEnhancer } = await import('../src/middleware/meta-enhancer.js');

// The exact values the app hard-coded before they became configurable.
const LEGACY_WIDGET_DOMAIN = 'ever.team';
const LEGACY_WIDGET_CSP =
	"default-src 'self' https://ever.team https://*.gauzy.co; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';";

describe('resolveWidgetConfig', () => {
	it('keeps the legacy widget domain and CSP when the env does not set them', () => {
		assert.equal(DEFAULT_CHATGPT_WIDGET_DOMAIN, LEGACY_WIDGET_DOMAIN);
		assert.deepEqual(resolveWidgetConfig({}), { widgetDomain: LEGACY_WIDGET_DOMAIN, widgetCsp: LEGACY_WIDGET_CSP });
	});

	it('treats empty or blank values as unset', () => {
		assert.deepEqual(resolveWidgetConfig({ CHATGPT_WIDGET_DOMAIN: '', CHATGPT_WIDGET_CSP: '  ' }), {
			widgetDomain: LEGACY_WIDGET_DOMAIN,
			widgetCsp: LEGACY_WIDGET_CSP
		});
	});

	it('advertises a self-hosted domain and derives a CSP without Ever hosts', () => {
		const resolved = resolveWidgetConfig({ CHATGPT_WIDGET_DOMAIN: ' teams.example.com ' });

		assert.equal(resolved.widgetDomain, 'teams.example.com');
		assert.equal(
			resolved.widgetCsp,
			"default-src 'self' https://teams.example.com; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
		);
		assert.doesNotMatch(resolved.widgetCsp, /ever\.team|gauzy\.co/);
	});

	it('keeps an explicit scheme on the configured domain', () => {
		assert.match(
			resolveWidgetConfig({ CHATGPT_WIDGET_DOMAIN: 'http://localhost:3004' }).widgetCsp,
			/^default-src 'self' http:\/\/localhost:3004; /
		);
	});

	it('uses CHATGPT_WIDGET_CSP verbatim when set', () => {
		const csp = "default-src 'self' https://teams.example.com https://api.example.com;";

		assert.deepEqual(resolveWidgetConfig({ CHATGPT_WIDGET_DOMAIN: 'teams.example.com', CHATGPT_WIDGET_CSP: csp }), {
			widgetDomain: 'teams.example.com',
			widgetCsp: csp
		});
		assert.equal(resolveWidgetConfig({ CHATGPT_WIDGET_CSP: csp }).widgetDomain, LEGACY_WIDGET_DOMAIN);
	});

	it('builds the policy from the given sources', () => {
		assert.equal(
			buildWidgetCsp([]),
			"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
		);
	});
});

describe('MetaEnhancer widget metadata', () => {
	const original = { widgetDomain: config.widgetDomain, widgetCsp: config.widgetCsp };
	const chatGptClient = { isChatGPT: true, locale: 'en-US' } as Parameters<
		typeof MetaEnhancer.enhanceToolResponse
	>[2];

	after(() => Object.assign(config, original));

	it('advertises the runtime-configured widget domain and CSP', () => {
		Object.assign(config, resolveWidgetConfig({ CHATGPT_WIDGET_DOMAIN: 'teams.example.com' }));

		const enhanced = MetaEnhancer.enhanceToolResponse('timer_status', { content: [] }, chatGptClient);

		assert.equal(enhanced._meta?.['openai/widgetDomain'], 'teams.example.com');
		assert.equal(enhanced._meta?.['openai/widgetCSP'], config.widgetCsp);
		assert.doesNotMatch(JSON.stringify(enhanced._meta), /ever\.team|gauzy\.co/);
	});

	it('advertises the legacy values by default', () => {
		Object.assign(config, resolveWidgetConfig({}));

		const enhanced = MetaEnhancer.enhanceToolResponse('timer_status', { content: [] }, chatGptClient);

		assert.equal(enhanced._meta?.['openai/widgetDomain'], LEGACY_WIDGET_DOMAIN);
		assert.equal(enhanced._meta?.['openai/widgetCSP'], LEGACY_WIDGET_CSP);
	});

	it('still adds no metadata for non-ChatGPT clients', () => {
		const response = { content: [] };

		assert.equal(
			MetaEnhancer.enhanceToolResponse('timer_status', response, { ...chatGptClient, isChatGPT: false }),
			response
		);
	});
});
