import { describe, expect, it } from '@jest/globals';
import type { WorkspaceLocale } from '@/core/lib/utils/workspace-formats';
import { hourLabelsOf } from './calendar-view';

const DAY = new Date(2026, 10, 2);

function workspaceOf(clock: 12 | 24): WorkspaceLocale {
	return { tag: 'en', dateFormat: null, numberFormat: null, clock, currencyPosition: null };
}

/** ICU versions differ on the space before AM and PM: compare with plain spaces. */
function withPlainSpaces(text: string): string {
	return text.replace(/\s/gu, ' ');
}

describe('the calendar hour gutter follows the workspace clock', () => {
	it('labels the afternoon hours on the 24-hour clock', () => {
		const labels = hourLabelsOf(workspaceOf(24), DAY);
		const afternoon = labels.find((label) => label.hour === 14);

		expect(afternoon?.label).toBe('14');
	});

	it('labels the afternoon hours on the 12-hour clock', () => {
		const labels = hourLabelsOf(workspaceOf(12), DAY);
		const afternoon = labels.find((label) => label.hour === 14);

		expect(withPlainSpaces(afternoon?.label ?? '')).toBe('2 PM');
	});
});
