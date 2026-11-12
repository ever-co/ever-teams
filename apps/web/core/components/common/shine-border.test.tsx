/** @jest-environment jsdom */
import { readFileSync } from 'fs';
import { join } from 'path';
import { render } from '@testing-library/react';

import { ShineBorder } from './shine-border';

const STYLESHEET = readFileSync(join(__dirname, 'shine-border.module.css'), 'utf8');
const MOTION_ALLOWED_QUERY = '@media (prefers-reduced-motion: no-preference)';

/** Splits the stylesheet into its motion-allowed block and every other rule, which also hold under reduced motion. */
function splitByMotionPreference(css: string) {
	const start = css.indexOf(MOTION_ALLOWED_QUERY);
	if (start === -1) {
		return { motionAllowed: '', always: css };
	}
	const open = css.indexOf('{', start);
	let depth = 0;
	let end = open;
	for (let index = open; index < css.length; index++) {
		if (css[index] === '{') {
			depth++;
		}
		if (css[index] === '}') {
			depth--;
		}
		if (depth === 0) {
			end = index;
			break;
		}
	}
	const motionAllowed = css.slice(open + 1, end);
	const always = css.slice(0, start) + css.slice(end + 1);
	return { motionAllowed, always };
}

describe('ShineBorder', () => {
	it('renders nothing while off, so a control at rest holds no animation', () => {
		const { container } = render(<ShineBorder active={false} />);

		expect(container.childElementCount).toBe(0);
	});

	it('draws the ring and its gradient while on, hidden from assistive technology', () => {
		const { container } = render(<ShineBorder active />);
		const ring = container.querySelector('[data-shine-border]');

		expect(ring).not.toBeNull();
		expect(ring?.getAttribute('aria-hidden')).toBe('true');
		expect(ring?.childElementCount).toBe(1);
	});

	it('takes the thickness it is given', () => {
		const { container } = render(<ShineBorder active thicknessPx={1} />);
		const ring = container.querySelector<HTMLElement>('[data-shine-border]');

		expect(ring?.style.getPropertyValue('--shine-border-thickness')).toBe('1px');
	});

	it('turns only when motion is allowed, so reduced motion leaves a still gradient ring', () => {
		const { motionAllowed, always } = splitByMotionPreference(STYLESHEET);

		expect(motionAllowed).toMatch(/animation:\s*shine-border-turn/);
		expect(always).not.toMatch(/animation:/);
		expect(always).toMatch(/conic-gradient\(/);
	});
});
