/** @jest-environment jsdom */

import { render, screen } from '@testing-library/react';
import { DashboardReportFlow } from './dashboard-report-flow';

describe('DashboardReportFlow', () => {
	it('keeps an expanded chart and its table in the same document flow', () => {
		render(<DashboardReportFlow chart={<div>Activity chart</div>} table={<div>Activity table</div>} />);
		const flow = screen.getByTestId('dashboard-report-flow');
		expect(flow.contains(screen.getByText('Activity chart'))).toBe(true);
		expect(flow.contains(screen.getByText('Activity table'))).toBe(true);
		expect(screen.getByText('Activity chart').compareDocumentPosition(screen.getByText('Activity table'))).toBe(
			Node.DOCUMENT_POSITION_FOLLOWING
		);
	});
});
