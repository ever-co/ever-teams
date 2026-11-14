/**
 * The saved reports calls: the caller's reports of one organization, the token of a link kept out of the development
 * log, and the read of a shared report by its link.
 */
import { savedReportService } from './saved-report.service';

describe('savedReportService', () => {
	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('lists the reports of one organization', async () => {
		const get = jest.spyOn(savedReportService, 'get').mockResolvedValue({ data: { items: [], total: 0 } } as never);

		await savedReportService.list('organization 1');

		expect(get).toHaveBeenCalledWith('/saved-reports?organizationId=organization+1');
	});

	it('saves a report with the tenant and organization it states, nothing added', async () => {
		const post = jest.spyOn(savedReportService, 'post').mockResolvedValue({ data: { id: 'r1' } } as never);
		const input = {
			tenantId: 't',
			organizationId: 'o',
			name: 'Client A, last month',
			periodRule: 'lastMonth' as const
		};

		await savedReportService.create(input);

		expect(post).toHaveBeenCalledWith('/saved-reports', input, undefined, false);
	});

	it('changes, deletes and turns off the link of one report by its id', async () => {
		const put = jest.spyOn(savedReportService, 'put').mockResolvedValue({ data: {} } as never);
		const remove = jest.spyOn(savedReportService, 'delete').mockResolvedValue({ data: undefined } as never);

		await savedReportService.update('r/1', { name: 'Renamed' });
		await savedReportService.remove('r1');
		await savedReportService.unshare('r1');

		expect(put).toHaveBeenCalledWith('/saved-reports/r%2F1', { name: 'Renamed' });
		expect(remove).toHaveBeenNthCalledWith(1, '/saved-reports/r1');
		expect(remove).toHaveBeenNthCalledWith(2, '/saved-reports/r1/share');
	});

	it('keeps the token of a new link out of the log and sends no tenant or organization', async () => {
		const post = jest.spyOn(savedReportService, 'post').mockResolvedValue({ data: { token: 'secret' } } as never);

		await savedReportService.share('r1', { expiresAt: null });

		expect(post).toHaveBeenCalledWith(
			'/saved-reports/r1/share',
			{ expiresAt: null },
			{ secretResponse: true },
			false
		);
	});

	it('reads a shared report by its link, the token kept in one path segment', async () => {
		const get = jest.spyOn(savedReportService, 'get').mockResolvedValue({ data: { name: 'Report' } } as never);

		await savedReportService.readShared('a/b');

		expect(get).toHaveBeenCalledWith('/public/saved-reports/a%2Fb');
	});
});
