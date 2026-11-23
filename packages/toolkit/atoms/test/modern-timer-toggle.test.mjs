// The modern timer's toggle says what it does (ever-co/ever-teams#5608): node --test test/*.test.mjs (from
// packages/toolkit/atoms). bundle-kit.mjs bundles TeamsModernTimer; its timer hook, form, pickers and icons are stand-ins.
import { test, before, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { bundleKit, kitSources } from './bundle-kit.mjs';
import { kitStandIns } from './kit-stand-ins.mjs';

const require = createRequire(import.meta.url);
const { JSDOM } = require('jsdom');

const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', { url: 'http://localhost/' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const nothing = 'export default () => null;';
const standIns = {
	'@ever-teams/toolkit-ui': `export const cn = (...names) => names.filter(Boolean).join(' ');
		export const ExpandIcon = () => 'expand-icon';
		export const CollapseIcon = () => 'collapse-icon';`,
	'react-i18next': kitStandIns['react-i18next'],
	'theme-ui/jsx-runtime': kitStandIns['theme-ui/jsx-runtime'],
	timer: `export const useTimer = () => ({
		timerLoading: false, timerStatusLoading: false, hours: 0, minutes: 0, seconds: 0, todayTrackedTime: 0,
		isRunning: false, startTimer() {}, stopTimer() {}, timerActionLabel: 'TIME_TRACKER.START_TIMER',
		currentTeamsState: {}, setCurrentTeamsState() {}
	});`,
	parts: `${nothing}
		export const TeamsButton = () => null;
		export const KitNotice = () => null;
		export const TimeDisplayer = () => null;
		export const TodayTimeDisplayer = () => null;
		export const TeamsProgress = () => null;
		export const SpinOverlayLoader = () => null;
		export const TeamsTimerForm = () => 'timer-form';
		export const TeamsTimerFooter = () => null;`
};
// Whatever the timer draws around its toggle is a stand-in.
const PARTS = [
	'/button/button',
	'teams-ui-components/kit-notice',
	'time-displayer',
	'today-timer-displayer',
	'teams-progress',
	'spin-overlay-loader',
	'teams-timer-form',
	'component-footer'
];
const standInOf = (importPath) => {
	if (importPath.endsWith('hooks/useTimer')) {
		return 'timer';
	}
	if (PARTS.some((part) => importPath.includes(part))) {
		return 'parts';
	}
	return Object.keys(standIns).find((name) => importPath === name);
};

let React;
let act;
let createRoot;
let kit;
let removeBundle;
let root;

before(async () => {
	const bundle = await bundleKit({
		name: 'modern-timer-toggle',
		entry: `export { TeamsModernTimer } from '${kitSources}/components/teams-time-trackers/teams-modern-timer/index.tsx';`,
		standIns,
		standInOf
	});
	kit = bundle.bundled;
	removeBundle = bundle.remove;
	React = require('react');
	act = React.act;
	createRoot = require('react-dom/client').createRoot;
});

after(() => removeBundle?.());

afterEach(async () => {
	await act(async () => root?.unmount());
	document.body.replaceChildren();
});

async function openTimer() {
	const container = document.createElement('div');
	document.body.appendChild(container);
	root = createRoot(container);
	await act(async () => root.render(React.createElement(kit.TeamsModernTimer, { showProgress: true })));
	return container.querySelector('button');
}

test('folded, the toggle offers to show the timer details, and submits no form around it', async () => {
	const toggle = await openTimer();

	assert.equal(toggle.getAttribute('aria-label'), 'TIME_TRACKER.show_details');
	assert.equal(toggle.getAttribute('aria-expanded'), 'false');
	assert.equal(toggle.getAttribute('type'), 'button');
	assert.equal(toggle.textContent, 'expand-icon');
});

test('unfolded, it offers to hide them, with the collapse icon instead of a hyphen', async () => {
	const toggle = await openTimer();
	await act(async () => toggle.click());

	assert.equal(toggle.getAttribute('aria-label'), 'TIME_TRACKER.hide_details');
	assert.equal(toggle.getAttribute('aria-expanded'), 'true');
	assert.equal(toggle.textContent, 'collapse-icon');
	assert.match(document.body.textContent, /timer-form/, 'the pickers show');

	await act(async () => toggle.click());
	assert.equal(toggle.getAttribute('aria-expanded'), 'false');
	assert.doesNotMatch(document.body.textContent, /timer-form/);
});
