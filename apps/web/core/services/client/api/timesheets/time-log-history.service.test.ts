import { timeLogHistoryService } from './time-log-history.service';

const PAGE_SIZE = 500;

function rowsOf(count: number, page: number) {
	return Array.from({ length: count }, (_, index) => ({ id: `row-${page}-${index}` }));
}

describe('TimeLogHistoryService period reads', () => {
	afterEach(() => jest.restoreAllMocks());

	it('reads every page the API announces, past ten pages, and stops at the last one', async () => {
		const total = PAGE_SIZE * 11 + 20;
		const get = jest.spyOn(timeLogHistoryService, 'get');
		get.mockImplementation(async (url: string) => {
			const page = Number(new URL(url, 'https://client.test').searchParams.get('skip'));
			const lastPage = Math.ceil(total / PAGE_SIZE);
			const isLast = page === lastPage;
			let count = PAGE_SIZE;
			if (isLast) {
				count = total - PAGE_SIZE * (lastPage - 1);
			}
			return { data: { items: rowsOf(count, page), total } } as never;
		});

		const read = await timeLogHistoryService.getPeriodHistory({ from: new Date(), to: new Date() });

		expect(read.kind).toBe('ready');
		expect(read.kind === 'ready' && read.value).toHaveLength(total);
		expect(get).toHaveBeenCalledTimes(12);
	});

	it('answers that the API has no history when it reads the path as an entry id', async () => {
		jest.spyOn(timeLogHistoryService, 'get').mockRejectedValue({ response: { status: 406 } });

		const read = await timeLogHistoryService.getPeriodHistory({ from: new Date(), to: new Date() });

		expect(read).toEqual({ kind: 'unsupported' });
	});
});
