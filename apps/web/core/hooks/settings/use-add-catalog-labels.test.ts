const mockCreateBulk = jest.fn();
const mockCreateOne = jest.fn();

jest.mock('@/core/services/client/api/tasks/task-label.service', () => ({
	taskLabelService: {
		createTaskLabelsBulk: (...args: unknown[]) => mockCreateBulk(...args),
		createTaskLabels: (...args: unknown[]) => mockCreateOne(...args)
	}
}));
// The hook module also exports the React hook, whose own imports read the app's stores
jest.mock('@/core/hooks/tasks/use-invalidate-task-labels', () => ({ useInvalidateTaskLabels: jest.fn() }));

import { addLabelsInBulk } from './use-add-catalog-labels';

const ITEMS = [
	{ name: 'Bug', color: '#D73A4A', organizationTeamId: 'team-1' },
	{ name: 'Feature', color: '#8957E5', organizationTeamId: 'team-1' },
	{ name: 'Design', color: '#EC4899', organizationTeamId: 'team-1' }
];

const httpError = (status: number) => Object.assign(new Error(`HTTP ${status}`), { response: { status } });

describe('addLabelsInBulk', () => {
	beforeEach(() => {
		mockCreateBulk.mockReset();
		mockCreateOne.mockReset().mockResolvedValue({});
	});

	it('files the labels in one request and counts what Gauzy filed and refused', async () => {
		mockCreateBulk.mockResolvedValue({
			data: { succeededCount: 2, failedCount: 1, total: 3, succeeded: [], failed: [] }
		});

		await expect(addLabelsInBulk(ITEMS)).resolves.toEqual({ added: 2, failed: 1 });
		expect(mockCreateBulk).toHaveBeenCalledWith(ITEMS);
		expect(mockCreateOne).not.toHaveBeenCalled();
	});

	it('files them one by one on an API without the bulk route, counting each refusal', async () => {
		mockCreateBulk.mockRejectedValue(httpError(404));
		mockCreateOne.mockResolvedValueOnce({}).mockRejectedValueOnce(httpError(409)).mockResolvedValueOnce({});

		await expect(addLabelsInBulk(ITEMS)).resolves.toEqual({ added: 2, failed: 1 });
		expect(mockCreateOne.mock.calls.map(([item]) => item.name)).toEqual(['Bug', 'Feature', 'Design']);
	});

	it('sends at most four single requests at once, and still counts each outcome', async () => {
		mockCreateBulk.mockRejectedValue(httpError(405));
		let inFlight = 0;
		let mostInFlight = 0;
		mockCreateOne.mockImplementation(async (item: { name: string }) => {
			inFlight += 1;
			mostInFlight = Math.max(mostInFlight, inFlight);
			await new Promise((resolve) => setTimeout(resolve, 5));
			inFlight -= 1;
			if (item.name.endsWith('3')) {
				throw httpError(409);
			}
			return {};
		});
		const many = Array.from({ length: 10 }, (_, index) => ({ name: `Label ${index}`, color: '#6366F1' }));

		await expect(addLabelsInBulk(many)).resolves.toEqual({ added: 9, failed: 1 });
		expect(mockCreateOne).toHaveBeenCalledTimes(10);
		expect(mostInFlight).toBe(4);
	});

	it('passes any other refusal of the batch on, without filing anything one by one', async () => {
		mockCreateBulk.mockRejectedValue(httpError(403));

		await expect(addLabelsInBulk(ITEMS)).rejects.toThrow('HTTP 403');
		expect(mockCreateOne).not.toHaveBeenCalled();
	});
});
