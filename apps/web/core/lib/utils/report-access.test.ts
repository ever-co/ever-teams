import { readsTimeLogReports } from './report-access';

describe('readsTimeLogReports', () => {
	it('holds for each permission Gauzy reads its time log reports with', () => {
		for (const permission of ['TIME_TRACKER', 'ALL_ORG_EDIT', 'ALL_ORG_VIEW']) {
			expect(readsTimeLogReports(['INBOX_VIEW', permission])).toBe(true);
		}
	});

	it('fails for a role that holds none of them, such as the default manager role', () => {
		expect(readsTimeLogReports(['INBOX_VIEW', 'DOCS_READ', 'CHANGE_SELECTED_ORGANIZATION'])).toBe(false);
		expect(readsTimeLogReports([])).toBe(false);
	});
});
