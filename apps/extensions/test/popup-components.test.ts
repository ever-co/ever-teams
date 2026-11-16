import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { refusalOf, type Refusal } from '../lib/refusal.ts';

// The components read their words through chrome.i18n: without messages, each word shows as its key
(globalThis as unknown as { chrome: unknown }).chrome = { i18n: { getMessage: () => '' } };

const noop = () => undefined;

let Timer: typeof import('../components/popup/Timer.tsx').Timer;
let AppDropdown: typeof import('../components/shared/AppDropdown.tsx').AppDropdown;

before(async () => {
	({ Timer } = await import('../components/popup/Timer.tsx'));
	({ AppDropdown } = await import('../components/shared/AppDropdown.tsx'));
});

function timerWith(refusal: Refusal): string {
	return renderToStaticMarkup(
		createElement(Timer, {
			isRunning: false,
			runSeconds: 0,
			todaySeconds: 0,
			taskTitle: 'Write the report',
			startedElsewhere: false,
			canStart: true,
			busy: false,
			refusal,
			onStart: noop,
			onStop: noop,
			onCheckTeam: noop,
			onRetry: noop
		})
	);
}

describe('Timer', () => {
	it('offers to try again after a server error or a timeout, as it does offline', () => {
		for (const status of [0, 408, 500, 503, 504]) {
			assert.match(timerWith(refusalOf({ status })), />actionRetry</, `status ${status}`);
		}
	});

	it('offers no retry for a refusal that the same request would get again', () => {
		assert.doesNotMatch(timerWith(refusalOf({ status: 422, code: 'DAILY_PLAN_REQUIRED' })), /actionRetry/);
		assert.doesNotMatch(timerWith(refusalOf({ status: 400, message: 'Task is archived' })), /actionRetry/);
	});
});

const TEAMS = [
	{ id: 'team-1', title: 'Research' },
	{ id: 'team-2', title: 'Lab' }
];

function dropdown(disabled: boolean): string {
	return renderToStaticMarkup(
		createElement(AppDropdown, {
			buttonClassNames: '',
			buttonTitle: 'Research',
			buttonLabel: 'Team',
			options: TEAMS,
			selectedId: 'team-1',
			onOptionSelect: noop,
			disabled
		})
	);
}

const tagsOf = (html: string, tag: string) => html.match(new RegExp(`<${tag}[^>]*>`, 'g')) ?? [];

describe('AppDropdown', () => {
	it('marks each option of a disabled dropdown aria-disabled, with a button that cannot take the focus nor a key', () => {
		const html = dropdown(true);
		const options = tagsOf(html, 'li');
		const buttons = tagsOf(html, 'button');

		assert.equal(options.length, 2);
		for (const option of options) {
			assert.match(option, /role="option"/);
			assert.match(option, /aria-disabled="true"/);
		}
		// The toggle and each option: a disabled button is out of the tab order and ignores Enter and Space
		assert.equal(buttons.length, 3);
		for (const button of buttons) {
			assert.match(button, /disabled=""/);
		}
		assert.match(buttons[0], /aria-expanded="false"/);
	});

	it('leaves the options of an enabled dropdown free', () => {
		const html = dropdown(false);

		for (const option of tagsOf(html, 'li')) {
			assert.doesNotMatch(option, /aria-disabled/);
		}
		for (const button of tagsOf(html, 'button')) {
			assert.doesNotMatch(button, /disabled=""/);
		}
	});
});
