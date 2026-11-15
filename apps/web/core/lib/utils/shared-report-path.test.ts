import { isSharedReportPath, sharedReportFragmentOf, sharedReportTokenOf } from './shared-report-path';

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

describe('the token of a shared report travels in the fragment of its address, which no server receives', () => {
	const TOKEN = 'gsr_AbC-123_xyzAbC-123_xyzAbC-123_xyzAbC-123_x';

	it('writes the token as the fragment', () => {
		expect(sharedReportFragmentOf(TOKEN)).toBe(`#token=${TOKEN}`);
	});

	it('reads back the token it wrote', () => {
		expect(sharedReportTokenOf(sharedReportFragmentOf(TOKEN))).toBe(TOKEN);
		expect(sharedReportTokenOf(sharedReportFragmentOf('a b&c=d'))).toBe('a b&c=d');
	});

	it.each(['', '#', '#other=1', null, undefined])('reads no token from %p', (hash) => {
		expect(sharedReportTokenOf(hash)).toBe('');
	});
});
