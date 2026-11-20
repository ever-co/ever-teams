// The report widgets shrink to the width they are given, up to the size they had (ever-co/ever-teams#5618): node --test
// test/*.test.mjs (from packages/toolkit/atoms). bundle-kit.mjs bundles the lists' and the report's size variants, with
// what they draw as stand-ins; their classes are looked up in the built stylesheet (scripts/build-styles.mjs).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { createRequire } from 'node:module';
import { bundleKit, kitSources } from './bundle-kit.mjs';
import { kitStandIns } from './kit-stand-ins.mjs';
import { buildStyles } from '../scripts/build-styles.mjs';

const require = createRequire(import.meta.url);
const postcss = require('postcss');

const nothing = '() => null';
const children = '({ children }) => children ?? null';
const standIns = {
	'@ever-teams/toolkit-ui': `${kitStandIns['@ever-teams/toolkit-ui']}
		export const Progress = ${nothing};
		export const formatTime = () => '';
		export const Badge = ${children};
		export const DatePicker = ${nothing};
		export const MultiSelect = ${children};
		export const MultiSelectContent = ${children};
		export const MultiSelectGroup = ${children};
		export const MultiSelectItem = ${children};
		export const MultiSelectTrigger = ${children};
		export const MultiSelectValue = ${nothing};
		export const Select = ${children};
		export const Table = ${children};
		export const TableHeader = ${children};
		export const TableBody = ${children};
		export const TableRow = ${children};
		export const TableHead = ${children};
		export const TableCell = ${children};`,
	'lucide-react': `export const ChevronLeft = ${nothing};
		export const ChevronRight = ${nothing};
		export const FileText = ${nothing};
		export const RefreshCwIcon = ${nothing};`,
	'react-i18next': kitStandIns['react-i18next'],
	'theme-ui/jsx-runtime': kitStandIns['theme-ui/jsx-runtime'],
	drawn: `import { createElement } from 'react';
		export const TeamsTimerFooter = ${nothing};
		export const TeamsActiveEmployeeSelector = ({ containerClassName }) =>
			createElement('div', { 'data-stand-in': 'employee-selector', className: containerClassName });
		export const TeamsReportDatesRangePicker = ${nothing};
		export const TeamsReportDisplayer = ${nothing};
		export const BarChart = ${nothing};
		export const BarChartHorizontal = ${nothing};
		export const LineChart = ${nothing};
		export const AreaChart = ${nothing};
		export const TooltipChart = ${nothing};
		export const RadialChart = ${nothing};
		export const RadarChart = ${nothing};
		export const ChartLoader = ${nothing};
		export const TimerOnlyReportNote = ${nothing};
		export const useReport = () => ({});
		export const useTeamsContext = () => ({});
		export const useTimerOnlyToken = () => false;
		export const SpinOverlayLoader = ${nothing};
		export const useTimeLogs = () => ({ loading: false, data: [], error: null, refetch() {} });`
};
const DRAWN = [
	'component-footer',
	'teams-active-employee-selector',
	'teams-report-dates-range-picker',
	'report-displayer',
	'/teams-ui-charts/',
	'chart-loader',
	'timer-only-report-note',
	'hooks/useReport',
	'context/teams-context',
	'hooks/useTimerOnlyToken',
	'spin-overlay-loader',
	'hooks/useTimeLogs'
];
const standInOf = (importPath) => {
	if (DRAWN.some((part) => importPath.includes(part))) {
		return 'drawn';
	}
	return Object.keys(standIns).find((name) => importPath === name);
};

let kit;
let removeBundle;
let stylesheet;

before(async () => {
	const bundle = await bundleKit({
		name: 'report-widths',
		entry: `export { teamsBaseListVariants, TeamsBaseList } from '${kitSources}/components/teams-report/list-report/base.tsx';
			export { teamsBasicReportVariants, TeamsBasicReport } from '${kitSources}/components/teams-report/basic-report/teams-basic-report.tsx';
			export { TeamsTimesheet } from '${kitSources}/components/teams-report/timesheet/teams-timesheet.tsx';`,
		standIns,
		standInOf
	});
	kit = bundle.bundled;
	removeBundle = bundle.remove;
	const stylesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'report-widths-'));
	try {
		const output = path.join(stylesDir, 'styles.css');
		await buildStyles({ output });
		stylesheet = postcss.parse(fs.readFileSync(output, 'utf8'));
	} finally {
		fs.rmSync(stylesDir, { recursive: true, force: true });
	}
});

after(() => removeBundle?.());

// The properties the stylesheet gives a class, as Tailwind escapes it in a selector.
function propertiesOf(className) {
	const escaped = `.${className.replace(/[^\w-]/g, '\\$&')}`;
	const properties = [];
	stylesheet.walkRules((rule) => {
		if (rule.selectors.some((selector) => selector.endsWith(escaped))) {
			rule.walkDecls((decl) => properties.push(decl.prop));
		}
	});
	return properties;
}

