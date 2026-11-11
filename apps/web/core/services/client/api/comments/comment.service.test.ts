import { commentService } from './comment.service';

describe('commentService edits', () => {
	afterEach(() => jest.restoreAllMocks());

	it('edits, resolves and reopens a comment by its id', async () => {
		const put = jest.spyOn(commentService, 'put').mockResolvedValue({ data: { id: 'c/1' } } as never);

		await commentService.update('c/1', { resolved: true, resolvedAt: '2026-11-11T10:00:00.000Z' });
		await commentService.update('c/1', { resolved: false, resolvedAt: null });

		expect(put).toHaveBeenNthCalledWith(1, '/comment/c%2F1', { resolved: true, resolvedAt: '2026-11-11T10:00:00.000Z' });
		expect(put).toHaveBeenNthCalledWith(2, '/comment/c%2F1', { resolved: false, resolvedAt: null });
	});

	it('removes a comment by its id', async () => {
		const remove = jest.spyOn(commentService, 'delete').mockResolvedValue({ data: {} } as never);

		await commentService.remove('c1');

		expect(remove).toHaveBeenCalledWith('/comment/c1');
	});
});
