// The "Today" caption before a timer's time: node --test test/*.test.mjs (from packages/toolkit/atoms).
// esbuild bundles the basic timer and the shared timer control with toolkit-ui, the timer hook, the teams context and
// the translations replaced by stand-ins; React renders them to static markup.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const esbuild = require('esbuild');

const stubs = {
	'@ever-teams/toolkit-ui': `
		export const cn = (...names) => names.flat().filter(Boolean).join(' ');
		export const getTimeDigits = (n) => String(n).padStart(2, '0');`,
	'@hooks/useTimer': `
		export const useTimer = () => ({
			todayTrackedTime: { hours: 1, minutes: 2, seconds: 3, totalSeconds: 3723 },
			startTimer: () => {},
			stopTimer: () => {},
			timerActionLabel: 'TIME_TRACKER.START_TIMER',
			isRunning: false,
			timerLoading: false
		});`,
	'@lib/context/teams-context': `export const useTeamsContext = () => ({ authenticatedUser: { id: 'u' } });`,
	'react-i18next': `export const useTranslation = () => ({ t: (key) => key });`,
	'kit-notice': `export const KitNotice = () => null;`
};
const stubbed = /^(@ever-teams\/toolkit-ui|@hooks\/useTimer|@lib\/context\/teams-context|react-i18next)$/;
// The notice of a timer reads the page's shared timer status: out of this test.
const notice = /\/kit-notice$/;

let React;
let renderToStaticMarkup;
let kit;
let bundleDir;

before(async () => {
	// Inside the package, so that the bundle's react and class-variance-authority resolve to the package's own.
	bundleDir = fs.mkdtempSync(path.join(here, '.timer-caption-'));
	const outfile = path.join(bundleDir, 'timers.mjs');
	const timers = path.join(here, '..', 'src', 'lib', 'components', 'teams-time-trackers').replace(/\\/g, '/');
	await esbuild.build({
		stdin: {
			contents: [
				`export { default as BasicTimer } from '${timers}/teams-basic-timer/timer';`,
				`export { useTimerControl } from '${timers}/common/use-timer-control';`,
				`export { TeamsBasicTimer } from '${timers}/teams-basic-timer/index';`
			].join('\n'),
			resolveDir: bundleDir,
			loader: 'ts'
		},
		bundle: true,
		format: 'esm',
		platform: 'neutral',
		mainFields: ['module', 'main'],
		jsx: 'automatic',
		outfile,
		logLevel: 'error',
		external: [
			'react',
			'react/jsx-runtime',
			'react-dom',
			'lucide-react',
			'class-variance-authority',
			'theme-ui',
			'theme-ui/jsx-runtime'
		],
		plugins: [
			{
				name: 'stubs',
				setup(build) {
					build.onResolve({ filter: stubbed }, (args) => ({ path: args.path, namespace: 'stub' }));
					build.onResolve({ filter: notice }, () => ({ path: 'kit-notice', namespace: 'stub' }));
					build.onLoad({ filter: /.*/, namespace: 'stub' }, (args) => ({
						contents: stubs[args.path],
						loader: 'js'
					}));
				}
			}
		]
	});
	React = require('react');
	({ renderToStaticMarkup } = require('react-dom/server'));
	kit = await import(pathToFileURL(outfile).href);
});

after(() => {
	if (bundleDir) fs.rmSync(bundleDir, { recursive: true, force: true });
});

const time = { hours: 0, minutes: 21, seconds: 10, totalSeconds: 1270 };

test('the basic timer shows its caption before the time, and nothing without one', () => {
	const withCaption = renderToStaticMarkup(React.createElement(kit.BasicTimer, { time, caption: 'Today' }));
	const without = renderToStaticMarkup(React.createElement(kit.BasicTimer, { time }));

	assert.match(withCaption, /Today<\/span>.*00.*21.*10/s);
	assert.doesNotMatch(without, /Today/);
	assert.doesNotMatch(withCaption, /caption=/, 'the caption never reaches the DOM as an attribute');
});

test('the kit timers say Today by default, also to screen readers, and a host can replace it', () => {
	let control;
	const Probe = () => {
		control = kit.useTimerControl();
		return null;
	};
	renderToStaticMarkup(React.createElement(Probe));

	assert.deepEqual(control.defaults, { caption: 'COMMON.today' });
	assert.match(renderToStaticMarkup(control.description), /COMMON\.today 01:02:03/);
	// `defaults` goes before the host's props: a host's own caption, or null, wins.
	const props = { ...control.action, ...control.defaults, ...{ caption: null }, ...control.state };
	assert.equal(props.caption, null);
});

test('a caption the host gives the timer is what screen readers hear too, and null leaves only the time', () => {
	const descriptionOf = (hostCaption) => {
		let control;
		const Probe = () => {
			control = kit.useTimerControl(hostCaption);
			return null;
		};
		renderToStaticMarkup(React.createElement(Probe));
		return renderToStaticMarkup(control.description);
	};

	assert.match(descriptionOf("Aujourd'hui"), />Aujourd&#x27;hui 01:02:03</);
	assert.match(descriptionOf(null), />01:02:03</);
	assert.match(descriptionOf(React.createElement('svg')), />01:02:03</);
	assert.match(descriptionOf(undefined), />COMMON\.today 01:02:03</);
});

test('the connected basic timer shows and describes the host caption, and drops both with null', () => {
	const own = renderToStaticMarkup(React.createElement(kit.TeamsBasicTimer, { caption: "Aujourd'hui" }));
	const none = renderToStaticMarkup(React.createElement(kit.TeamsBasicTimer, { caption: null }));

	assert.match(own, /Aujourd&#x27;hui<\/span>/);
	assert.match(own, /Aujourd&#x27;hui 01:02:03/);
	assert.doesNotMatch(own, /COMMON\.today/);
	assert.doesNotMatch(none, /COMMON\.today/);
	assert.match(none, />01:02:03</);
});
