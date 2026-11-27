/**
 * `taskAutomationsService.templates`, the availability probe of Settings → Automations, as the read leaves the client:
 * a platform without the plugin answers 404, which the read fails with (the entry and the page hide) and keeps out of
 * the error log; any other failure is still logged. The rules list's 404 is no availability answer and stays logged.
 */
import { errorStatusOf } from '@/core/lib/utils/error-feedback';
import { expectOnly404Quiet, failureOf, loggedStatuses, refusingClient } from '@/test/api/refusing-client';
import { taskAutomationsService } from './task-automations.service';

describe('taskAutomationsService.templates', () => {
	afterEach(() => jest.restoreAllMocks());

	it('names the organization, and asks the client to keep a 404 out of its error log', async () => {
		const get = jest.spyOn(taskAutomationsService, 'get').mockResolvedValue({ data: [], status: 200 } as never);
		const signal = new AbortController().signal;

		await expect(taskAutomationsService.templates('organization 1', signal)).resolves.toEqual([]);

		expect(get).toHaveBeenCalledWith('/task-automations/templates?organizationId=organization%201', {
			signal,
			quietStatuses: [404]
		});
	});

	it('keeps the 404 of a platform without the plugin out of the error log, and still logs a 500', async () => {
		const notFound = await expectOnly404Quiet(taskAutomationsService, () =>
			taskAutomationsService.templates('organization-1')
		);

		// The status `availabilityOfError` (use-task-automations.ts) reads as `unavailable`
		expect(errorStatusOf(notFound)).toBe(404);
	});

	it('still logs a 404 of the rules list, which is not an availability answer', async () => {
		const refusing = refusingClient(taskAutomationsService);
		try {
			const errorLog = refusing.refuse(404);

			expect(await failureOf(taskAutomationsService.list('organization-1'))).not.toBeNull();

			expect(loggedStatuses(errorLog)).toEqual([404]);
		} finally {
			refusing.restore();
		}
	});
});
