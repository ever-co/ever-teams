import { createLatestWriteQueue } from './latest-write-queue';

type Sent = { key: string; value: string; resolve: () => void; reject: (error: unknown) => void };

/** Every write sent, in the order sent; each one ends when the test says so. */
function recorder() {
	const sent: Sent[] = [];
	const write = (key: string, value: string) => () =>
		new Promise<void>((resolve, reject) => {
			sent.push({ key, value, resolve, reject });
		});
	return { sent, write };
}

/** Lets the queue go on once a write ended. */
async function settle() {
	await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('createLatestWriteQueue', () => {
	beforeEach(() => {
		jest.spyOn(console, 'error').mockImplementation(() => undefined);
	});
	afterEach(() => jest.restoreAllMocks());

	it('sends a write at once when none of its key is on its way', () => {
		const queue = createLatestWriteQueue();
		const { sent, write } = recorder();

		queue.enqueue('todo:order', write('todo:order', 'A'));

		expect(sent.map((entry) => entry.value)).toEqual(['A']);
	});

	it('sends only the latest write asked for while one is on its way, once that one ended', async () => {
		const queue = createLatestWriteQueue();
		const { sent, write } = recorder();

		queue.enqueue('todo:order', write('todo:order', 'A'));
		queue.enqueue('todo:order', write('todo:order', 'B'));
		queue.enqueue('todo:order', write('todo:order', 'C'));
		expect(sent.map((entry) => entry.value)).toEqual(['A']);

		sent[0].resolve();
		await settle();
		expect(sent.map((entry) => entry.value)).toEqual(['A', 'C']);

		sent[1].resolve();
		await settle();
		expect(sent.map((entry) => entry.value)).toEqual(['A', 'C']);
	});

	it('sends the write waiting when the one on its way fails', async () => {
		const queue = createLatestWriteQueue();
		const { sent, write } = recorder();

		queue.enqueue('todo:isCollapsed', write('todo:isCollapsed', 'collapsed'));
		queue.enqueue('todo:isCollapsed', write('todo:isCollapsed', 'expanded'));
		sent[0].reject(new Error('network'));
		await settle();

		expect(sent.map((entry) => entry.value)).toEqual(['collapsed', 'expanded']);
	});

	it('sends the writes of different keys side by side', () => {
		const queue = createLatestWriteQueue();
		const { sent, write } = recorder();

		queue.enqueue('todo:order', write('todo:order', '1'));
		queue.enqueue('done:order', write('done:order', '0'));
		queue.enqueue('todo:isCollapsed', write('todo:isCollapsed', 'collapsed'));

		expect(sent.map((entry) => entry.key)).toEqual(['todo:order', 'done:order', 'todo:isCollapsed']);
	});

	it('sends a write at once again after the writes of its key all ended', async () => {
		const queue = createLatestWriteQueue();
		const { sent, write } = recorder();

		queue.enqueue('todo:order', write('todo:order', 'A'));
		sent[0].resolve();
		await settle();
		queue.enqueue('todo:order', write('todo:order', 'B'));

		expect(sent.map((entry) => entry.value)).toEqual(['A', 'B']);
	});
});