function assertShrinksUpTo(classes, width, name) {
	const names = classes.split(/\s+/);
	assert.ok(names.includes('w-full'), `${name} takes the width it is given`);
	assert.ok(names.includes(`max-w-[${width}px]`), `${name} keeps ${width} px on a wide page`);
	assert.ok(!names.some((className) => /^w-\[\d+px\]$/.test(className)), `${name} sets no fixed width`);
	assert.ok(propertiesOf(`max-w-[${width}px]`).includes('max-width'), `max-w-[${width}px] is in the stylesheet`);
}

test('the project, task and app lists shrink on a narrow page and keep their size on a wide one', () => {
	const sizes = { default: 600, sm: 400, lg: 800 };
	for (const [size, width] of Object.entries(sizes)) {
		assertShrinksUpTo(kit.teamsBaseListVariants({ size }), width, `the ${size} list`);
	}
});

test('the report shrinks on a narrow page at its default and small sizes; the large one keeps its own layout', () => {
	assertShrinksUpTo(kit.teamsBasicReportVariants({ size: 'default' }), 700, 'the default report');
	assertShrinksUpTo(kit.teamsBasicReportVariants({ size: 'sm' }), 600, 'the small report');
	assert.match(kit.teamsBasicReportVariants({ size: 'lg' }), /min-w-\[1200px\]/);
});

test('a list row lets its name wrap and keeps its figures whole on a narrow page', () => {
	const { createElement } = require('react');
	const { renderToStaticMarkup } = require('react-dom/server');
	const stats = { data: [{ title: 'Website Redesign', durationPercentage: 86.2, duration: 431 }], loading: false };
	const markup = renderToStaticMarkup(createElement(kit.TeamsBaseList, { title: 'Project', stats }));

	const nameClasses = /<span class="([^"]*)">Website Redesign<\/span>/.exec(markup)?.[1].split(' ') ?? [];
	assert.ok(nameClasses.includes('min-w-0') && nameClasses.includes('flex-1'), 'the name takes what is left');
	assert.match(markup, /class="[^"]*min-w-fit[^"]*"/, 'the figures keep their width');
	const rowClasses = /<div class="([^"]*)"><span class="[^"]*">Website Redesign/.exec(markup)?.[1].split(' ') ?? [];
	assert.ok(rowClasses.includes('gap-4'), 'a long name stops short of the figures');
	for (const className of ['min-w-0', 'flex-1', 'min-w-fit', 'gap-4']) {
		assert.ok(propertiesOf(className).length > 0, `${className} is in the stylesheet`);
	}
});

test('a name of one long word breaks inside the row instead of running into the figures', () => {
	const { createElement } = require('react');
	const { renderToStaticMarkup } = require('react-dom/server');
	const stats = {
		data: [{ title: 'CustomerPortalAuthentication', durationPercentage: 12, duration: 60 }],
		loading: false
	};
	const markup = renderToStaticMarkup(createElement(kit.TeamsBaseList, { title: 'Task', stats }));

	const nameClasses = /<span class="([^"]*)">CustomerPortalAuthentication<\/span>/.exec(markup)?.[1].split(' ') ?? [];
	assert.ok(nameClasses.includes('[overflow-wrap:anywhere]'));
	assert.ok(propertiesOf('[overflow-wrap:anywhere]').includes('overflow-wrap'), 'its rule is in the stylesheet');
});

test("the timesheet's filters wrap onto more lines on a narrow page", () => {
	const { createElement } = require('react');
	const { renderToStaticMarkup } = require('react-dom/server');
	const markup = renderToStaticMarkup(createElement(kit.TeamsTimesheet));

	assert.match(markup, /class="flex flex-wrap gap-3 min-w-0"/);
	assert.ok(propertiesOf('flex-wrap').includes('flex-wrap'), 'flex-wrap is in the stylesheet');
});

// A long chosen name makes the picker as wide as the name, and the boxes around it with it, unless they may shrink.
test("a long employee name does not widen the timesheet's filters", () => {
	const { createElement } = require('react');
	const { renderToStaticMarkup } = require('react-dom/server');
	const markup = renderToStaticMarkup(createElement(kit.TeamsTimesheet));

	assert.match(markup, /<div data-stand-in="employee-selector" class="min-w-0 max-w-full"><\/div>/);
	assert.ok(propertiesOf('max-w-full').includes('max-width'), 'max-w-full is in the stylesheet');
});

test("the report's header puts its pickers under the title on a narrow page, and a long name does not widen it", () => {
	const { createElement } = require('react');
	const { renderToStaticMarkup } = require('react-dom/server');
	const markup = renderToStaticMarkup(createElement(kit.TeamsBasicReport));

	const row = /<div class="([^"]*)"><h1[^>]*>REPORT\.title<\/h1>/.exec(markup)?.[1].split(' ') ?? [];
	assert.ok(row.includes('flex-wrap'), 'the pickers wrap under the title');
	const header = /<div class="([^"]*)"><div data-stand-in="employee-selector" class="([^"]*)">/.exec(markup);
	assert.ok(header, 'the employee picker sits in the header');
	assert.ok(header[1].split(' ').includes('min-w-0'), 'the header group can shrink');
	assert.deepEqual(header[2].split(' '), ['min-w-0'], 'the picker can shrink');
});
