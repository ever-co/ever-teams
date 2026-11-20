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
	drawn: `export const TeamsTimerFooter = ${nothing};
		export const TeamsActiveEmployeeSelector = ${nothing};
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
			export { teamsBasicReportVariants } from '${kitSources}/components/teams-report/basic-report/teams-basic-report.tsx';
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

test('a list row lets its name wrap and keeps its figures whole on a narrow page', () => {
	const { createElement } = require('react');
	const { renderToStaticMarkup } = require('react-dom/server');
	const stats = { data: [{ title: 'Website Redesign', durationPercentage: 86.2, duration: 431 }], loading: false };
	const markup = renderToStaticMarkup(createElement(kit.TeamsBaseList, { title: 'Project', stats }));

	const nameClasses = /<span class="([^"]*)">Website Redesign<\/span>/.exec(markup)?.[1].split(' ') ?? [];
	assert.ok(nameClasses.includes('min-w-0') && nameClasses.includes('flex-1'), 'the name takes what is left');
	assert.match(markup, /class="[^"]*min-w-fit[^"]*"/, 'the figures keep their width');
	for (const className of ['min-w-0', 'flex-1', 'min-w-fit']) {
		assert.ok(propertiesOf(className).length > 0, `${className} is in the stylesheet`);
	}
});
