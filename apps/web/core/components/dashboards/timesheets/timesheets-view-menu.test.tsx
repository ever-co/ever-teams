/** @jest-environment jsdom */

import { fireEvent, render, screen } from '@testing-library/react';

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
// The popover opens on a pointer gesture jsdom does not have: its content is drawn at once here.
jest.mock('@/core/components/common/popover', () => {
	const Pass = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
	return { Popover: Pass, PopoverTrigger: Pass, PopoverContent: Pass };
});

import { TimesheetsViewMenu } from './timesheets-view-menu';

describe('TimesheetsViewMenu', () => {
	it('shows grouping of similar entries as on, and turns it off', () => {
		const onGroupingChange = jest.fn();
		render(<TimesheetsViewMenu isGrouping onGroupingChange={onGroupingChange} />);

		const toggle = screen.getByRole('switch', { name: 'dashboard.timesheets.SIMILAR.VIEW_GROUP' });
		expect(toggle.getAttribute('aria-checked')).toBe('true');
		expect(screen.getByText('dashboard.timesheets.SIMILAR.VIEW_GROUP_HELP')).toBeTruthy();

		fireEvent.click(toggle);

		expect(onGroupingChange).toHaveBeenCalledWith(false);
	});

	it('turns grouping back on', () => {
		const onGroupingChange = jest.fn();
		render(<TimesheetsViewMenu isGrouping={false} onGroupingChange={onGroupingChange} />);

		const toggle = screen.getByRole('switch', { name: 'dashboard.timesheets.SIMILAR.VIEW_GROUP' });
		expect(toggle.getAttribute('aria-checked')).toBe('false');
		fireEvent.click(toggle);

		expect(onGroupingChange).toHaveBeenCalledWith(true);
	});
});
