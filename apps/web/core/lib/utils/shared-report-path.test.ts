import { isSharedReportPath } from './shared-report-path';

describe('isSharedReportPath', () => {
	it.each(['/shared-report/tok-1', '/fr/shared-report/tok-1', '/shared-report', '/shared-report/'])(
		'is true for %s',
		(pathname) => {
			expect(isSharedReportPath(pathname)).toBe(true);
		}
	);

	it.each(['/reports/time-and-activity', '/shared-reports/tok-1', '/team/shared-report', '', null, undefined])(
		'is false for %s',
		(pathname) => {
			expect(isSharedReportPath(pathname)).toBe(false);
		}
	);
});
