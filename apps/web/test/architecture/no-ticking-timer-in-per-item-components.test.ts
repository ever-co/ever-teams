/**
 * Architecture guard (2026-08-19, Q26 item 1).
 *
 * `useTimerView()` / `useTimer()` compose all three timer layers. Layer 3 (`useTimerUi`) SUBSCRIBES to
 * `timeCounterState` / `timerSecondsState` / `timeCounterIntervalState`. Exactly one 50 ms interval exists
 * app-wide — `init-state.tsx` owns it, because `useTimerUi`'s effects are gated on a `firstLoad` that only
 * that instance ever flips — but every subscriber re-renders on its writes. That is fine for the ONE
 * component that displays the live clock, and pathological for anything rendered once per task: N cards on
 * screen means N components re-rendering 20x/second while a timer runs, each redoing its time formatting.
 *
 * Per-item components must therefore use the Layers-1+2 hooks (`useTimerActions`, `useTimerPlanStatus`,
 * `useLiveTimerStatus`) or read the specific atom they need. If you genuinely need the ticking clock in a
 * per-item component, add the file to ALLOWED below with a comment explaining why.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const WEB_ROOT = join(__dirname, '..', '..');

/**
 * Components/hooks that are instantiated once per rendered task/row.
 * `add-task-estimation-hours-modal.tsx` belongs here even though it is a "modal": task-card.tsx renders it
 * once per card whenever the user has a daily plan, so it is per-item in practice — that is exactly how the
 * 20Hz subscription survived on the task-list view after the first pass of this fix.
 */
const PER_ITEM_FILES = [
	'core/hooks/tasks/use-timer-button.ts',
	'core/components/tasks/kanban-card.tsx',
	'core/components/tasks/task-card.tsx',
	'core/components/features/daily-plan/add-task-estimation-hours-modal.tsx'
];

/** Deliberate exceptions — none today. Add with a reason if the live clock is truly needed per item. */
const ALLOWED: string[] = [];

const TICKING_HOOKS = ['useTimerView', 'useTimer('];

const BLOCK_COMMENT = /\/\*[\s\S]*?\*\//g;
const LINE_COMMENT = /(^|[^:])\/\/.*$/gm;

/**
 * Strip comments before scanning: these files legitimately MENTION the ticking hooks in the comments that
 * explain why they avoid them, and a guard that trips on its own rationale is worse than no guard.
 * (The `[^:]` guard keeps `https://` inside string literals from being treated as a comment.)
 */
const codeOnly = (source: string): string => source.replace(BLOCK_COMMENT, '').replace(LINE_COMMENT, '$1');

describe('per-item components must not mount the ticking timer layer', () => {
	it.each(PER_ITEM_FILES)('%s does not use the ticking timer hooks', (relPath) => {
		if (ALLOWED.includes(relPath)) return;
		const source = codeOnly(readFileSync(join(WEB_ROOT, relPath), 'utf8'));
		const offenders = TICKING_HOOKS.filter((hook) => source.includes(hook));
		expect(offenders).toEqual([]);
	});

	it('control: the comment stripper does not hide real code', () => {
		const sample = [
			'/* useTimerView in a block comment */',
			'// useTimerView in a line comment',
			'const x = useTimerView();'
		].join('\n');
		const stripped = codeOnly(sample);
		expect(stripped).toContain('useTimerView()');
		expect(stripped.match(/useTimerView/g)).toHaveLength(1);
	});

	it('control: the primary timer widget DOES still use the ticking hook', () => {
		// If this ever fails, the live clock lost its ticking source and the guard above is meaningless.
		const source = codeOnly(readFileSync(join(WEB_ROOT, 'core/components/timer/timer.tsx'), 'utf8'));
		expect(source.includes('useTimerView')).toBe(true);
	});

	it('control: the lean hook this guard steers people to really has no ticking layer', () => {
		const source = codeOnly(readFileSync(join(WEB_ROOT, 'core/hooks/timer/use-timer-actions.ts'), 'utf8'));
		expect(source.includes('useTimerUi')).toBe(false);
	});
});
