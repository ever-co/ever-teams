/** @jest-environment jsdom */

import { render, screen } from '@testing-library/react';
import type { PropsWithChildren } from 'react';

import type { WorkspaceLocale } from '@/core/lib/utils/workspace-formats';
import type { TTimeLimitReportByEmployee, TTimeLimitReportList } from '@/core/types/schemas';

jest.mock('@react-pdf/renderer', () => ({
	Document: ({ children }: PropsWithChildren) => <div>{children}</div>,
	Page: ({ children }: PropsWithChildren) => <div>{children}</div>,
	View: ({ children }: PropsWithChildren) => <div>{children}</div>,
	Text: ({ children }: PropsWithChildren) => <span>{children}</span>,
	StyleSheet: { create: (styles: unknown) => styles }
}));

import { type IWeeklyLimitReportPDFDocumentProps, WeeklyLimitPDFDocument } from './index';
import { WeeklyLimitByEmployeePDFDocument } from './grouped-by-employee';

const EIGHT_HOURS = 8 * 3600;
const ONE_HOUR = 3600;

const DECIMAL_COMMA: WorkspaceLocale = { tag: 'en', dateFormat: null, numberFormat: '1.234,56' };
const AUTOMATIC: WorkspaceLocale = { tag: 'fr', dateFormat: null, numberFormat: null };

const documentProps = {
	headers: {
		indexValue: 'Member',
		timeSpent: 'Time spent',
		limit: 'Limit',
		percentageUsed: 'Used',
		remaining: 'Remaining'
	},
	displayMode: 'date',
	organizationLimits: { date: EIGHT_HOURS, week: EIGHT_HOURS },
	title: 'Daily limit'
} as unknown as IWeeklyLimitReportPDFDocumentProps;

const employee = { fullName: 'Ada' };

const byPeriod = [
	{ date: 'Tue 04/11', employees: [{ employee, duration: ONE_HOUR, durationPercentage: 12.5, limit: EIGHT_HOURS }] }
] as unknown as TTimeLimitReportList[];

const byMember = [
	{ employee, reports: [{ date: 'Tue 04/11', duration: ONE_HOUR, durationPercentage: 12.5, limit: EIGHT_HOURS }] }
] as unknown as TTimeLimitReportByEmployee[];

describe('the share of the limit in the limit PDFs', () => {
	it("takes the workspace's decimal mark in the document by period", () => {
		render(<WeeklyLimitPDFDocument data={byPeriod} {...documentProps} locale={DECIMAL_COMMA} />);

		expect(screen.getByText('12,50%')).toBeTruthy();
	});

	it("takes the workspace's decimal mark in the document by member", () => {
		render(<WeeklyLimitByEmployeePDFDocument data={byMember} {...documentProps} locale={DECIMAL_COMMA} />);

		expect(screen.getByText('12,50%')).toBeTruthy();
	});

	it('stays as it was for a workspace that chose no number format, and for a caller that names none', () => {
		const { unmount } = render(<WeeklyLimitPDFDocument data={byPeriod} {...documentProps} locale={AUTOMATIC} />);

		expect(screen.getByText('12.50%')).toBeTruthy();
		unmount();
		render(<WeeklyLimitByEmployeePDFDocument data={byMember} {...documentProps} />);

		expect(screen.getByText('12.50%')).toBeTruthy();
	});
});
